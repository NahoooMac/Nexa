/**
 * Nexa Intelligence Engine
 * Local calculations are free and run in the browser. Only summarized data
 * is sent to the AI API when the user explicitly asks for AI analysis.
 */

export type SuggestionPriority = 'high' | 'medium' | 'low';

export interface Suggestion {
  id: string;
  type: 'reminder' | 'task' | 'workout' | 'budget' | 'learning' | 'goal' | 'streak' | 'general';
  title: string;
  body: string;
  icon: string;
  priority: SuggestionPriority;
  actionLabel?: string;
  actionPath?: string;
  createdAt: string;
}

export interface EngineInput {
  tasks: any[];
  goals: any[];
  transactions: any[];
  workouts: any[];
  courses: any[];
  reminders: any[];
  streak: number;
}

export interface FinancialAnalytics {
  currency: string;
  period: { start: string; end: string };
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number;
  expenseByCategory: Array<{ category: string; amount: number; percentage: number }>;
  incomeByCategory: Array<{ category: string; amount: number; percentage: number }>;
  monthly: Array<{ month: string; income: number; expenses: number; savings: number }>;
  currentMonth: { income: number; expenses: number; savings: number; savingsRate: number };
  previousMonth: { income: number; expenses: number; savings: number; savingsRate: number };
  categoryChanges: Array<{ category: string; current: number; previous: number; changePercent: number }>;
  recurringExpenses: Array<{ title: string; category: string; averageAmount: number; occurrences: number }>;
  unusualExpenses: Array<{ title: string; category: string; amount: number; date: string; reason: string }>;
  largestExpenses: Array<{ title: string; category: string; amount: number; date: string }>;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysFromNow(isoDate: string): number {
  const d = new Date(isoDate);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function monthKey(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function groupByCategory(transactions: any[], type: 'income' | 'expense') {
  const relevant = transactions.filter(t => t.type === type);
  const total = relevant.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const map: Record<string, number> = {};
  for (const tx of relevant) {
    const category = String(tx.category || 'Other');
    map[category] = (map[category] || 0) + Number(tx.amount || 0);
  }
  return Object.entries(map)
    .map(([category, amount]) => ({
      category,
      amount: round(amount),
      percentage: total > 0 ? round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function analyzeFinances(transactions: any[], currency = 'ETB'): FinancialAnalytics {
  const valid = transactions.filter(t => t && (t.type === 'income' || t.type === 'expense') && Number(t.amount) >= 0);
  const income = valid.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = valid.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const now = new Date();
  const currentKey = monthKey(now.toISOString());
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousKey = monthKey(previous.toISOString());

  const monthlyMap: Record<string, { income: number; expenses: number }> = {};
  for (const tx of valid) {
    const key = monthKey(tx.date || tx.createdAt || new Date().toISOString());
    if (!key) continue;
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 };
    if (tx.type === 'income') monthlyMap[key].income += Number(tx.amount);
    else monthlyMap[key].expenses += Number(tx.amount);
  }

  const monthValue = (key: string) => {
    const value = monthlyMap[key] || { income: 0, expenses: 0 };
    const savings = value.income - value.expenses;
    return {
      income: round(value.income),
      expenses: round(value.expenses),
      savings: round(savings),
      savingsRate: value.income > 0 ? round((savings / value.income) * 100) : 0,
    };
  };

  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, value]) => ({
      month,
      income: round(value.income),
      expenses: round(value.expenses),
      savings: round(value.income - value.expenses),
    }));

  const currentMonth = monthValue(currentKey);
  const previousMonth = monthValue(previousKey);

  const currentCategories = groupByCategory(valid.filter(t => monthKey(t.date || t.createdAt) === currentKey), 'expense');
  const previousCategories = groupByCategory(valid.filter(t => monthKey(t.date || t.createdAt) === previousKey), 'expense');
  const previousMap = Object.fromEntries(previousCategories.map(c => [c.category, c.amount]));

  const categoryChanges = currentCategories.map(c => ({
    category: c.category,
    current: c.amount,
    previous: round(previousMap[c.category] || 0),
    changePercent: previousMap[c.category] > 0
      ? round(((c.amount - previousMap[c.category]) / previousMap[c.category]) * 100)
      : c.amount > 0 ? 100 : 0,
  })).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  const expensesOnly = valid.filter(t => t.type === 'expense');
  const titleGroups: Record<string, any[]> = {};
  for (const tx of expensesOnly) {
    const key = `${String(tx.title || 'Untitled').trim().toLowerCase()}|${String(tx.category || 'Other')}`;
    (titleGroups[key] ||= []).push(tx);
  }

  const recurringExpenses = Object.values(titleGroups)
    .filter(items => items.length >= 2)
    .map(items => ({
      title: String(items[0].title || 'Untitled'),
      category: String(items[0].category || 'Other'),
      averageAmount: round(items.reduce((s, t) => s + Number(t.amount), 0) / items.length),
      occurrences: items.length,
    }))
    .sort((a, b) => b.occurrences - a.occurrences || b.averageAmount - a.averageAmount)
    .slice(0, 8);

  const categoryAverage = Object.fromEntries(
    groupByCategory(expensesOnly, 'expense').map(c => [c.category, c.amount / Math.max(1, expensesOnly.filter(t => String(t.category || 'Other') === c.category).length)])
  );
  const unusualExpenses = expensesOnly
    .map(tx => {
      const category = String(tx.category || 'Other');
      const amount = Number(tx.amount);
      const average = categoryAverage[category] || 0;
      const isLarge = average > 0 && amount >= average * 2.5;
      return isLarge ? {
        title: String(tx.title || 'Expense'),
        category,
        amount: round(amount),
        date: String(tx.date || tx.createdAt || ''),
        reason: `About ${round(amount / average)}x the average ${category} transaction`,
      } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 8) as FinancialAnalytics['unusualExpenses'];

  const largestExpenses = expensesOnly
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 10)
    .map(t => ({
      title: String(t.title || 'Expense'),
      category: String(t.category || 'Other'),
      amount: round(Number(t.amount)),
      date: String(t.date || t.createdAt || ''),
    }));

  const dates = valid.map(t => t.date || t.createdAt).filter(Boolean).sort();
  return {
    currency,
    period: { start: dates[0] || '', end: dates[dates.length - 1] || '' },
    income: round(income),
    expenses: round(expenses),
    netSavings: round(income - expenses),
    savingsRate: income > 0 ? round(((income - expenses) / income) * 100) : 0,
    expenseByCategory: groupByCategory(valid, 'expense'),
    incomeByCategory: groupByCategory(valid, 'income'),
    monthly,
    currentMonth,
    previousMonth,
    categoryChanges,
    recurringExpenses,
    unusualExpenses,
    largestExpenses,
  };
}

export function generateSuggestions(input: EngineInput): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const { tasks, goals, transactions, workouts, courses, reminders, streak } = input;

  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today());
  if (overdueTasks.length > 0) suggestions.push({
    id: 'overdue-tasks', type: 'task',
    title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
    body: `"${overdueTasks[0].title}"${overdueTasks.length > 1 ? ` and ${overdueTasks.length - 1} more` : ''} need your attention.`,
    icon: '⚠️', priority: 'high', actionLabel: 'View Tasks', actionPath: '/tasks', createdAt: new Date().toISOString(),
  });

  const dueTodayTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate === today());
  if (dueTodayTasks.length > 0) suggestions.push({
    id: 'due-today', type: 'task',
    title: `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? 's' : ''} due today`,
    body: `Focus on "${dueTodayTasks[0].title}" to keep your momentum.`,
    icon: '📋', priority: 'high', actionLabel: 'Start Focus', actionPath: `/focus/${dueTodayTasks[0].id}`, createdAt: new Date().toISOString(),
  });

