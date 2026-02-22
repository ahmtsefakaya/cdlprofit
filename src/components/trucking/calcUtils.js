import moment from 'moment';

/**
 * Calculate earnings for a single load based on earning profile settings
 */
export function calculateEarnings(load, settings) {
  if (!settings) return load.gross_amount || 0;
  const { earning_profile, rate_per_mile, percentage_rate } = settings;

  switch (earning_profile) {
    case 'owner_operator':
      if (percentage_rate && percentage_rate > 0 && percentage_rate < 100) {
        return (load.gross_amount || 0) * (percentage_rate / 100);
      }
      return load.gross_amount || 0;
    case 'solo_per_mile':
    case 'team_per_mile':
      return (load.loaded_miles || 0) * (rate_per_mile || 0);
    case 'solo_percentage':
    case 'team_percentage':
      return (load.gross_amount || 0) * ((percentage_rate || 0) / 100);
    default:
      return load.gross_amount || 0;
  }
}

/**
 * Calculate aggregate metrics from loads and expenses arrays
 */
export function calculateMetrics(loads, expenses, settings) {
  const totalEarnings = loads.reduce((sum, l) => sum + calculateEarnings(l, settings), 0);
  const totalExpenses = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalMiles = loads.reduce((sum, l) => sum + (l.loaded_miles || 0), 0);
  const totalDeadhead = loads.reduce((sum, l) => sum + (l.deadhead_miles || 0), 0);
  const totalTrips = loads.length;

  return {
    totalEarnings,
    totalExpenses,
    netRevenue: totalEarnings - totalExpenses,
    totalMiles,
    totalDeadhead,
    totalTrips,
    avgPerMile: totalMiles > 0 ? totalEarnings / totalMiles : 0,
    avgPerTrip: totalTrips > 0 ? totalEarnings / totalTrips : 0,
    deadheadRatio:
      totalMiles + totalDeadhead > 0
        ? (totalDeadhead / (totalMiles + totalDeadhead)) * 100
        : 0,
  };
}

/**
 * Revenue grouped by broker name
 */
export function revenueByBroker(loads, settings) {
  const map = {};
  for (const load of loads) {
    const broker = load.broker_name || 'Unknown';
    map[broker] = (map[broker] || 0) + calculateEarnings(load, settings);
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Revenue grouped by month (YYYY-MM format)
 */
export function revenueByMonth(loads, settings) {
  const map = {};
  for (const load of loads) {
    if (!load.pickup_date) continue;
    const key = moment(load.pickup_date).format('YYYY-MM');
    map[key] = (map[key] || 0) + calculateEarnings(load, settings);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }));
}

/**
 * Revenue grouped by year
 */
export function revenueByYear(loads, settings) {
  const map = {};
  for (const load of loads) {
    if (!load.pickup_date) continue;
    const key = moment(load.pickup_date).format('YYYY');
    map[key] = (map[key] || 0) + calculateEarnings(load, settings);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, value]) => ({ year, value }));
}

/**
 * Revenue grouped by week (week start in YYYY-MM-DD format)
 */
export function revenueByWeek(loads, settings) {
  const map = {};
  for (const load of loads) {
    if (!load.pickup_date) continue;
    const key = moment(load.pickup_date).startOf('isoWeek').format('YYYY-MM-DD');
    map[key] = (map[key] || 0) + calculateEarnings(load, settings);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, value]) => ({ week, value }));
}

/**
 * Filter loads by time period: today, thisWeek, thisMonth, thisYear
 */
export function filterByPeriod(loads, period) {
  const now = moment();
  return loads.filter((load) => {
    const date = moment(load.pickup_date);
    switch (period) {
      case 'today':
        return date.isSame(now, 'day');
      case 'thisWeek':
        return date.isSame(now, 'isoWeek');
      case 'thisMonth':
        return date.isSame(now, 'month');
      case 'thisYear':
        return date.isSame(now, 'year');
      default:
        return true;
    }
  });
}

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format miles with comma separators
 */
export function formatMiles(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}
