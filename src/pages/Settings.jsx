import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { Download, Upload, Save, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast';
import AppSettings from '../api/entities/AppSettings';
import Load from '../api/entities/Load';
import Expense from '../api/entities/Expense';

const PROFILES = [
  { value: 'owner_operator', label: 'Owner Operator (Full Gross)' },
  { value: 'solo_per_mile', label: 'Solo Driver – Per Mile' },
  { value: 'solo_percentage', label: 'Solo Driver – Percentage' },
  { value: 'team_per_mile', label: 'Team Driver – Per Mile' },
  { value: 'team_percentage', label: 'Team Driver – Percentage' },
];

const DEFAULT = {
  earning_profile: 'owner_operator',
  rate_per_mile: '',
  percentage_rate: '',
  dark_mode: false,
  driver_name: '',
  company_name: '',
};

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(DEFAULT);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => AppSettings.list(),
  });

  useEffect(() => {
    if (settingsData?.[0]) {
      const s = settingsData[0];
      setForm({
        earning_profile: s.earning_profile || 'owner_operator',
        rate_per_mile: s.rate_per_mile?.toString() || '',
        percentage_rate: s.percentage_rate?.toString() || '',
        dark_mode: s.dark_mode || false,
        driver_name: s.driver_name || '',
        company_name: s.company_name || '',
      });
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = await AppSettings.list();
      const payload = {
        ...data,
        rate_per_mile: parseFloat(data.rate_per_mile) || 0,
        percentage_rate: parseFloat(data.percentage_rate) || 0,
      };
      if (existing.length > 0) {
        return AppSettings.update(existing[0].id, payload);
      }
      return AppSettings.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Settings saved', variant: 'success' });
    },
    onError: () => toast({ title: 'Failed to save settings', variant: 'destructive' }),
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => saveMutation.mutate(form);

  // Export
  const handleExport = async () => {
    try {
      const [loads, expenses, settings] = await Promise.all([
        Load.list(),
        Expense.list(),
        AppSettings.list(),
      ]);
      const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        loads,
        expenses,
        settings: settings[0] || {},
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truckflow-backup-${moment().format('YYYY-MM-DD')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Data exported successfully', variant: 'success' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  // Import flow
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setImportDialogOpen(true);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!pendingFile) return;
    setImporting(true);
    try {
      const text = await pendingFile.text();
      const data = JSON.parse(text);

      const [existingLoads, existingExpenses] = await Promise.all([
        Load.list(),
        Expense.list(),
      ]);
      for (const l of existingLoads) await Load.delete(l.id);
      for (const e of existingExpenses) await Expense.delete(e.id);

      if (data.loads?.length) await Load.bulkCreate(data.loads);
      if (data.expenses?.length) await Expense.bulkCreate(data.expenses);
      if (data.settings) {
        const existing = await AppSettings.list();
        if (existing.length > 0) {
          await AppSettings.update(existing[0].id, data.settings);
        } else {
          await AppSettings.create(data.settings);
        }
      }

      queryClient.invalidateQueries();
      toast({ title: 'Data imported successfully', variant: 'success' });
    } catch {
      toast({ title: 'Import failed – invalid file', variant: 'destructive' });
    } finally {
      setImporting(false);
      setImportDialogOpen(false);
      setPendingFile(null);
    }
  };

  const isPerMile = form.earning_profile === 'solo_per_mile' || form.earning_profile === 'team_per_mile';
  const isPercentage = form.earning_profile === 'solo_percentage' || form.earning_profile === 'team_percentage';

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure your earning profile and preferences</p>
      </div>

      {/* Earning Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base dark:text-white">Earning Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Profile Type</Label>
            <Select value={form.earning_profile} onValueChange={(v) => set('earning_profile', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROFILES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isPerMile && (
            <div>
              <Label htmlFor="rate_per_mile">Rate Per Mile ($)</Label>
              <Input
                id="rate_per_mile"
                type="number"
                min="0"
                step="0.01"
                value={form.rate_per_mile}
                onChange={(e) => set('rate_per_mile', e.target.value)}
                className="mt-1 max-w-xs"
                placeholder="e.g., 0.55"
              />
            </div>
          )}

          {isPercentage && (
            <div>
              <Label htmlFor="percentage_rate">Percentage Rate (%)</Label>
              <Input
                id="percentage_rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.percentage_rate}
                onChange={(e) => set('percentage_rate', e.target.value)}
                className="mt-1 max-w-xs"
                placeholder="e.g., 25"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base dark:text-white">Personal Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="driver_name">Driver Name</Label>
            <Input
              id="driver_name"
              value={form.driver_name}
              onChange={(e) => set('driver_name', e.target.value)}
              className="mt-1 max-w-sm"
              placeholder="Your name"
            />
          </div>
          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              className="mt-1 max-w-sm"
              placeholder="Your company"
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base dark:text-white">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Switch to dark theme</p>
            </div>
            <Switch
              checked={form.dark_mode}
              onCheckedChange={(v) => set('dark_mode', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
        <Save className="h-4 w-4" />
        {saveMutation.isPending ? 'Saving…' : 'Save Settings'}
      </Button>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base dark:text-white">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export Data (JSON)
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Import Data (JSON)
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export creates a full backup. Import will replace all existing data.
          </p>
        </CardContent>
      </Card>

      {/* Import confirmation dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Import
            </DialogTitle>
            <DialogDescription>
              This will permanently replace all your current loads, expenses, and settings with the imported data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setPendingFile(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleImportConfirm} disabled={importing}>
              {importing ? 'Importing…' : 'Yes, Replace All Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