  const priorityTasks = tasks.filter(t => !t.completed && t.priority);
  if (priorityTasks.length > 0 && overdueTasks.length === 0) suggestions.push({
    id: 'priority-tasks', type: 'task',
    title: `${priorityTasks.length} priority task${priorityTasks.length > 1 ? 's' : ''}`,
    body: `"${priorityTasks[0].title}" is marked priority and waiting.`,
    icon: '🎯', priority: 'medium', actionLabel: 'View', actionPath: '/tasks', createdAt: new Date().toISOString(),
  });

  // Overplanning / Distraction Detector
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTasks = tasks.filter(t => t.createdAt && new Date(t.createdAt) >= sevenDaysAgo);
  const recentlyCompleted = recentTasks.filter(t => t.completed).length;
  if (recentTasks.length >= 8 && recentlyCompleted < recentTasks.length * 0.4) {
    suggestions.push({
      id: 'overplanning-warning', type: 'general',
      title: 'Planning > Executing',
      body: `You planned ${recentTasks.length} tasks this week but only completed ${recentlyCompleted}. Try breaking them down or reducing your daily target.`,
      icon: '⚠️', priority: 'high', actionLabel: 'Review Tasks', actionPath: '/tasks', createdAt: new Date().toISOString(),
    });
  }

