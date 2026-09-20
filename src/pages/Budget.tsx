import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { ArrowDownRight, ArrowUpRight, Receipt, PieChart as PieChartIcon, TrendingUp, Wallet, Trash2, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis } from 'recharts';
import { dbHelpers } from '../lib/db';

type Transaction = { id: string; title: string; amount: number; type: 'income' | 'expense'; category: string; date: string; };
type FilterTab = 'overview' | 'income' | 'expenses' | 'categories' | 'savings' | 'reports';

const tabs = [
  { id: 'overview',   label: 'Overview' },
  { id: 'income',     label: 'Income' },
  { id: 'expenses',   label: 'Expenses' },
  { id: 'categories', label: 'Categories' },
  { id: 'savings',    label: 'Savings' },
  { id: 'reports',    label: 'Reports' },
];

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Housing', 'Entertainment', 'Shopping', 'Health', 'Education', 'Other'];
const INCOME_CATEGORIES  = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#64748b'];
const WEEKDAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function AddTransactionModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: any) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onAdd({ title, amount: parseFloat(amount), type, category, date: new Date(date).toISOString() });
      onClose();
    } catch { alert('Failed to add transaction'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end backdrop-blur-md" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--color-surface)] rounded-t-3xl w-full max-w-md mx-auto p-6 animate-slide-up shadow-2xl">
        <h2 className="text-xl font-black mb-5">Add Transaction</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} type="button" onClick={() => { setType(t); setCategory('Other'); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${type === t ? (t === 'expense' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30') : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Description" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          <input value={amount} onChange={e => setAmount(e.target.value)} required type="number" step="0.01" min="0.01" placeholder="0.00" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors">
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--color-surface-2)] text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-60">
              {isLoading ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Budget() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('overview');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    try {
      const unsub = dbHelpers.subscribeToTransactions((fetched) => { setTransactions(fetched as Transaction[]); setIsLoading(false); });
      return () => unsub();
    } catch { setIsLoading(false); }
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, c) => a + c.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, c) => a + c.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  const filteredTxs = activeTab === 'income' ? transactions.filter(t => t.type === 'income')
    : activeTab === 'expenses' ? transactions.filter(t => t.type === 'expense')
    : transactions;

  // Category breakdown for pie chart
  const categoryData = (() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const map: Record<string, number> = {};
    for (const tx of expenses) {
      map[tx.category] = (map[tx.category] || 0) + tx.amount;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  })();

  // Daily data for reports
  const dailyData = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { name: WEEKDAYS[d.getDay()], date: d.toISOString().split('T')[0], income: 0, expense: 0 };
    });
    for (const tx of transactions) {
      const txDate = tx.date?.split('T')[0];
      const day = days.find(d => d.date === txDate);
      if (day) {
        if (tx.type === 'income') day.income += tx.amount;
        else day.expense += tx.amount;
      }
    }
    return days;
  })();

  const isShowingList = ['overview', 'income', 'expenses'].includes(activeTab);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black">Budget</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Manage your money</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 press-effect"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as FilterTab)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === tab.id ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview card */}
      {activeTab === 'overview' && (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-500/20 shadow-xl">
          <div className="mb-5">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Total Balance</span>
            <div className={`text-4xl font-black mt-1 ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>${balance.toFixed(2)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <ArrowDownRight size={16} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] text-indigo-300 uppercase tracking-wider">Income</div>
                <div className="font-bold text-emerald-400">${totalIncome.toFixed(0)}</div>
              </div>
            </div>
            <div className="bg-black/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                <ArrowUpRight size={16} className="text-rose-400" />
              </div>
              <div>
                <div className="text-[10px] text-indigo-300 uppercase tracking-wider">Expense</div>
                <div className="font-bold text-rose-400">${totalExpense.toFixed(0)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORIES TAB ── */}
      {activeTab === 'categories' && (
        <div className="flex flex-col gap-4">
          {categoryData.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
              <PieChartIcon size={36} className="mb-3 opacity-30" />
              <p className="text-sm">Add expenses to see category breakdown.</p>
            </div>
          ) : (
            <>
              <Card>
                <h2 className="text-sm font-bold mb-3">Spending by Category</h2>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
                        {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', fontSize: '12px' }} formatter={(v: any) => [`$${v}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <div className="flex flex-col gap-2">
                {categoryData.map((c, i) => (
                  <Card key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm font-medium">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-400">${c.value.toFixed(2)}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{totalExpense > 0 ? Math.round((c.value / totalExpense) * 100) : 0}%</p>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SAVINGS TAB ── */}
      {activeTab === 'savings' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/20">
            <p className="text-[10px] text-emerald-300 uppercase tracking-widest mb-1">Savings Rate</p>
            <p className="text-4xl font-black text-emerald-400">{savingsRate}%</p>
            <p className="text-xs text-emerald-300/50 mt-2">
              {savingsRate >= 20 ? '🎉 Excellent! You\'re saving well above average.' : savingsRate >= 10 ? '👍 Good progress! Aim for 20%.' : '💡 Try to save at least 10% of income.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
              <p className="text-[10px] text-emerald-300 uppercase tracking-wider mb-1">Saved</p>
              <p className="text-xl font-black text-emerald-400">${Math.max(0, balance).toFixed(0)}</p>
            </Card>
            <Card className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border-rose-500/20">
              <p className="text-[10px] text-rose-300 uppercase tracking-wider mb-1">Spent</p>
              <p className="text-xl font-black text-rose-400">${totalExpense.toFixed(0)}</p>
            </Card>
          </div>
          {totalIncome === 0 && (
            <div className="flex flex-col items-center py-8 text-[var(--color-text-muted)]">
              <Wallet size={36} className="mb-3 opacity-30" />
              <p className="text-sm">Add income transactions to track savings.</p>
            </div>
          )}
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {activeTab === 'reports' && (
        <div className="flex flex-col gap-4">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 pb-2">
              <h2 className="text-sm font-bold">Income vs Expenses (7 days)</h2>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#incGrad)" />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#expGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top Expenses */}
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Top Expenses</h2>
            <div className="flex flex-col gap-2">
              {transactions
                .filter(t => t.type === 'expense')
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map(tx => (
                  <Card key={tx.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{tx.title}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{tx.category}</p>
                    </div>
                    <p className="text-sm font-bold text-rose-400">-${tx.amount.toFixed(2)}</p>
                  </Card>
                ))}
              {transactions.filter(t => t.type === 'expense').length === 0 && (
                <div className="flex flex-col items-center py-8 text-[var(--color-text-muted)]">
                  <TrendingUp size={36} className="mb-3 opacity-30" />
                  <p className="text-sm">No expenses recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSACTION LIST (overview/income/expenses) ── */}
      {isShowingList && (
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            {activeTab === 'income' ? 'Income' : activeTab === 'expenses' ? 'Expenses' : 'Recent Transactions'}
          </h2>
          <div className="flex flex-col gap-2.5">
            {isLoading ? [1,2,3].map(i => <div key={i} className="h-16 rounded-2xl skeleton" />) :
            filteredTxs.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
                <Receipt size={32} className="mb-3 opacity-30" /><p className="text-sm">No transactions yet.</p>
              </div>
            ) : filteredTxs.map(tx => (
              <Card key={tx.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {tx.type === 'income' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{tx.title}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{tx.category} · {new Date(tx.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </div>
                  <button onClick={() => dbHelpers.deleteTransaction(tx.id)} className="w-7 h-7 rounded-full text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showAddModal && <AddTransactionModal onClose={() => setShowAddModal(false)} onAdd={async (d) => { await dbHelpers.addTransaction(d); }} />}
    </div>
  );
}
