import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { calculateEarnings, calculateGrossRPM, calculateMyPerMile, formatCurrency } from './calcUtils';
import { useAIParse } from './useAIParse';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

const PROFILES = [
  { value: 'owner_operator', label: 'Owner Operator' },
  { value: 'solo_per_mile', label: 'Solo Driver – Per Mile' },
  { value: 'solo_percentage', label: 'Solo Driver – Percentage' },
  { value: 'team_per_mile', label: 'Team Driver – Per Mile' },
  { value: 'team_percentage', label: 'Team Driver – Percentage' },
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
  // Per-load earning snapshot (pre-filled from Settings, editable)
  earning_profile: '',
  rate_per_mile: '',
  percentage_rate: '',
};

/** Live preview panel — shows Gross RPM, Earning, My $/Mi */
function LiveEarningPreview({ form }) {
  const previewLoad = useMemo(() => ({
    gross_amount: parseFloat(form.gross_amount) || 0,
    loaded_miles: parseFloat(form.loaded_miles) || 0,
    deadhead_miles: parseFloat(form.deadhead_miles) || 0,
    earning_profile: form.earning_profile || undefined,
    rate_per_mile: parseFloat(form.rate_per_mile) || 0,
    percentage_rate: parseFloat(form.percentage_rate) || 0,
  }), [form.gross_amount, form.loaded_miles, form.deadhead_miles, form.earning_profile, form.rate_per_mile, form.percentage_rate]);

  const grossRPM = calculateGrossRPM(previewLoad);
  const earning = calculateEarnings(previewLoad, null);
  const myPerMile = calculateMyPerMile(previewLoad, null);
  const totalMiles = previewLoad.loaded_miles + previewLoad.deadhead_miles;

  const hasData = previewLoad.gross_amount > 0 || previewLoad.loaded_miles > 0;

  if (!hasData) return null;

  return (
    <div className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
      <div className="grid grid-cols-3 gap-3 text-sm">
        {totalMiles > 0 && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Gross RPM</p>
            <p className="font-bold text-slate-700 dark:text-slate-200 text-lg">{formatCurrency(grossRPM)}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Earning</p>
          <p className="font-bold text-primary-800 dark:text-blue-400 text-lg">{formatCurrency(earning)}</p>
        </div>
        {totalMiles > 0 && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">My $/Mi</p>
            <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{formatCurrency(myPerMile)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * LoadForm — Add / Edit a load.
 *
 * Props:
 *  - open: boolean
 *  - onClose: fn
 *  - onSave: fn(payload)
 *  - initialData: load object (edit mode) or null (add mode)
 *  - settings: current global settings (used to pre-fill earning fields for new loads)
 *  - isSaving: boolean
 */
export function LoadForm({ open, onClose, onSave, initialData, settings, isSaving }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // AI Parse state
  const { parse, isParsing } = useAIParse();
  const [rawText, setRawText] = useState('');
  const [aiError, setAiError] = useState('');
  const [highlightedFields, setHighlightedFields] = useState({});
  const highlightTimer = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      // Edit mode — load the saved snapshot from the document
      setForm({
        ...EMPTY_FORM,
        ...initialData,
        loaded_miles: initialData.loaded_miles?.toString() ?? '',
        deadhead_miles: initialData.deadhead_miles?.toString() ?? '',
        gross_amount: initialData.gross_amount?.toString() ?? '',
        rate_per_mile: initialData.rate_per_mile?.toString() ?? '',
        percentage_rate: initialData.percentage_rate?.toString() ?? '',
      });
    } else {
      // Add mode — pre-fill earning snapshot from current global settings
      setForm({
        ...EMPTY_FORM,
        earning_profile: settings?.earning_profile ?? 'owner_operator',
        rate_per_mile: settings?.rate_per_mile?.toString() ?? '',
        percentage_rate: settings?.percentage_rate?.toString() ?? '',
      });
    }
    setErrors({});
    setRawText('');
    setAiError('');
    setHighlightedFields({});
  }, [open, initialData, settings]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleAIParse = async () => {
    setAiError('');
    try {
      const parsed = await parse(rawText);
      if (!parsed || Object.keys(parsed).length === 0) {
        setAiError('AI could not extract any fields. Try pasting more text.');
        return;
      }
      // Apply parsed values to form (only non-empty values)
      setForm((f) => ({ ...f, ...parsed }));
      // Highlight filled fields briefly
      setHighlightedFields(Object.fromEntries(Object.keys(parsed).map((k) => [k, true])));
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedFields({}), 2000);
    } catch (err) {
      setAiError(err.message || 'AI parsing failed.');
    }
  };

  // CSS class helper — adds green ring when field was just AI-filled
  const hl = (field) =>
    highlightedFields[field]
      ? 'ring-2 ring-emerald-400 dark:ring-emerald-500 transition-all'
      : '';

  const isPerMile = form.earning_profile === 'solo_per_mile' || form.earning_profile === 'team_per_mile';
  const isPercentage = form.earning_profile === 'owner_operator' || form.earning_profile === 'solo_percentage' || form.earning_profile === 'team_percentage';
  const isOwnerOp = form.earning_profile === 'owner_operator';

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
    const payload = {
      load_id: form.load_id.trim(),
      broker_name: form.broker_name.trim(),
      pickup_city: form.pickup_city.trim(),
      pickup_state: form.pickup_state,
      delivery_city: form.delivery_city.trim(),
      delivery_state: form.delivery_state,
      pickup_date: form.pickup_date,
      delivery_date: form.delivery_date || null,
      loaded_miles: parseFloat(form.loaded_miles) || 0,
      deadhead_miles: parseFloat(form.deadhead_miles) || 0,
      gross_amount: parseFloat(form.gross_amount) || 0,
      notes: form.notes || '',
      status: form.status || 'Pending',
      // Earning snapshot — saved with the load so global settings changes don't touch it
      earning_profile: form.earning_profile || 'owner_operator',
      rate_per_mile: parseFloat(form.rate_per_mile) || 0,
      percentage_rate: parseFloat(form.percentage_rate) || 0,
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Load' : 'Add New Load'}</DialogTitle>
        </DialogHeader>

        {/* ── AI Auto-Fill Panel (only on Add mode) ── */}
        {!initialData && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <div>
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">AI Auto-Fill</p>
                <p className="text-xs text-violet-600 dark:text-violet-400">Rate confirmation metnini yapıştır, AI formu otomatik doldursun</p>
              </div>
            </div>
            <textarea
              className="w-full rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 p-3 min-h-[90px] resize-y focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500"
              placeholder="Rate confirmation metnini buraya yapıştır…
(Load #, broker adı, pickup/delivery adresleri, mil, tutar, tarihler)"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            {aiError && (
              <p className="text-xs text-red-500 dark:text-red-400">⚠ {aiError}</p>
            )}
            <Button
              type="button"
              onClick={handleAIParse}
              disabled={!rawText.trim() || isParsing}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm"
            >
              {isParsing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Parsing…
                </>
              ) : (
                <>✨ Parse with AI</>
              )}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Load ID */}
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="load_id">Load ID *</Label>
            <Input id="load_id" value={form.load_id} onChange={(e) => set('load_id', e.target.value)} className={`mt-1 ${hl('load_id')}`} />
            {errors.load_id && <p className="mt-1 text-xs text-red-500">{errors.load_id}</p>}
          </div>

          {/* Broker */}
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="broker_name">Broker Name *</Label>
            <Input id="broker_name" value={form.broker_name} onChange={(e) => set('broker_name', e.target.value)} className={`mt-1 ${hl('broker_name')}`} />
            {errors.broker_name && <p className="mt-1 text-xs text-red-500">{errors.broker_name}</p>}
          </div>

          {/* Pickup */}
          <div>
            <Label htmlFor="pickup_city">Pickup City *</Label>
            <Input id="pickup_city" value={form.pickup_city} onChange={(e) => set('pickup_city', e.target.value)} className={`mt-1 ${hl('pickup_city')}`} />
            {errors.pickup_city && <p className="mt-1 text-xs text-red-500">{errors.pickup_city}</p>}
          </div>
          <div>
            <Label>Pickup State *</Label>
            <Select value={form.pickup_state} onValueChange={(v) => set('pickup_state', v)}>
              <SelectTrigger className={`mt-1 ${hl('pickup_state')}`}><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {errors.pickup_state && <p className="mt-1 text-xs text-red-500">{errors.pickup_state}</p>}
          </div>

          {/* Delivery */}
          <div>
            <Label htmlFor="delivery_city">Delivery City *</Label>
            <Input id="delivery_city" value={form.delivery_city} onChange={(e) => set('delivery_city', e.target.value)} className={`mt-1 ${hl('delivery_city')}`} />
            {errors.delivery_city && <p className="mt-1 text-xs text-red-500">{errors.delivery_city}</p>}
          </div>
          <div>
            <Label>Delivery State *</Label>
            <Select value={form.delivery_state} onValueChange={(v) => set('delivery_state', v)}>
              <SelectTrigger className={`mt-1 ${hl('delivery_state')}`}><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {errors.delivery_state && <p className="mt-1 text-xs text-red-500">{errors.delivery_state}</p>}
          </div>

          {/* Dates */}
          <div>
            <Label htmlFor="pickup_date">Pickup Date *</Label>
            <Input id="pickup_date" type="date" value={form.pickup_date} onChange={(e) => set('pickup_date', e.target.value)} className={`mt-1 ${hl('pickup_date')}`} />
            {errors.pickup_date && <p className="mt-1 text-xs text-red-500">{errors.pickup_date}</p>}
          </div>
          <div>
            <Label htmlFor="delivery_date">Delivery Date</Label>
            <Input id="delivery_date" type="date" value={form.delivery_date ?? ''} onChange={(e) => set('delivery_date', e.target.value)} className={`mt-1 ${hl('delivery_date')}`} />
          </div>

          {/* Miles */}
          <div>
            <Label htmlFor="loaded_miles">Loaded Miles *</Label>
            <Input id="loaded_miles" type="number" min="0" value={form.loaded_miles} onChange={(e) => set('loaded_miles', e.target.value)} className={`mt-1 ${hl('loaded_miles')}`} />
            {errors.loaded_miles && <p className="mt-1 text-xs text-red-500">{errors.loaded_miles}</p>}
          </div>
          <div>
            <Label htmlFor="deadhead_miles">Deadhead Miles</Label>
            <Input id="deadhead_miles" type="number" min="0" value={form.deadhead_miles} onChange={(e) => set('deadhead_miles', e.target.value)} className="mt-1" />
          </div>

          {/* Gross Amount */}
          <div>
            <Label htmlFor="gross_amount">Gross Amount ($) *</Label>
            <Input id="gross_amount" type="number" min="0" step="0.01" value={form.gross_amount} onChange={(e) => set('gross_amount', e.target.value)} className={`mt-1 ${hl('gross_amount')}`} />
            {errors.gross_amount && <p className="mt-1 text-xs text-red-500">{errors.gross_amount}</p>}
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Earning Profile Snapshot ── */}
          <div className="col-span-2 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Earning Profile <span className="font-normal normal-case">(saved with this load)</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>Profile Type</Label>
                <Select value={form.earning_profile} onValueChange={(v) => set('earning_profile', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROFILES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {isPerMile && (
                <div>
                  <Label htmlFor="rate_per_mile">Rate Per Mile ($)</Label>
                  <Input
                    id="rate_per_mile"
                    type="number" min="0" step="0.01"
                    value={form.rate_per_mile}
                    onChange={(e) => set('rate_per_mile', e.target.value)}
                    className="mt-1"
                    placeholder="e.g. 0.55"
                  />
                </div>
              )}

              {isPercentage && (
                <div>
                  <Label htmlFor="percentage_rate">
                    {isOwnerOp ? 'Dispatch Fee (%)' : 'Percentage Rate (%)'}
                  </Label>
                  <Input
                    id="percentage_rate"
                    type="number" min="0" max="100" step="0.1"
                    value={form.percentage_rate}
                    onChange={(e) => set('percentage_rate', e.target.value)}
                    className="mt-1"
                    placeholder={isOwnerOp ? 'e.g. 10' : 'e.g. 25'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Live Preview ── */}
          <div className="col-span-2">
            <LiveEarningPreview form={form} />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="mt-1" />
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : (initialData ? 'Save Changes' : 'Add Load')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
