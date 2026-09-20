/**
 * AI Suggestions Engine — rule-based intelligence that analyses user data
 * and generates personalized, actionable suggestions.
 */

export type SuggestionPriority = 'high' | 'medium' | 'low';

export interface Suggestion {
  id: string;
  type: 'reminder' | 'task' | 'workout' | 'budget' | 'learning' | 'goal' | 'streak' | 'general';
  title: string;
  body: string;
  icon: string;        // emoji
  priority: SuggestionPriority;
  actionLabel?: string;
  actionPath?: string;
  createdAt: string;
}

interface EngineInput {
  tasks: any[];
  goals: any[];
  transactions: any[];
  workouts: any[];
  courses: any[];
  reminders: any[];
  streak: number;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysFromNow(isoDate: string): number {
  const d = new Date(isoDate);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function generateSuggestions(input: EngineInput): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const { tasks, goals, transactions, workouts, courses, reminders, streak } = input;

  // ── TASKS ────────────────────────────────────────────────────────────────

  const overdueTasks = tasks.filter(
    t => !t.completed && t.dueDate && t.dueDate < today()
  );
  if (overdueTasks.length > 0) {
    suggestions.push({
      id: 'overdue-tasks',
      type: 'task',
      title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
      body: `"${overdueTasks[0].title}"${overdueTasks.length > 1 ? ` and ${overdueTasks.length - 1} more` : ''} need your attention.`,
      icon: '⚠️',
      priority: 'high',
      actionLabel: 'View Tasks',
      actionPath: '/tasks',
      createdAt: new Date().toISOString(),
    });
  }

  const dueTodayTasks = tasks.filter(
    t => !t.completed && t.dueDate && t.dueDate === today()
  );
  if (dueTodayTasks.length > 0) {
    suggestions.push({
      id: 'due-today',
      type: 'task',
      title: `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? 's' : ''} due today`,
      body: `Focus on "${dueTodayTasks[0].title}" to keep your momentum.`,
      icon: '📋',
      priority: 'high',
      actionLabel: 'Start Focus',
      actionPath: `/focus/${dueTodayTasks[0].id}`,
      createdAt: new Date().toISOString(),
    });
  }

  const priorityTasks = tasks.filter(t => !t.completed && t.priority);
  if (priorityTasks.length > 0 && overdueTasks.length === 0) {
    suggestions.push({
      id: 'priority-tasks',
      type: 'task',
      title: `${priorityTasks.length} priority task${priorityTasks.length > 1 ? 's' : ''}`,
      body: `"${priorityTasks[0].title}" is marked priority and waiting.`,
      icon: '🎯',
      priority: 'medium',
      actionLabel: 'View',
      actionPath: '/tasks',
      createdAt: new Date().toISOString(),
    });
  }

  // ── STREAK ───────────────────────────────────────────────────────────────

  if (streak >= 7) {
    suggestions.push({
      id: 'streak-high',
      type: 'streak',
      title: `${streak}-day streak! 🔥`,
      body: 'Amazing consistency! Keep completing tasks daily to maintain it.',
      icon: '🔥',
      priority: 'low',
      createdAt: new Date().toISOString(),
    });
  } else if (streak === 0 && tasks.filter(t => t.completed).length > 0) {
    suggestions.push({
      id: 'streak-broken',
      type: 'streak',
      title: 'Restart your streak today',
      body: 'You had a great run. Complete at least one task today to get back on track.',
      icon: '💪',
      priority: 'medium',
      actionLabel: 'Add Task',
      actionPath: '/tasks',
      createdAt: new Date().toISOString(),
    });
  }

  // ── GOALS ────────────────────────────────────────────────────────────────

  const stalledGoals = goals.filter(g => g.progress < 20 && g.status !== 'completed');
  if (stalledGoals.length > 0) {
    suggestions.push({
      id: 'stalled-goals',
      type: 'goal',
      title: 'A goal needs attention',
      body: `"${stalledGoals[0].title}" is at ${stalledGoals[0].progress}%. Break it into smaller tasks.`,
      icon: '🎯',
      priority: 'medium',
      actionLabel: 'View Goals',
      actionPath: '/goals',
      createdAt: new Date().toISOString(),
    });
  }

  // ── BUDGET ───────────────────────────────────────────────────────────────

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((a: number, c: any) => a + c.amount, 0);
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((a: number, c: any) => a + c.amount, 0);

  if (totalIncome > 0 && totalExpense / totalIncome > 0.85) {
    suggestions.push({
      id: 'budget-warning',
      type: 'budget',
      title: 'High spending rate',
      body: `You've spent ${Math.round((totalExpense / totalIncome) * 100)}% of your income. Consider cutting non-essentials.`,
      icon: '💸',
      priority: 'high',
      actionLabel: 'View Budget',
      actionPath: '/budget',
      createdAt: new Date().toISOString(),
    });
  } else if (totalIncome > 0 && totalExpense / totalIncome < 0.5) {
    suggestions.push({
      id: 'budget-great',
      type: 'budget',
      title: 'Great savings rate!',
      body: `You're only spending ${Math.round((totalExpense / totalIncome) * 100)}% of income. Your savings are building up.`,
      icon: '💰',
      priority: 'low',
      createdAt: new Date().toISOString(),
    });
  }

  // ── WORKOUTS ─────────────────────────────────────────────────────────────

  const lastWorkout = workouts[0];
  if (lastWorkout) {
    const daysSince = daysFromNow(lastWorkout.createdAt);
    if (daysSince <= -3) {
      suggestions.push({
        id: 'workout-due',
        type: 'workout',
        title: "Time to work out!",
        body: `It's been ${Math.abs(daysSince)} days since your last session. Your body is ready.`,
        icon: '💪',
        priority: 'medium',
        actionLabel: 'Log Workout',
        actionPath: '/workouts',
        createdAt: new Date().toISOString(),
      });
    }
  } else {
    suggestions.push({
      id: 'workout-start',
      type: 'workout',
      title: 'Start your fitness journey',
      body: 'Log your first workout to begin tracking your progress.',
      icon: '🏋️',
      priority: 'low',
      actionLabel: 'Go to Workouts',
      actionPath: '/workouts',
      createdAt: new Date().toISOString(),
    });
  }

  // ── LEARNING ─────────────────────────────────────────────────────────────

  const inProgressCourses = courses.filter((c: any) => !c.completed && c.progress < 100);
  if (inProgressCourses.length > 0) {
    const slowCourse = inProgressCourses.find((c: any) => c.progress < 30);
    if (slowCourse) {
      suggestions.push({
        id: 'learning-slow',
        type: 'learning',
        title: 'Continue learning',
        body: `"${slowCourse.title}" is at ${slowCourse.progress}%. Even 20 minutes makes a difference.`,
        icon: '📚',
        priority: 'low',
        actionLabel: 'View Learning',
        actionPath: '/learning',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // ── REMINDERS ────────────────────────────────────────────────────────────

  const upcomingReminders = reminders.filter(
    (r: any) => !r.dismissed && daysFromNow(r.dueDate) >= 0 && daysFromNow(r.dueDate) <= 1
  );
  if (upcomingReminders.length > 0) {
    suggestions.push({
      id: 'reminder-due',
      type: 'reminder',
      title: `Reminder: ${upcomingReminders[0].title}`,
      body: upcomingReminders[0].description ?? 'This is due very soon.',
      icon: '🔔',
      priority: 'high',
      actionLabel: 'View Reminders',
      actionPath: '/reminders',
      createdAt: new Date().toISOString(),
    });
  }

  // Sort: high → medium → low
  const order: Record<SuggestionPriority, number> = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => order[a.priority] - order[b.priority]);
}

/** Compute a productivity score 0-100 based on task completion + streak + budget health. */
export function computeProductivityScore(input: EngineInput): number {
  const { tasks, workouts, streak, transactions } = input;

  let score = 50; // baseline

  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  if (total > 0) score += Math.round((completed / total) * 20);

  score += Math.min(streak * 2, 15);

  if (workouts.length > 0) score += Math.min(workouts.length * 2, 10);

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((a: number, c: any) => a + c.amount, 0);
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((a: number, c: any) => a + c.amount, 0);
  if (totalIncome > 0 && totalExpense / totalIncome < 0.7) score += 5;

  return Math.min(100, Math.max(0, score));
}
