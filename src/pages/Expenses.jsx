import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ExpenseForm } from '../components/trucking/ExpenseForm';
import { formatCurrency } from '../components/trucking/calcUtils';
import { useToast } from '../components/ui/use-toast';
import Expense from '../api/entities/Expense';

const CATEGORIES = ['all', 'fuel', 'maintenance', 'insurance', 'toll', 'food', 'other'];

const CATEGORY_COLORS = {
  fuel: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  maintenance: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  insurance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  toll: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  food: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

export default function Expenses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [period, setPeriod] = useState('all');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => Expense.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense added', variant: 'success' });
      setFormOpen(false);
    },
    onError: () => toast({ title: 'Failed to add expense', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense updated', variant: 'success' });
      setEditExpense(null);
    },
    onError: () => toast({ title: 'Failed to update expense', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense deleted', variant: 'success' });
    },
    onError: () => toast({ title: 'Failed to delete expense', variant: 'destructive' }),
  });

  // Period filter
  const filtered = expenses.filter((e) => {
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    if (!matchCat) return false;
    if (period === 'all') return true;
    const date = moment(e.date);
    const now = moment();
    if (period === 'thisWeek') return date.isSame(now, 'isoWeek');
    if (period === 'thisMonth') return date.isSame(now, 'month');
    if (period === 'thisYear') return date.isSame(now, 'year');
    return true;
  });

  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  // Category breakdown
  const byCategory = {};
  for (const e of filtered) {
    byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0);
  }

  const sorted = [...filtered].sort((a, b) => moment(b.date).diff(moment(a.date)));

  const handleSave = (data) => {
    if (editExpense) {
      updateMutation.mutate({ id: editExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{expenses.length} total expenses</p>
        </div>
        <Button onClick={() => { setEditExpense(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="col-span-2 sm:col-span-1 lg:col-span-2 bg-primary-800 border-none text-white">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-blue-200 uppercase tracking-wider">Total Expenses</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(total)}</p>
          </CardContent>
        </Card>
        {Object.entries(CATEGORY_COLORS).map(([cat, colorClass]) => (
          <Card key={cat} className="border-none">
            <CardContent className="p-4">
              <p className={`text-xs font-medium uppercase ${colorClass} rounded px-1.5 py-0.5 inline-block mb-1`}>
                {cat}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(byCategory[cat] || 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="thisWeek">This Week</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="thisYear">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="h-40 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Receipt className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">No expenses recorded</p>
          <p className="text-sm mt-1">Track your business expenses here</p>
        </div>
      )}

      {sorted.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notes</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {sorted.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{exp.title}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.other}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-600 dark:text-red-400">
                        -{formatCurrency(exp.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                        {exp.date ? moment(exp.date).format('MMM D, YYYY') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{exp.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setEditExpense(exp); setFormOpen(true); }}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(exp.id)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ExpenseForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditExpense(null); }}
        onSave={handleSave}
        initialData={editExpense}
      />
    </div>
  );
}
