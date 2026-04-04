import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Plus, Search, Pencil, Trash2, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { LoadForm } from '../components/trucking/LoadForm';
import { useSettings } from '../components/trucking/useSettings';
import { calculateEarnings, calculateGrossRPM, calculateMyPerMile, formatCurrency, formatMiles } from '../components/trucking/calcUtils';
import { useToast } from '../components/ui/use-toast';
import Load from '../api/entities/Load';

dayjs.extend(isoWeek);

/** Target My $/mi average the driver wants to maintain per week */
const TARGET_MY_PER_MILE = 0.70;

/**
 * Returns the minimum Gross RPM any individual load must achieve
 * for the driver to earn at least TARGET_MY_PER_MILE after their cut.
 * This is size-independent: works for 500 mi or 50,000 mi loads.
 * Returns null when already at/above target or profile is per-mile.
 */
function calcTargetGrossRPM(weekMyPerMile, settings) {
  if (weekMyPerMile >= TARGET_MY_PER_MILE) return null; // already meeting target

  const profile = settings?.earning_profile;
  const percentageRate = Number(settings?.percentage_rate) || 0;

  if (profile === 'solo_per_mile' || profile === 'team_per_mile') return null;

  if (
    (profile === 'owner_operator' || profile === 'solo_percentage' || profile === 'team_percentage') &&
    percentageRate > 0 && percentageRate < 100
  ) {
    // earning = gross × (pct/100)  →  gross = earning / (pct/100)
    return TARGET_MY_PER_MILE / (percentageRate / 100);
  }

  // No profile — earnings = gross, 1:1
  return TARGET_MY_PER_MILE;
}

