import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const CATEGORIES = ['fuel', 'maintenance', 'insurance', 'toll', 'food', 'other'];

const EMPTY_FORM = {
  title: '',
  amount: '',
  category: 'fuel',
  date: '',
  notes: '',
};

export function ExpenseForm({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY_FORM, ...initialData, amount: initialData.amount?.toString() || '' } : EMPTY_FORM);
      setErrors({});
    }
  }, [open, initialData]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.title) e.title = 'Required';
    if (!form.amount || isNaN(form.amount) || parseFloat(form.amount) <= 0) e.amount = 'Required positive number';
    if (!form.category) e.category = 'Required';
    if (!form.date) e.date = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, amount: parseFloat(form.amount) });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div>
            <Label htmlFor="exp-title">Title *</Label>
            <Input id="exp-title" value={form.title} onChange={(e) => set('title', e.target.value)} className="mt-1" placeholder="e.g., Fuel at Pilot TA" />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="exp-amount">Amount ($) *</Label>
              <Input id="exp-amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} className="mt-1" />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="exp-date">Date *</Label>
            <Input id="exp-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="mt-1" />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
          </div>

          <div>
            <Label htmlFor="exp-notes">Notes</Label>
            <Input id="exp-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="mt-1" placeholder="Optional" />
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{initialData ? 'Save Changes' : 'Add Expense'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
