import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Truck, Route, TrendingUp, Calendar, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { StatCard } from '../components/trucking/StatCard';
import { RecentLoadsTable } from '../components/trucking/RecentLoadsTable';
import { useSettings } from '../components/trucking/useSettings';
import {
  calculateEarnings, calculateMetrics, filterByPeriod,
  formatCurrency, formatMiles,
} from '../components/trucking/calcUtils';
import Load from '../api/entities/Load';
import Expense from '../api/entities/Expense';

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 animate-pulse">
      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-600" />
      <div className="mt-3 h-8 w-32 rounded bg-slate-200 dark:bg-slate-600" />
    </div>
  );
}

export default function Dashboard() {
  const { settings } = useSettings();
  const [rpmPeriod, setRpmPeriod] = useState('all');

  const { data: loads = [], isLoading: loadsLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: () => Load.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => Expense.list(),
  });

  const todayLoads = filterByPeriod(loads, 'today');
  const weekLoads = filterByPeriod(loads, 'thisWeek');
  const monthLoads = filterByPeriod(loads, 'thisMonth');
  const yearLoads = filterByPeriod(loads, 'thisYear');

  const todayEarnings = todayLoads.reduce((s, l) => s + calculateEarnings(l, settings), 0);
  const weekEarnings = weekLoads.reduce((s, l) => s + calculateEarnings(l, settings), 0);
  const monthEarnings = monthLoads.reduce((s, l) => s + calculateEarnings(l, settings), 0);
  const yearEarnings = yearLoads.reduce((s, l) => s + calculateEarnings(l, settings), 0);

  const metrics = calculateMetrics(loads, expenses, settings);

  const rpmLoads = rpmPeriod === 'all' ? loads : filterByPeriod(loads, rpmPeriod, 'delivery_date');
  const rpmMiles = rpmLoads.reduce((s, l) => s + (l.loaded_miles || 0), 0);
  const rpmEarnings = rpmLoads.reduce((s, l) => s + calculateEarnings(l, settings), 0);
  const avgRpm = rpmMiles > 0 ? rpmEarnings / rpmMiles : 0;

  if (loadsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your trucking income at a glance</p>
      </div>

      {/* Row 1: Time-based earnings */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Calendar}
          label="Today's Earnings"
          value={formatCurrency(todayEarnings)}
        />
        <StatCard
          icon={Calendar}
          label="This Week"
          value={formatCurrency(weekEarnings)}
        />
        <StatCard
          icon={DollarSign}
          label="This Month"
          value={formatCurrency(monthEarnings)}
        />
        <StatCard
          icon={TrendingUp}
          label="This Year ⚡"
          value={formatCurrency(yearEarnings)}
          accent
          large
        />
      </div>

      {/* Row 2: Performance metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Route}
          label="Total Miles"
          value={formatMiles(metrics.totalMiles)}
        />
        <StatCard
          icon={Truck}
          label="Total Trips"
          value={metrics.totalTrips.toLocaleString()}
        />
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg $/Mile</p>
                <Select value={rpmPeriod} onValueChange={setRpmPeriod}>
                  <SelectTrigger className="h-5 text-xs px-1.5 w-28 shrink-0">
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
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(avgRpm)}
              </p>
            </div>
            <div className="rounded-lg p-2 bg-primary-50 dark:bg-slate-700 ml-2 shrink-0">
              <BarChart2 className="h-5 w-5 text-primary-800 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <StatCard
          icon={DollarSign}
          label="Avg $/Trip"
          value={formatCurrency(metrics.avgPerTrip)}
        />
      </div>

      {/* Recent Loads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">Recent Loads</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentLoadsTable loads={loads} />
        </CardContent>
      </Card>
    </div>
  );
}
