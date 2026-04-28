import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { DollarSign, Truck, Route, TrendingUp, Calendar, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { StatCard } from '../components/trucking/StatCard';
import { RecentLoadsTable } from '../components/trucking/RecentLoadsTable';
import { useSettings } from '../components/trucking/useSettings';
import {
  calculateEarnings, calculateMetrics,
  formatCurrency, formatMiles,
} from '../components/trucking/calcUtils';
import Load from '../api/entities/Load';
import Expense from '../api/entities/Expense';

dayjs.extend(isoWeek);

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 animate-pulse">
      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-600" />
      <div className="mt-3 h-8 w-32 rounded bg-slate-200 dark:bg-slate-600" />
    </div>
  );
}

/** Mini select that sits inline next to the card label */
function PeriodSelect({ value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-5 text-xs px-1.5 w-auto min-w-[90px] shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Build list of unique years that appear in loads, plus current year if missing */
function buildYears(loads) {
  const years = new Set([dayjs().year()]);
  for (const l of loads) {
    const d = l.delivery_date || l.pickup_date;
    if (d) years.add(dayjs(d).year());
  }
  return [...years].sort((a, b) => b - a);
}

/** Build list of unique year-months (YYYY-MM) from loads, plus current month */
function buildMonths(loads) {
  const months = new Set([dayjs().format('YYYY-MM')]);
  for (const l of loads) {
    const d = l.delivery_date || l.pickup_date;
    if (d) months.add(dayjs(d).format('YYYY-MM'));
  }
  return [...months].sort((a, b) => b.localeCompare(a));
}

/** Build list of week starts (YYYY-MM-DD Monday) from loads, plus current week */
function buildWeeks(loads) {
  const weeks = new Set([dayjs().startOf('isoWeek').format('YYYY-MM-DD')]);
  for (const l of loads) {
    const d = l.delivery_date || l.pickup_date;
    if (d) weeks.add(dayjs(d).startOf('isoWeek').format('YYYY-MM-DD'));
  }
  return [...weeks].sort((a, b) => b.localeCompare(a));
}

/** Format a week-start date as a readable option label */
function weekLabel(weekStart) {
  const s = dayjs(weekStart);
  const e = s.endOf('isoWeek');
  const current = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
  const prefix = weekStart === current ? 'This Week · ' : '';
  if (s.month() === e.month()) return `${prefix}${s.format('MM/DD')} – ${e.format('MM/DD/YYYY')}`;
  return `${prefix}${s.format('MM/DD')} – ${e.format('MM/DD/YYYY')}`;
}

export default function Dashboard() {
  const { settings } = useSettings();
  const now = dayjs();

  // Period selectors — default to "current"
  const [selectedYear, setSelectedYear] = useState(String(now.year()));
  const [selectedMonth, setSelectedMonth] = useState(now.format('YYYY-MM'));
  const [selectedWeek, setSelectedWeek] = useState(now.startOf('isoWeek').format('YYYY-MM-DD'));
  const [selectedDay, setSelectedDay] = useState(now.format('YYYY-MM-DD'));
  const [rpmPeriod, setRpmPeriod] = useState('all');
  // Miles / Trips period — format: 'all' | 'year:YYYY' | 'month:YYYY-MM' | 'week:YYYY-MM-DD' | 'day:YYYY-MM-DD'
  const [milesPeriod, setMilesPeriod] = useState('all');
  const [tripsPeriod, setTripsPeriod] = useState('all');

  const { data: loads = [], isLoading: loadsLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: () => Load.list(),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => Expense.list(),
  });

  // Dynamic option lists built from actual load data
  const yearOptions = useMemo(() => buildYears(loads).map((y) => ({ value: String(y), label: String(y) === String(now.year()) ? `${y} (Current)` : String(y) })), [loads]);
  const monthOptions = useMemo(() => buildMonths(loads).map((m) => ({ value: m, label: dayjs(m + '-01').format('MM/YYYY') + (m === now.format('YYYY-MM') ? ' (Current)' : '') })), [loads]);
  const weekOptions = useMemo(() => buildWeeks(loads).map((w) => ({ value: w, label: weekLabel(w) })), [loads]);
  const dayOptions = useMemo(() => {
    const days = new Set([now.format('YYYY-MM-DD')]);
    for (const l of loads) {
      const d = l.delivery_date || l.pickup_date;
      if (d) days.add(dayjs(d).format('YYYY-MM-DD'));
    }
    return [...days].sort((a, b) => b.localeCompare(a)).slice(0, 60).map((d) => ({
      value: d,
      label: dayjs(d).format('MM/DD/YYYY') + (d === now.format('YYYY-MM-DD') ? ' (Today)' : ''),
    }));
  }, [loads]);

  // Earnings filtered by each selected period
  const earn = (filteredLoads) =>
    filteredLoads.reduce((s, l) => s + calculateEarnings(l, settings), 0);

  const todayLoads = loads.filter((l) => {
    const d = l.delivery_date || l.pickup_date;
    return d && dayjs(d).format('YYYY-MM-DD') === selectedDay;
  });
  const weekLoads = loads.filter((l) => {
    const d = l.delivery_date || l.pickup_date;
    return d && dayjs(d).startOf('isoWeek').format('YYYY-MM-DD') === selectedWeek;
  });
  const monthLoads = loads.filter((l) => {
    const d = l.delivery_date || l.pickup_date;
    return d && dayjs(d).format('YYYY-MM') === selectedMonth;
  });
  const yearLoads = loads.filter((l) => {
    const d = l.delivery_date || l.pickup_date;
    return d && dayjs(d).format('YYYY') === selectedYear;
  });

  const todayEarnings = earn(todayLoads);
  const weekEarnings = earn(weekLoads);
  const monthEarnings = earn(monthLoads);
  const yearEarnings = earn(yearLoads);

  const metrics = calculateMetrics(loads, expenses, settings);

  const rpmLoads = rpmPeriod === 'all' ? loads : loads.filter((l) => {
    const d = l.delivery_date || l.pickup_date;
    if (!d) return false;
    const date = dayjs(d);
    if (rpmPeriod === 'thisWeek') return date.startOf('isoWeek').format('YYYY-MM-DD') === now.startOf('isoWeek').format('YYYY-MM-DD');
    if (rpmPeriod === 'thisMonth') return date.format('YYYY-MM') === now.format('YYYY-MM');
    if (rpmPeriod === 'thisYear') return date.format('YYYY') === String(now.year());
    return true;
  });
  const rpmMiles = rpmLoads.reduce((s, l) => s + (l.loaded_miles || 0), 0);
  const rpmEarnings = rpmLoads.reduce((s, l) => s + calculateEarnings(l, settings), 0);
  const avgRpm = rpmMiles > 0 ? rpmEarnings / rpmMiles : 0;

  // Helper: filter loads by a 'type:value' period string
  function filterByPeriodKey(list, periodKey) {
    if (periodKey === 'all') return list;
    const [type, val] = periodKey.split(':');
    return list.filter((l) => {
      const d = l.delivery_date || l.pickup_date;
      if (!d) return false;
      const date = dayjs(d);
      if (type === 'year') return date.format('YYYY') === val;
      if (type === 'month') return date.format('YYYY-MM') === val;
      if (type === 'week') return date.startOf('isoWeek').format('YYYY-MM-DD') === val;
      if (type === 'day') return date.format('YYYY-MM-DD') === val;
      return true;
    });
  }

  // Build unified option list for Miles/Trips selectors
  const periodOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'All Time' }];
    yearOptions.forEach((y) => opts.push({ value: `year:${y.value}`, label: y.value === String(now.year()) ? `${y.value} (Year)` : y.value }));
    monthOptions.forEach((m) => opts.push({ value: `month:${m.value}`, label: dayjs(m.value + '-01').format('MM/YYYY') }));
    weekOptions.forEach((w) => opts.push({ value: `week:${w.value}`, label: `Wk ${dayjs(w.value).format('MM/DD')}` }));
    dayOptions.slice(0, 30).forEach((d) => opts.push({ value: `day:${d.value}`, label: dayjs(d.value).format('MM/DD/YYYY') }));
    return opts;
  }, [yearOptions, monthOptions, weekOptions, dayOptions]);

  const milesLoads = filterByPeriodKey(loads, milesPeriod);
  const tripsLoads = filterByPeriodKey(loads, tripsPeriod);
  const totalMilesFiltered = milesLoads.reduce((s, l) => s + (l.loaded_miles || 0), 0);
  const totalTripsFiltered = tripsLoads.length;

  if (loadsLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-6">
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
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your trucking income at a glance</p>
      </div>

      {/* Row 1: Time-based earnings with period selectors */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Today */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">Daily</p>
                <PeriodSelect value={selectedDay} onChange={setSelectedDay} options={dayOptions} />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(todayEarnings)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{todayLoads.length} load{todayLoads.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-lg p-2 bg-primary-50 dark:bg-slate-700 ml-2 shrink-0">
              <Calendar className="h-5 w-5 text-primary-800 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">Weekly</p>
                <PeriodSelect value={selectedWeek} onChange={setSelectedWeek} options={weekOptions} />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(weekEarnings)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{weekLoads.length} load{weekLoads.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-lg p-2 bg-primary-50 dark:bg-slate-700 ml-2 shrink-0">
              <Calendar className="h-5 w-5 text-primary-800 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">Monthly</p>
                <PeriodSelect value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(monthEarnings)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{monthLoads.length} load{monthLoads.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-lg p-2 bg-primary-50 dark:bg-slate-700 ml-2 shrink-0">
              <DollarSign className="h-5 w-5 text-primary-800 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* This Year */}
        <div className="rounded-xl border border-slate-200 bg-blue-700 p-5 shadow-sm dark:bg-blue-800">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium uppercase tracking-wider text-blue-200 shrink-0">Yearly ⚡</p>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-5 text-xs px-1.5 w-auto min-w-[90px] shrink-0 bg-blue-600/50 border-blue-500 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                {formatCurrency(yearEarnings)}
              </p>
              <p className="text-xs text-blue-200 mt-0.5">{yearLoads.length} load{yearLoads.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-lg p-2 bg-blue-600/50 ml-2 shrink-0">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Performance metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Miles */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">Total Miles</p>
                <PeriodSelect value={milesPeriod} onChange={setMilesPeriod} options={periodOptions} />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatMiles(totalMilesFiltered)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{milesLoads.length} load{milesLoads.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-lg p-2 bg-primary-50 dark:bg-slate-700 ml-2 shrink-0">
              <Route className="h-5 w-5 text-primary-800 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Total Trips */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">Total Trips</p>
                <PeriodSelect value={tripsPeriod} onChange={setTripsPeriod} options={periodOptions} />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {totalTripsFiltered.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{milesPeriod === tripsPeriod && milesPeriod !== 'all' ? '' : ''}&nbsp;</p>
            </div>
            <div className="rounded-lg p-2 bg-primary-50 dark:bg-slate-700 ml-2 shrink-0">
              <Truck className="h-5 w-5 text-primary-800 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Avg $/Mile — existing period selector */}
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

        <StatCard icon={DollarSign} label="Avg $/Trip" value={formatCurrency(metrics.avgPerTrip)} />
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