  if (streak >= 7) suggestions.push({
    id: 'streak-high', type: 'streak', title: `${streak}-day streak! 🔥`,
    body: 'Amazing consistency! Keep completing tasks daily to maintain it.',
    icon: '🔥', priority: 'low', createdAt: new Date().toISOString(),
  });
  else if (streak === 0 && tasks.some(t => t.completed)) suggestions.push({
    id: 'streak-broken', type: 'streak', title: 'Restart your streak today',
    body: 'You had a great run. Complete at least one task today to get back on track.',
    icon: '💪', priority: 'medium', actionLabel: 'Add Task', actionPath: '/tasks', createdAt: new Date().toISOString(),
  });

  const stalledGoals = goals.filter(g => g.progress < 20 && g.status !== 'completed');
  if (stalledGoals.length > 0) suggestions.push({
    id: 'stalled-goals', type: 'goal', title: 'A goal needs attention',
    body: `"${stalledGoals[0].title}" is at ${stalledGoals[0].progress}%. Break it into smaller tasks.`,
    icon: '🎯', priority: 'medium', actionLabel: 'View Goals', actionPath: '/goals', createdAt: new Date().toISOString(),
  });

  const finance = analyzeFinances(transactions);
  if (finance.income > 0 && finance.savingsRate < 15) suggestions.push({
    id: 'budget-warning', type: 'budget', title: 'Savings rate is getting tight',
    body: `You're currently saving ${Math.round(finance.savingsRate)}% of tracked income. Check your largest spending categories.`,
    icon: '💸', priority: 'high', actionLabel: 'View Budget', actionPath: '/budget', createdAt: new Date().toISOString(),
  });
  else if (finance.income > 0 && finance.savingsRate >= 30) suggestions.push({
    id: 'budget-great', type: 'budget', title: 'Strong savings progress',
    body: `Your tracked savings rate is ${Math.round(finance.savingsRate)}%. Keep that progress connected to your savings goals.`,
    icon: '💰', priority: 'low', createdAt: new Date().toISOString(),
  });

  const lastWorkout = workouts[0];
  if (lastWorkout) {
    const daysSince = daysFromNow(lastWorkout.createdAt);
    if (daysSince <= -3) suggestions.push({
      id: 'workout-due', type: 'workout', title: 'Time to work out!',
      body: `It's been ${Math.abs(daysSince)} days since your last session.`,
      icon: '💪', priority: 'medium', actionLabel: 'Log Workout', actionPath: '/workouts', createdAt: new Date().toISOString(),
    });
  } else suggestions.push({
    id: 'workout-start', type: 'workout', title: 'Start your fitness journey',
    body: 'Log your first workout to begin tracking your progress.',
    icon: '🏋️', priority: 'low', actionLabel: 'Go to Workouts', actionPath: '/workouts', createdAt: new Date().toISOString(),
  });

  const inProgressCourses = courses.filter(c => !c.completed && c.progress < 100);
  const slowCourse = inProgressCourses.find(c => c.progress < 30);
  if (slowCourse) suggestions.push({
    id: 'learning-slow', type: 'learning', title: 'Continue learning',
    body: `"${slowCourse.title}" is at ${slowCourse.progress}%. Even 20 minutes makes a difference.`,
    icon: '📚', priority: 'low', actionLabel: 'View Learning', actionPath: '/learning', createdAt: new Date().toISOString(),
  });

  const upcomingReminders = reminders.filter(r => !r.dismissed && daysFromNow(r.dueDate) >= 0 && daysFromNow(r.dueDate) <= 1);
  if (upcomingReminders.length > 0) suggestions.push({
    id: 'reminder-due', type: 'reminder', title: `Reminder: ${upcomingReminders[0].title}`,
    body: upcomingReminders[0].description ?? 'This is due very soon.',
    icon: '🔔', priority: 'high', actionLabel: 'View Reminders', actionPath: '/reminders', createdAt: new Date().toISOString(),
  });

  const order: Record<SuggestionPriority, number> = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => order[a.priority] - order[b.priority]);
}

export function computeProductivityScore(input: EngineInput): number {
  const { tasks, workouts, streak, transactions } = input;
  let score = 50;
  const completed = tasks.filter(t => t.completed).length;
  if (tasks.length > 0) score += Math.round((completed / tasks.length) * 20);
  score += Math.min(streak * 2, 15);
  if (workouts.length > 0) score += Math.min(workouts.length * 2, 10);
  const finance = analyzeFinances(transactions);
  if (finance.income > 0 && finance.savingsRate >= 20) score += 5;
  return Math.min(100, Math.max(0, score));
}
