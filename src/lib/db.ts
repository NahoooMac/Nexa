import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuthStore } from '../store/authStore';

// Helper to get current user ID
const getUserId = () => {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('User must be logged in to perform database operations');
  return user.id;
};

// Generic type for document with ID
export type DocWithId<T> = T & { id: string };

export const dbHelpers = {
  // ─── TASKS ─────────────────────────────────────────────────────────────────

  async addTask(data: {
    title: string;
    priority: boolean;
    date?: string;
    dueDate?: string;
    type?: 'general' | 'learning' | 'workout';
    referenceId?: string;
    calendarEventId?: string;
  }) {
    return await addDoc(collection(db, 'tasks'), {
      ...data,
      completed: false,
      userId: getUserId(),
      createdAt: new Date().toISOString(),
    });
  },

  // Fixed: was toggleTask, must be toggleTaskStatus to match callers
  async toggleTaskStatus(taskId: string, currentCompleted: boolean) {
    const taskRef = doc(db, 'tasks', taskId);
    return await updateDoc(taskRef, {
      completed: !currentCompleted,
      completedAt: !currentCompleted ? new Date().toISOString() : null,
    });
  },

  async updateTask(taskId: string, data: Partial<{ title: string; priority: boolean; dueDate: string; calendarEventId: string }>) {
    const taskRef = doc(db, 'tasks', taskId);
    return await updateDoc(taskRef, data);
  },

  async deleteTask(taskId: string) {
    return await deleteDoc(doc(db, 'tasks', taskId));
  },

  async getTasks() {
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', getUserId()),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  },

  subscribeToTasks(callback: (tasks: any[]) => void) {
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', getUserId()),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snapshot => {
      const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(tasks);
    });
  },

  // ─── STREAK ────────────────────────────────────────────────────────────────

  async calculateStreak(): Promise<number> {
    const tasks = await dbHelpers.getTasks();
    const completedDays = new Set<string>(
      tasks
        .filter((t: any) => t.completed && t.completedAt)
        .map((t: any) => t.completedAt.split('T')[0])
    );

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (completedDays.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  },

  // ─── TRANSACTIONS (Budget) ─────────────────────────────────────────────────

  async addTransaction(data: {
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date?: string;
  }) {
    return await addDoc(collection(db, 'transactions'), {
      ...data,
      date: data.date ?? new Date().toISOString(),
      userId: getUserId(),
    });
  },

  async deleteTransaction(txId: string) {
    return await deleteDoc(doc(db, 'transactions', txId));
  },

  subscribeToTransactions(callback: (transactions: any[]) => void) {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', getUserId()),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, snapshot => {
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(txs);
    });
  },

  // ─── GOALS ─────────────────────────────────────────────────────────────────

  async addGoal(data: {
    title: string;
    milestones: number;
    color: string;
    targetDate?: string;
    description?: string;
  }) {
    return await addDoc(collection(db, 'goals'), {
      ...data,
      progress: 0,
      completedMilestones: 0,
      milestoneItems: Array.from({ length: data.milestones }, (_, i) => ({
        id: `m${i}`,
        title: `Milestone ${i + 1}`,
        completed: false,
      })),
      status: 'in_progress',
      userId: getUserId(),
      createdAt: new Date().toISOString(),
    });
  },

  async updateGoalProgress(goalId: string, completedMilestones: number, total: number, milestoneItems?: any[]) {
    const goalRef = doc(db, 'goals', goalId);
    const progress = total > 0 ? Math.round((completedMilestones / total) * 100) : 0;
    const update: any = { completedMilestones, progress };
    if (milestoneItems) update.milestoneItems = milestoneItems;
    if (progress >= 100) update.status = 'completed';
    return await updateDoc(goalRef, update);
  },

  async deleteGoal(goalId: string) {
    return await deleteDoc(doc(db, 'goals', goalId));
  },

  subscribeToGoals(callback: (goals: any[]) => void) {
    const q = query(
      collection(db, 'goals'),
      where('userId', '==', getUserId()),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snapshot => {
      const goals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(goals);
    });
  },

  // ─── COURSES (Learning) ───────────────────────────────────────────────────

  async addCourse(data: {
    title: string;
    platform: string;
    duration: string;
    iconType: string;
    url?: string;
  }) {
    return await addDoc(collection(db, 'courses'), {
      ...data,
      progress: 0,
      completed: false,
      userId: getUserId(),
      createdAt: new Date().toISOString(),
    });
  },

  async updateCourseProgress(courseId: string, progress: number) {
    const courseRef = doc(db, 'courses', courseId);
    return await updateDoc(courseRef, {
      progress,
      completed: progress >= 100,
    });
  },

  async deleteCourse(courseId: string) {
    return await deleteDoc(doc(db, 'courses', courseId));
  },

  subscribeToCourses(callback: (courses: any[]) => void) {
    const q = query(
      collection(db, 'courses'),
      where('userId', '==', getUserId()),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snapshot => {
      const courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(courses);
    });
  },

  // ─── NOTES (Learning) ─────────────────────────────────────────────────────

  async addNote(data: { courseId: string; courseName: string; content: string; title: string }) {
    return await addDoc(collection(db, 'notes'), {
      ...data,
      userId: getUserId(),
      createdAt: new Date().toISOString(),
    });
  },

  async deleteNote(noteId: string) {
    return await deleteDoc(doc(db, 'notes', noteId));
  },

  subscribeToNotes(callback: (notes: any[]) => void) {
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', getUserId()),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snapshot => {
      const notes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(notes);
    });
  },

  // ─── WORKOUTS ─────────────────────────────────────────────────────────────

  async addWorkout(data: {
    title: string;
    duration: number;
    exercises: number;
    calories?: number;
    notes?: string;
    planId?: string;
  }) {
    return await addDoc(collection(db, 'workouts'), {
      ...data,
      calories: data.calories ?? data.duration * 7,
      userId: getUserId(),
      createdAt: new Date().toISOString(),
    });
  },

  async deleteWorkout(workoutId: string) {
    return await deleteDoc(doc(db, 'workouts', workoutId));
  },

  subscribeToWorkouts(callback: (workouts: any[]) => void) {
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', getUserId()),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snapshot => {
      const workouts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(workouts);
    });
  },

  // ─── REMINDERS ────────────────────────────────────────────────────────────

  async addReminder(data: {
    title: string;
    description?: string;
    dueDate: string;       // ISO string
    dueTime?: string;      // "HH:mm"
    repeat?: 'none' | 'daily' | 'weekly';
    calendarEventId?: string;
    relatedTaskId?: string;
  }) {
    return await addDoc(collection(db, 'reminders'), {
      ...data,
      dismissed: false,
      userId: getUserId(),
      createdAt: new Date().toISOString(),
    });
  },

  async dismissReminder(reminderId: string) {
    const ref = doc(db, 'reminders', reminderId);
    return await updateDoc(ref, { dismissed: true });
  },

  async deleteReminder(reminderId: string) {
    return await deleteDoc(doc(db, 'reminders', reminderId));
  },

  async updateReminder(reminderId: string, data: Partial<{ title: string; dueDate: string; dueTime: string; repeat: string; calendarEventId: string }>) {
    const ref = doc(db, 'reminders', reminderId);
    return await updateDoc(ref, data);
  },

  subscribeToReminders(callback: (reminders: any[]) => void) {
    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', getUserId()),
      where('dismissed', '==', false)
    );
    return onSnapshot(q, snapshot => {
      const reminders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Client-side sort to avoid requiring a Firestore composite index
      reminders.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      callback(reminders);
    }, error => console.error("Reminders listener error:", error));
  },

  // All reminders including dismissed (for the reminders page)
  subscribeToAllReminders(callback: (reminders: any[]) => void) {
    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', getUserId())
    );
    return onSnapshot(q, snapshot => {
      const reminders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Client-side sort to avoid requiring a Firestore composite index
      reminders.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      callback(reminders);
    }, error => console.error("All Reminders listener error:", error));
  },
};
