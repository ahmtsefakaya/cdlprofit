import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useSettings } from '../components/trucking/useSettings';
import {
  calculateEarnings, revenueByBroker, revenueByMonth, revenueByWeek, revenueByYear,
  formatCurrency,
} from '../components/trucking/calcUtils';
import Load from '../api/entities/Load';

const COLORS = ['#1e3a5f', '#3b82f6', '#0ea5e9', '#06b6d4', '#6366f1', '#8b5cf6', '#ec4899'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-sm font-bold" style={{ color: p.color }}>
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { settings } = useSettings();
  const [timeframe, setTimeframe] = useState('monthly');

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: () => Load.list(),
  });

  // KPI calculations
  const totalRevenue = loads.reduce((s, l) => s + calculateEarnings(l, settings), 0);

  // Current vs previous period (month)
  const now = moment();
  const currentMonthLoads = loads.filter((l) => moment(l.pickup_date).isSame(now, 'month'));
  const prevMonthLoads = loads.filter((l) => moment(l.pickup_date).isSame(now.clone().subtract(1, 'month'), 'month'));
  const currentMonthRevenue = currentMonthLoads.reduce((s, l) => s + calculateEarnings(l, settings), 0);
  const prevMonthRevenue = prevMonthLoads.reduce((s, l) => s + calculateEarnings(l, settings), 0);
  const periodChange = prevMonthRevenue > 0
    ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
    : 0;

  // Top broker
  const brokerData = revenueByBroker(loads, settings);
  const topBroker = brokerData[0] || null;
  const topBrokerPct = totalRevenue > 0 && topBroker ? (topBroker.value / totalRevenue) * 100 : 0;

  // Chart data based on timeframe
  const getChartData = () => {
    if (timeframe === 'daily') {
      const map = {};
      for (const l of loads) {
        if (!l.pickup_date) continue;
        const key = moment(l.pickup_date).format('YYYY-MM-DD');
        map[key] = (map[key] || 0) + calculateEarnings(l, settings);
      }
      return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date: moment(date).format('MM/DD/YY'), value }));
    }
    if (timeframe === 'weekly') {
      return revenueByWeek(loads, settings).map(({ week, value }) => ({
        date: moment(week).format('MMM D'),
        value,
      }));
    }
    return revenueByMonth(loads, settings).map(({ month, value }) => ({
      date: moment(month, 'YYYY-MM').format('MMM YYYY'),
      value,
    }));
  };

  const chartData = getChartData();

  // Cumulative data
  let cumulative = 0;
  const cumulativeData = chartData.map(({ date, value }) => {
    cumulative += value;
    return { date, value: cumulative };
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Revenue insights and trends</p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Current Period */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">This Month</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(currentMonthRevenue)}</p>
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${periodChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {periodChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(periodChange).toFixed(1)}% vs last month
            </div>
          </CardContent>
        </Card>

        {/* Lifetime */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Lifetime Revenue</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{loads.length} total loads</p>
          </CardContent>
        </Card>

        {/* Top Broker */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Top Broker</p>
            {topBroker ? (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{topBroker.name}</p>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {formatCurrency(topBroker.value)} · {topBrokerPct.toFixed(1)}% of revenue
                </p>
              </>
            ) : (
              <p className="mt-2 text-slate-400 text-sm">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="dark:text-white">Revenue Charts</CardTitle>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="trend">
            <TabsList className="mb-6">
              <TabsTrigger value="trend">Earnings Trend</TabsTrigger>
              <TabsTrigger value="broker">Broker Distribution</TabsTrigger>
              <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
            </TabsList>

            {/* Earnings Trend */}
            <TabsContent value="trend">
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="value" stroke="#1e3a5f" strokeWidth={2.5} dot={{ r: 3, fill: '#1e3a5f' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </TabsContent>

            {/* Broker Pie */}
            <TabsContent value="broker">
              {brokerData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={brokerData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={true}
                    >
                      {brokerData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </TabsContent>

            {/* Cumulative Area */}
            <TabsContent value="cumulative">
              {cumulativeData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={cumulativeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" stroke="#1e3a5f" strokeWidth={2.5} fill="url(#earningsGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
