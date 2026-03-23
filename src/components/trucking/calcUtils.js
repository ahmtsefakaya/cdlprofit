import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

/**
 * Calculate earnings for a single load.
 *
 * Uses ONLY the load's own earning snapshot — global settings never override.
 * Loads without an earning_profile simply return their gross_amount.
 */
export function calculateEarnings(load, settings) {
  // Only use the load's own earning snapshot — no global fallback
  const profile = load?.earning_profile
    ? {
      earning_profile: load.earning_profile,
      rate_per_mile: load.rate_per_mile ?? 0,
      percentage_rate: load.percentage_rate ?? 0,
    }
    : null;

  if (!profile) return load?.gross_amount || 0;
  const { earning_profile, rate_per_mile, percentage_rate } = profile;

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
 * Gross RPM: gross_amount ÷ (loaded_miles + deadhead_miles)
 */
export function calculateGrossRPM(load) {
  const gross = load?.gross_amount || 0;
  const totalMiles = (load?.loaded_miles || 0) + (load?.deadhead_miles || 0);
  return totalMiles > 0 ? gross / totalMiles : 0;
}

/**
 * My $/Mi: earning ÷ (loaded_miles + deadhead_miles)
 */
export function calculateMyPerMile(load, settings) {
  const earning = calculateEarnings(load, settings);
  const totalMiles = (load?.loaded_miles || 0) + (load?.deadhead_miles || 0);
  return totalMiles > 0 ? earning / totalMiles : 0;
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
    const dateVal = load.delivery_date || load.pickup_date;
    if (!dateVal) continue;
    const key = dayjs(dateVal).format('YYYY-MM');
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
    const dateVal = load.delivery_date || load.pickup_date;
    if (!dateVal) continue;
    const key = dayjs(dateVal).format('YYYY');
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
    const dateVal = load.delivery_date || load.pickup_date;
    if (!dateVal) continue;
    const key = dayjs(dateVal).startOf('isoWeek').format('YYYY-MM-DD');
    map[key] = (map[key] || 0) + calculateEarnings(load, settings);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, value]) => ({ week, value }));
}

/**
 * Filter loads by time period: today, thisWeek, thisMonth, thisYear
 * dateField: field name to use for date comparison (default: 'pickup_date')
 */
export function filterByPeriod(loads, period, dateField = 'pickup_date') {
  const now = dayjs();
  return loads.filter((load) => {
    const date = dayjs(load[dateField] || load.pickup_date);
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
