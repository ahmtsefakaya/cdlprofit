import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const EMPTY_FORM = {
  load_id: '',
  broker_name: '',
  pickup_city: '',
  pickup_state: '',
  delivery_city: '',
  delivery_state: '',
  pickup_date: '',
  delivery_date: '',
  loaded_miles: '',
  deadhead_miles: '',
  gross_amount: '',
  notes: '',
  status: 'Pending',
};

export function LoadForm({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM);
      setErrors({});
    }
  }, [open, initialData]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.load_id) e.load_id = 'Required';
    if (!form.broker_name) e.broker_name = 'Required';
    if (!form.pickup_city) e.pickup_city = 'Required';
    if (!form.pickup_state) e.pickup_state = 'Required';
    if (!form.delivery_city) e.delivery_city = 'Required';
    if (!form.delivery_state) e.delivery_state = 'Required';
    if (!form.pickup_date) e.pickup_date = 'Required';
    if (!form.loaded_miles || isNaN(form.loaded_miles)) e.loaded_miles = 'Required number';
    if (!form.gross_amount || isNaN(form.gross_amount)) e.gross_amount = 'Required number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...form,
      loaded_miles: parseFloat(form.loaded_miles) || 0,
      deadhead_miles: parseFloat(form.deadhead_miles) || 0,
      gross_amount: parseFloat(form.gross_amount) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Load' : 'Add New Load'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Load ID */}
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="load_id">Load ID *</Label>
            <Input id="load_id" value={form.load_id} onChange={(e) => set('load_id', e.target.value)} className="mt-1" />
            {errors.load_id && <p className="mt-1 text-xs text-red-500">{errors.load_id}</p>}
          </div>

          {/* Broker */}
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="broker_name">Broker Name *</Label>
            <Input id="broker_name" value={form.broker_name} onChange={(e) => set('broker_name', e.target.value)} className="mt-1" />
            {errors.broker_name && <p className="mt-1 text-xs text-red-500">{errors.broker_name}</p>}
          </div>

          {/* Pickup */}
          <div>
            <Label htmlFor="pickup_city">Pickup City *</Label>
            <Input id="pickup_city" value={form.pickup_city} onChange={(e) => set('pickup_city', e.target.value)} className="mt-1" />
            {errors.pickup_city && <p className="mt-1 text-xs text-red-500">{errors.pickup_city}</p>}
          </div>
          <div>
            <Label>Pickup State *</Label>
            <Select value={form.pickup_state} onValueChange={(v) => set('pickup_state', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.pickup_state && <p className="mt-1 text-xs text-red-500">{errors.pickup_state}</p>}
          </div>

          {/* Delivery */}
          <div>
            <Label htmlFor="delivery_city">Delivery City *</Label>
            <Input id="delivery_city" value={form.delivery_city} onChange={(e) => set('delivery_city', e.target.value)} className="mt-1" />
            {errors.delivery_city && <p className="mt-1 text-xs text-red-500">{errors.delivery_city}</p>}
          </div>
          <div>
            <Label>Delivery State *</Label>
            <Select value={form.delivery_state} onValueChange={(v) => set('delivery_state', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.delivery_state && <p className="mt-1 text-xs text-red-500">{errors.delivery_state}</p>}
          </div>

          {/* Dates */}
          <div>
            <Label htmlFor="pickup_date">Pickup Date *</Label>
            <Input id="pickup_date" type="date" value={form.pickup_date} onChange={(e) => set('pickup_date', e.target.value)} className="mt-1" />
            {errors.pickup_date && <p className="mt-1 text-xs text-red-500">{errors.pickup_date}</p>}
          </div>
          <div>
            <Label htmlFor="delivery_date">Delivery Date</Label>
            <Input id="delivery_date" type="date" value={form.delivery_date} onChange={(e) => set('delivery_date', e.target.value)} className="mt-1" />
          </div>

          {/* Miles */}
          <div>
            <Label htmlFor="loaded_miles">Loaded Miles *</Label>
            <Input id="loaded_miles" type="number" min="0" value={form.loaded_miles} onChange={(e) => set('loaded_miles', e.target.value)} className="mt-1" />
            {errors.loaded_miles && <p className="mt-1 text-xs text-red-500">{errors.loaded_miles}</p>}
          </div>
          <div>
            <Label htmlFor="deadhead_miles">Deadhead Miles</Label>
            <Input id="deadhead_miles" type="number" min="0" value={form.deadhead_miles} onChange={(e) => set('deadhead_miles', e.target.value)} className="mt-1" />
          </div>

          {/* Gross Amount */}
          <div>
            <Label htmlFor="gross_amount">Gross Amount ($) *</Label>
            <Input id="gross_amount" type="number" min="0" step="0.01" value={form.gross_amount} onChange={(e) => set('gross_amount', e.target.value)} className="mt-1" />
            {errors.gross_amount && <p className="mt-1 text-xs text-red-500">{errors.gross_amount}</p>}
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="mt-1" />
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{initialData ? 'Save Changes' : 'Add Load'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