function groupByWeek(loads) {
  const groups = {};
  for (const load of loads) {
    const dateToUse = load.delivery_date || load.pickup_date;
    const weekStart = dayjs(dateToUse).startOf('isoWeek').format('YYYY-MM-DD');
    if (!groups[weekStart]) {
      groups[weekStart] = {
        weekStart,
        loads: [],
      };
    }
    groups[weekStart].loads.push(load);
    groups[weekStart].weekEnd = dayjs(weekStart).endOf('isoWeek').format('YYYY-MM-DD');
    groups[weekStart].loads.sort((a, b) =>
      dayjs(b.delivery_date || b.pickup_date).diff(dayjs(a.delivery_date || a.pickup_date))
    );
  }
  return Object.values(groups).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

function rateLabel(settings) {
  if (!settings) return '';
  switch (settings.earning_profile) {
    case 'solo_per_mile':
    case 'team_per_mile':
      return settings.rate_per_mile ? ` @ $${settings.rate_per_mile}/mi` : '';
    case 'solo_percentage':
    case 'team_percentage':
      return settings.percentage_rate ? ` @ ${settings.percentage_rate}%` : '';
    case 'owner_operator':
      return settings.percentage_rate && settings.percentage_rate > 0 && settings.percentage_rate < 100
        ? ` @ ${settings.percentage_rate}% of gross`
        : '';
    default:
      return '';
  }
}

function weekLabel(weekStart, weekEnd) {
  const s = dayjs(weekStart);
  const e = dayjs(weekEnd);
  if (s.month() === e.month()) {
    return `${s.format('MMM D')} – ${e.format('D, YYYY')}`;
  }
  return `${s.format('MMM D')} – ${e.format('MMM D, YYYY')}`;
}

export default function Loads() {
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editLoad, setEditLoad] = useState(null);
  const [search, setSearch] = useState('');

  const { data: loads = [], isLoading, isError } = useQuery({
    queryKey: ['loads'],
    queryFn: () => Load.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => Load.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load added successfully ✓' });
      setFormOpen(false);
    },
    onError: (error) => {
      console.error('Failed to create load:', error);
      toast({ title: 'Failed to add load', description: error?.message || 'Check console for details', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Load.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load updated successfully ✓' });
      setEditLoad(null);
    },
    onError: (error) => {
      console.error('Failed to update load:', error);
      toast({ title: 'Failed to update load', description: error?.message || 'Check console for details', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Load.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load deleted ✓' });
    },
    onError: (error) => {
      console.error('Failed to delete load:', error);
      toast({ title: 'Failed to delete load', description: error?.message || 'Check console for details', variant: 'destructive' });
    },
  });

  // Detect junk loads: $0 gross AND 0 miles = empty/useless record
  const emptyLoads = loads.filter((l) => {
    const gross = Number(l.gross_amount) || 0;
    const miles = Number(l.loaded_miles) || 0;
    return gross === 0 && miles === 0;
  });
  const [cleaning, setCleaning] = useState(false);

  const cleanupEmptyLoads = async () => {
    if (emptyLoads.length === 0) return;
    const count = emptyLoads.length;
    setCleaning(true);
    let deleted = 0;
    try {
      for (const l of emptyLoads) {
        await Load.delete(l.id);
        deleted++;
      }
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: `${deleted} empty load(s) deleted ✓` });
    } catch (err) {
      console.error('Cleanup error:', err);
      toast({ title: `Failed at ${deleted}/${count}`, description: String(err?.message || err), variant: 'destructive' });
      if (deleted > 0) queryClient.invalidateQueries({ queryKey: ['loads'] });
    } finally {
      setCleaning(false);
    }
  };

  const handleDelete = (e, loadId) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete this load?')) {
      deleteMutation.mutate(loadId);
    }
  };

  const handleEdit = (e, load) => {
    e.stopPropagation();
    e.preventDefault();
    setEditLoad(load);
    setFormOpen(true);
  };

  // Filter
  const filtered = loads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.broker_name || '').toLowerCase().includes(q) ||
      (l.pickup_city || '').toLowerCase().includes(q) ||
      (l.delivery_city || '').toLowerCase().includes(q) ||
      (l.pickup_state || '').toLowerCase().includes(q) ||
      (l.delivery_state || '').toLowerCase().includes(q) ||
      (l.load_id || '').toLowerCase().includes(q)
    );
  });

  const weeks = groupByWeek(filtered);

  const handleSave = (data) => {
    if (editLoad) {
      updateMutation.mutate({ id: editLoad.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isError) {
    return (
      <div className="p-3 sm:p-6">
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <p className="font-medium">Failed to load data</p>
          <p className="text-sm mt-1 text-slate-500">Please check your connection and try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['loads'] })}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-5">
      {/* Cleanup banner */}
      {emptyLoads.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">
              ⚠ {emptyLoads.length} load(s) with empty Load ID found
            </p>
            <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">
              These records have no Load ID and should be removed.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={cleanupEmptyLoads}
            disabled={cleaning}
            className="shrink-0 ml-4"
          >
            {cleaning ? 'Deleting…' : `Delete ${emptyLoads.length} Empty Load(s)`}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Loads</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {loads.length} total loads{rateLabel(settings)}
          </p>
        </div>
        <Button onClick={() => { setEditLoad(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Load
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search broker, city, state, load #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && weeks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Truck className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">No loads found</p>
          <p className="text-sm mt-1">{search ? 'Try a different search term' : 'Start by adding your first load'}</p>
        </div>
      )}

      {weeks.map((week) => {
        const weekGross = week.loads.reduce((s, l) => s + (l.gross_amount || 0), 0);
        const weekEarnings = week.loads.reduce((s, l) => s + calculateEarnings(l, settings), 0);
        const weekMiles = week.loads.reduce((s, l) => s + (l.loaded_miles || 0), 0);
        const weekDeadhead = week.loads.reduce((s, l) => s + (l.deadhead_miles || 0), 0);
        const weekTotalMiles = weekMiles + weekDeadhead;
        const weekGrossRPM = weekTotalMiles > 0 ? weekGross / weekTotalMiles : 0;
        const weekMyPerMile = weekTotalMiles > 0 ? weekEarnings / weekTotalMiles : 0;
        // ── What-if hint: minimum Gross RPM for any individual load to earn TARGET_MY_PER_MILE ──
        const targetGrossRPM = calcTargetGrossRPM(weekMyPerMile, settings);
        const isAboveTarget = weekTotalMiles > 0 && weekMyPerMile >= TARGET_MY_PER_MILE;

        return (
          <Card key={week.weekStart}>
            {/* ── Weekly summary header — distinct tinted background ── */}
            <CardHeader className="pb-3 px-3 sm:px-6 rounded-t-xl bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-900 dark:to-slate-800 border-b border-slate-600 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-sm font-semibold text-slate-200">
                  {weekLabel(week.weekStart, week.weekEnd)}
                </CardTitle>
                <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-4 text-xs text-slate-300">
                  <span>{week.loads.length} trips</span>
                  <span>{formatMiles(weekTotalMiles)} mi</span>
                  <span className="font-medium text-white">
                    {formatCurrency(weekGross)}
                  </span>
                  <span className="font-bold text-slate-100">
                    RPM {formatCurrency(weekGrossRPM)}
                  </span>
                  <span className="font-bold text-blue-300">
                    {formatCurrency(weekEarnings)}
                  </span>
                  <span className={`font-semibold ${isAboveTarget ? 'text-emerald-300' : 'text-amber-300'}`}>
                    My {formatCurrency(weekMyPerMile)}/mi
                    {isAboveTarget && (
                      <span className="ml-1 text-emerald-400" title="At or above your \$0.70/mi target!">✓</span>
                    )}
                    {targetGrossRPM !== null && (
                      <span
                        className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold text-amber-200 whitespace-nowrap"
                        title={`Any load with Gross RPM ≥ ${formatCurrency(targetGrossRPM)} earns you $${TARGET_MY_PER_MILE.toFixed(2)}/mi or more — regardless of load size.`}
                      >
                        → Load target ≥ {formatCurrency(targetGrossRPM)} Gross RPM
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop table — hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Load</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Broker</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Route</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dates</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mi</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">DH</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gross</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gross RPM</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Earning</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">My $/Mi</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {week.loads.map((load) => (
                      <tr key={load.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs font-medium text-primary-800 dark:text-blue-400">{load.load_id}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{load.broker_name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          <span>{load.pickup_city}, {load.pickup_state}</span>
                          <span className="mx-1 text-slate-400">→</span>
                          <span>{load.delivery_city}, {load.delivery_state}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <div>PU: {load.pickup_date ? dayjs(load.pickup_date).format('MM/DD/YYYY') : '—'}</div>
                          <div>DO: {load.delivery_date ? dayjs(load.delivery_date).format('MM/DD/YYYY') : '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{formatMiles(load.loaded_miles)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">{formatMiles(load.deadhead_miles)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900 dark:text-white">{formatCurrency(load.gross_amount)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(calculateGrossRPM(load))}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-primary-800 dark:text-blue-400">{formatCurrency(calculateEarnings(load, settings))}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(calculateMyPerMile(load, settings))}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={load.status === 'Delivered' ? 'success' : 'warning'}>
                            {load.status || 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={(e) => handleEdit(e, load)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, load.id)}
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

              {/* Mobile cards — shown only on mobile */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                {week.loads.map((load) => (
                  <div key={load.id} className="px-3 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-primary-800 dark:text-blue-400">{load.load_id}</span>
                        <Badge variant={load.status === 'Delivered' ? 'success' : 'warning'} className="text-[10px] px-1.5 py-0">
                          {load.status || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={(e) => handleEdit(e, load)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={(e) => handleDelete(e, load.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{load.broker_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}
                    </p>
                    <div className="text-[10px] text-slate-400">
                      PU: {load.pickup_date ? dayjs(load.pickup_date).format('MM/DD') : '—'} · DO: {load.delivery_date ? dayjs(load.delivery_date).format('MM/DD') : '—'}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Mi / DH</p>
                        <p className="text-xs font-medium tabular-nums">{formatMiles(load.loaded_miles)} / {formatMiles(load.deadhead_miles)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Gross</p>
                        <p className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">{formatCurrency(load.gross_amount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Gross RPM</p>
                        <p className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(calculateGrossRPM(load))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Earning</p>
                        <p className="text-xs font-bold tabular-nums text-primary-800 dark:text-blue-400">{formatCurrency(calculateEarnings(load, settings))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">My $/Mi</p>
                        <p className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(calculateMyPerMile(load, settings))}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <LoadForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditLoad(null); }}
        onSave={handleSave}
        initialData={editLoad}
        settings={settings}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
