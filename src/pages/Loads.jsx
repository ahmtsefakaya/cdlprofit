import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { Plus, Search, Pencil, Trash2, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { LoadForm } from '../components/trucking/LoadForm';
import { useSettings } from '../components/trucking/useSettings';
import { calculateEarnings, formatCurrency, formatMiles } from '../components/trucking/calcUtils';
import { useToast } from '../components/ui/use-toast';
import Load from '../api/entities/Load';

function groupByWeek(loads) {
  const groups = {};
  for (const load of loads) {
    const dateToUse = load.delivery_date || load.pickup_date;
    const weekStart = moment(dateToUse).startOf('isoWeek').format('YYYY-MM-DD');
    if (!groups[weekStart]) groups[weekStart] = [];
    groups[weekStart].push(load);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, items]) => ({
      weekStart,
      weekEnd: moment(weekStart).endOf('isoWeek').format('YYYY-MM-DD'),
      loads: items.sort((a, b) =>
        moment(b.delivery_date || b.pickup_date).diff(moment(a.delivery_date || a.pickup_date))
      ),
    }));
}

function rateLabel(settings) {
  const { earning_profile, percentage_rate, rate_per_mile } = settings || {};
  switch (earning_profile) {
    case 'solo_percentage':
    case 'team_percentage':
      return `${percentage_rate || 0}%`;
    case 'solo_per_mile':
    case 'team_per_mile':
      return `$${(rate_per_mile || 0).toFixed(2)}/mi`;
    case 'owner_operator':
      return '100%';
    default:
      return '—';
  }
}

function weekLabel(weekStart, weekEnd) {
  const s = moment(weekStart);
  const e = moment(weekEnd);
  if (s.year() === e.year()) {
    return `${s.format('MMM D')} – ${e.format('MMM D, YYYY')}`;
  }
  return `${s.format('MMM D, YYYY')} – ${e.format('MMM D, YYYY')}`;
}

export default function Loads() {
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editLoad, setEditLoad] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: () => Load.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Creating load:', data);
      const result = await Load.create(data);
      console.log('Load created:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load added successfully ✓' });
      setFormOpen(false);
      setEditLoad(null);
    },
    onError: (error) => {
      console.error('Failed to create load:', error);
      toast({ title: 'Failed to add load', description: error?.message || 'Check console for details', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('Updating load:', id, data);
      const result = await Load.update(id, data);
      console.log('Load updated:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load updated successfully ✓' });
      setFormOpen(false);
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
      toast({ title: 'Load deleted' });
    },
    onError: (error) => {
      console.error('Failed to delete load:', error);
      toast({ title: 'Failed to delete load', variant: 'destructive' });
    },
  });

  const filtered = loads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      l.load_id?.toLowerCase().includes(q) ||
      l.broker_name?.toLowerCase().includes(q) ||
      l.pickup_city?.toLowerCase().includes(q) ||
      l.delivery_city?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const weekGroups = groupByWeek(filtered);

  const handleSave = (data) => {
    if (editLoad) {
      updateMutation.mutate({ id: editLoad.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Loads</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{loads.length} total loads</p>
        </div>
        <Button onClick={() => { setEditLoad(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Load
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by broker, city, load ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && weekGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Truck className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">No loads found</p>
          <p className="text-sm mt-1">Add your first load to get started</p>
        </div>
      )}

      {/* Weekly groups */}
      {weekGroups.map(({ weekStart, weekEnd, loads: weekLoads }) => {
        const totalMiles = weekLoads.reduce((s, l) => s + (l.loaded_miles || 0), 0);
        const totalDeadhead = weekLoads.reduce((s, l) => s + (l.deadhead_miles || 0), 0);
        const totalEarnings = weekLoads.reduce((s, l) => s + calculateEarnings(l, settings), 0);

        return (
          <Card key={weekStart}>
            {/* Week header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-xl">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Week of</p>
                <p className="font-bold text-slate-900 dark:text-white">{weekLabel(weekStart, weekEnd)}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Trips</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{weekLoads.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Miles</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{formatMiles(totalMiles)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Deadhead</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{formatMiles(totalDeadhead)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Earnings</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalEarnings)}</p>
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Load ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Broker</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Route</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Miles</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gross</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">RPM</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Earnings</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {weekLoads.map((load) => (
                      <tr key={load.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs font-medium text-primary-800 dark:text-blue-400">{load.load_id}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{load.broker_name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{formatMiles(load.loaded_miles)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(load.gross_amount)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                          {load.loaded_miles > 0 ? `$${((load.gross_amount || 0) / load.loaded_miles).toFixed(2)}/mi` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                          {rateLabel(settings)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-600 dark:text-green-400">{formatCurrency(calculateEarnings(load, settings))}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={load.status === 'Delivered' ? 'success' : 'warning'}>{load.status || 'Pending'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                          <div>PU: {load.pickup_date ? moment(load.pickup_date).format('MM/DD/YYYY') : '—'}</div>
                          <div>DO: {load.delivery_date ? moment(load.delivery_date).format('MM/DD/YYYY') : '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditLoad(load); setFormOpen(true); }}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(load.id)}
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
        );
      })}

      <LoadForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditLoad(null); }}
        onSave={handleSave}
        initialData={editLoad}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
