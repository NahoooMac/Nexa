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

// ─── MILESTONE ITEM ────────────────────────────────────────────────────────────
export interface MilestoneItem {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  budget?: number;
  completed: boolean;
  completedAt?: string;
}

// ─── GOAL ─────────────────────────────────────────────────────────────────────
export type GoalCategory =
  | 'savings'
  | 'purchase'
  | 'travel'
  | 'education'
  | 'fitness'
  | 'personal'
  | 'other';

export interface GoalData {
  title: string;
  description?: string;
  category: GoalCategory;
  color: string;
  priority: 'low' | 'medium' | 'high';
  targetDate?: string;
  // Financial
  targetBudget?: number;
  currentSavings?: number;
  // Travel / Location
  destination?: string;
  mapUrl?: string;
  // Visual
  imageUrl?: string;
  // Milestones (custom)
  milestoneItems: MilestoneItem[];
}

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
    // Use the user-supplied date (already an ISO string from the form), or fall back to now
    const finalDate = data.date ?? new Date().toISOString();
    return await addDoc(collection(db, 'transactions'), {
      ...data,
      date: finalDate,
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

  async addGoal(data: GoalData) {
    const progress = data.targetBudget && data.targetBudget > 0 && data.currentSavings !== undefined
      ? Math.min(100, Math.round((data.currentSavings / data.targetBudget) * 100))
      : 0;

    return await addDoc(collection(db, 'goals'), {
      title: data.title,
      description: data.description ?? '',
      category: data.category,
      color: data.color,
      priority: data.priority,
      targetDate: data.targetDate ?? null,
      targetBudget: data.targetBudget ?? null,
      currentSavings: data.currentSavings ?? 0,
      destination: data.destination ?? null,
      mapUrl: data.mapUrl ?? null,
      imageUrl: data.imageUrl ?? null,
      milestoneItems: data.milestoneItems,
      milestones: data.milestoneItems.length,
      completedMilestones: 0,
      progress,
      status: progress >= 100 ? 'completed' : 'in_progress',
      userId: getUserId(),
      createdAt: new Date().toISOString(),
    });
  },

  async updateGoal(goalId: string, data: Partial<GoalData>) {
    const goalRef = doc(db, 'goals', goalId);
    const update: any = { ...data };

    // Recalculate progress if financial fields are changing
    if (data.currentSavings !== undefined || data.targetBudget !== undefined) {
      // We need to fetch current values to fill in missing fields
      const snapshot = await getDocs(query(collection(db, 'goals'), where('__name__', '==', goalId)));
      const current = snapshot.docs[0]?.data() ?? {};
      const tb = data.targetBudget ?? current.targetBudget ?? 0;
      const cs = data.currentSavings ?? current.currentSavings ?? 0;
      if (tb > 0) {
        update.progress = Math.min(100, Math.round((cs / tb) * 100));
        update.status = update.progress >= 100 ? 'completed' : 'in_progress';
      }
    }

    return await updateDoc(goalRef, update);
  },

  async updateGoalProgress(goalId: string, completedMilestones: number, total: number, milestoneItems?: MilestoneItem[]) {
    const goalRef = doc(db, 'goals', goalId);
    const milestoneProgress = total > 0 ? Math.round((completedMilestones / total) * 100) : 0;
    const update: any = { completedMilestones, milestones: total };
    if (milestoneItems) update.milestoneItems = milestoneItems;

    // Only drive progress from milestones if there's no financial target
    // The caller can also pass in explicit progress
    update.progress = milestoneProgress;
    if (milestoneProgress >= 100) update.status = 'completed';
    return await updateDoc(goalRef, update);
  },

  async updateGoalSavings(goalId: string, currentSavings: number, targetBudget: number) {
    const goalRef = doc(db, 'goals', goalId);
    const progress = targetBudget > 0 ? Math.min(100, Math.round((currentSavings / targetBudget) * 100)) : 0;
    return await updateDoc(goalRef, {
      currentSavings,
      progress,
      status: progress >= 100 ? 'completed' : 'in_progress',
    });
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
    dueDate: string;       // ISO string or YYYY-MM-DD
    dueTime?: string;      // "HH:mm"
    repeat?: 'none' | 'daily' | 'weekly';
    calendarEventId?: string;
    relatedTaskId?: string;
  }) {
    return await addDoc(collection(db, 'reminders'), {
      ...data,
      repeat: data.repeat ?? 'none',
      dismissed: false,
      lastCompletedDate: null,   // tracks last completion for recurring logic
      userId: getUserId(),
      createdAt: new Date().toISOString(),
    });
  },

  /**
   * Complete / dismiss a reminder.
   *  - "none" (once):   mark dismissed=true permanently
   *  - "daily":         record today as lastCompletedDate, advance dueDate by 1 day
   *  - "weekly":        record today as lastCompletedDate, advance dueDate by 7 days
   */
  async dismissReminder(reminderId: string, repeat?: 'none' | 'daily' | 'weekly') {
    const ref = doc(db, 'reminders', reminderId);
    const today = new Date().toISOString().split('T')[0];

    if (!repeat || repeat === 'none') {
      return await updateDoc(ref, { dismissed: true, lastCompletedDate: today });
    }

    // Advance the due date
    const daysToAdd = repeat === 'daily' ? 1 : 7;
    // Build next occurrence based on today
    const next = new Date();
    next.setDate(next.getDate() + daysToAdd);
    const nextDate = next.toISOString().split('T')[0];

    return await updateDoc(ref, {
      dismissed: false,         // keep active for future occurrences
      lastCompletedDate: today,
      dueDate: nextDate,        // advance schedule
    });
  },

  async deleteReminder(reminderId: string) {
    return await deleteDoc(doc(db, 'reminders', reminderId));
  },

  async updateReminder(reminderId: string, data: Partial<{ title: string; description: string; dueDate: string; dueTime: string; repeat: string; calendarEventId: string }>) {
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
      reminders.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      callback(reminders);
    }, error => console.error('Reminders listener error:', error));
  },

  // All reminders including dismissed (for the reminders page history tab)
  subscribeToAllReminders(callback: (reminders: any[]) => void) {
    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', getUserId())
    );
    return onSnapshot(q, snapshot => {
      const reminders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      reminders.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      callback(reminders);
    }, error => console.error('All Reminders listener error:', error));
  },
};
