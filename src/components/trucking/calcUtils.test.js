import { describe, it, expect } from 'vitest';
import {
    calculateEarnings,
    calculateGrossRPM,
    calculateMyPerMile,
    calculateMetrics,
    filterByPeriod,
    revenueByBroker,
    revenueByMonth,
    formatCurrency,
    formatMiles,
} from './calcUtils';

// ── calculateEarnings ──────────────────────────────────────────────

describe('calculateEarnings', () => {
    const baseLoad = { gross_amount: 2000, loaded_miles: 500 };

    it('returns gross_amount when no settings provided', () => {
        expect(calculateEarnings(baseLoad, null)).toBe(2000);
        expect(calculateEarnings(baseLoad, undefined)).toBe(2000);
    });

    it('returns gross_amount when load has no earning_profile (ignores global settings)', () => {
        const globalSettings = { earning_profile: 'solo_per_mile', rate_per_mile: 0.65 };
        expect(calculateEarnings(baseLoad, globalSettings)).toBe(2000);
    });

    it('owner_operator: returns full gross when percentage_rate is 0 or absent', () => {
        const load = { ...baseLoad, earning_profile: 'owner_operator' };
        expect(calculateEarnings(load, null)).toBe(2000);
        const load2 = { ...baseLoad, earning_profile: 'owner_operator', percentage_rate: 0 };
        expect(calculateEarnings(load2, null)).toBe(2000);
    });

    it('owner_operator: applies percentage_rate from load snapshot', () => {
        const load = { ...baseLoad, earning_profile: 'owner_operator', percentage_rate: 80 };
        expect(calculateEarnings(load, null)).toBeCloseTo(1600);
    });

    it('solo_per_mile: calculates loaded_miles × rate_per_mile from load snapshot', () => {
        const load = { ...baseLoad, earning_profile: 'solo_per_mile', rate_per_mile: 0.65 };
        expect(calculateEarnings(load, null)).toBeCloseTo(325);
    });

    it('team_per_mile: calculates loaded_miles × rate_per_mile from load snapshot', () => {
        const load = { ...baseLoad, earning_profile: 'team_per_mile', rate_per_mile: 0.40 };
        expect(calculateEarnings(load, null)).toBeCloseTo(200);
    });

    it('solo_percentage: calculates gross × percentage_rate/100 from load snapshot', () => {
        const load = { ...baseLoad, earning_profile: 'solo_percentage', percentage_rate: 33 };
        expect(calculateEarnings(load, null)).toBeCloseTo(660);
    });

    it('team_percentage: calculates gross × percentage_rate/100 from load snapshot', () => {
        const load = { ...baseLoad, earning_profile: 'team_percentage', percentage_rate: 25 };
        expect(calculateEarnings(load, null)).toBeCloseTo(500);
    });

    it('handles missing load fields gracefully', () => {
        expect(calculateEarnings({}, null)).toBe(0);
        const load = { earning_profile: 'solo_per_mile', rate_per_mile: 0.50 };
        expect(calculateEarnings(load, null)).toBe(0);
    });
});

// ── calculateGrossRPM ─────────────────────────────────────────────

describe('calculateGrossRPM', () => {
    it('returns gross / (loaded + deadhead)', () => {
        const load = { gross_amount: 2000, loaded_miles: 400, deadhead_miles: 100 };
        // 2000 / 500 = 4.0
        expect(calculateGrossRPM(load)).toBeCloseTo(4.0);
    });

    it('returns 0 when total miles is 0', () => {
        const load = { gross_amount: 2000, loaded_miles: 0, deadhead_miles: 0 };
        expect(calculateGrossRPM(load)).toBe(0);
    });

    it('includes deadhead in calculation', () => {
        const load = { gross_amount: 1000, loaded_miles: 300, deadhead_miles: 200 };
        // 1000 / 500 = 2.0
        expect(calculateGrossRPM(load)).toBeCloseTo(2.0);
    });
});

// ── calculateMyPerMile ────────────────────────────────────────────

describe('calculateMyPerMile', () => {
    it('returns earning / (loaded + deadhead)', () => {
        const load = { gross_amount: 2000, loaded_miles: 400, deadhead_miles: 100, earning_profile: 'solo_percentage', percentage_rate: 33 };
        // earning = 2000 * 0.33 = 660, total miles = 500, 660/500 = 1.32
        expect(calculateMyPerMile(load, null)).toBeCloseTo(1.32);
    });

    it('returns 0 when total miles is 0', () => {
        const load = { gross_amount: 2000, loaded_miles: 0, deadhead_miles: 0 };
        expect(calculateMyPerMile(load, null)).toBe(0);
    });

    it('without earning_profile uses gross as earning', () => {
        const load = { gross_amount: 2000, loaded_miles: 400, deadhead_miles: 100 };
        // 2000 / 500 = 4.0
        expect(calculateMyPerMile(load, null)).toBeCloseTo(4.0);
    });
});

// ── calculateMetrics ───────────────────────────────────────────────

describe('calculateMetrics', () => {
    const loads = [
        { gross_amount: 1000, loaded_miles: 400, deadhead_miles: 100 },
        { gross_amount: 1500, loaded_miles: 600, deadhead_miles: 50 },
    ];
    const expenses = [{ amount: 200 }, { amount: 100 }];
    const settings = null; // uses gross_amount as earnings

    it('computes correct totals', () => {
        const m = calculateMetrics(loads, expenses, settings);
        expect(m.totalEarnings).toBe(2500);
        expect(m.totalExpenses).toBe(300);
        expect(m.netRevenue).toBe(2200);
        expect(m.totalMiles).toBe(1000);
        expect(m.totalDeadhead).toBe(150);
        expect(m.totalTrips).toBe(2);
    });

    it('computes correct averages', () => {
        const m = calculateMetrics(loads, expenses, settings);
        expect(m.avgPerMile).toBeCloseTo(2.5);
        expect(m.avgPerTrip).toBeCloseTo(1250);
    });

    it('computes deadhead ratio correctly', () => {
        const m = calculateMetrics(loads, expenses, settings);
        // deadhead / (miles + deadhead) * 100 = 150 / 1150 * 100 ≈ 13.04
        expect(m.deadheadRatio).toBeCloseTo(13.04, 1);
    });

    it('handles empty inputs', () => {
        const m = calculateMetrics([], [], null);
        expect(m.totalEarnings).toBe(0);
        expect(m.avgPerMile).toBe(0);
        expect(m.avgPerTrip).toBe(0);
        expect(m.deadheadRatio).toBe(0);
    });

    it('handles null expenses', () => {
        const m = calculateMetrics(loads, null, settings);
        expect(m.totalExpenses).toBe(0);
        expect(m.netRevenue).toBe(2500);
    });
});

// ── filterByPeriod ─────────────────────────────────────────────────

describe('filterByPeriod', () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const loads = [
        { pickup_date: today, gross_amount: 100 },
        { pickup_date: '2020-01-15', gross_amount: 200 },
    ];

    it('returns all loads when period is "all" or unknown', () => {
        expect(filterByPeriod(loads, 'all')).toHaveLength(2);
        expect(filterByPeriod(loads, 'unknown')).toHaveLength(2);
    });

    it('filters today', () => {
        const result = filterByPeriod(loads, 'today');
        expect(result).toHaveLength(1);
        expect(result[0].gross_amount).toBe(100);
    });

    it('filters thisYear', () => {
        const result = filterByPeriod(loads, 'thisYear');
        // The 2020 load should not match current year
        expect(result).toHaveLength(1);
        expect(result[0].pickup_date).toBe(today);
    });
});

// ── revenueByBroker ────────────────────────────────────────────────

describe('revenueByBroker', () => {
    const loads = [
        { broker_name: 'Alpha', gross_amount: 1000 },
        { broker_name: 'Beta', gross_amount: 500 },
        { broker_name: 'Alpha', gross_amount: 1500 },
        { gross_amount: 200 }, // no broker → grouped as "Unknown"
    ];

    it('groups by broker and sorts descending', () => {
        const result = revenueByBroker(loads, null);
        expect(result[0]).toEqual({ name: 'Alpha', value: 2500 });
        expect(result[1]).toEqual({ name: 'Beta', value: 500 });
        expect(result[2]).toEqual({ name: 'Unknown', value: 200 });
    });
});

// ── revenueByMonth ─────────────────────────────────────────────────

describe('revenueByMonth', () => {
    const loads = [
        { delivery_date: '2025-03-10', gross_amount: 1000 },
        { delivery_date: '2025-03-20', gross_amount: 500 },
        { delivery_date: '2025-04-05', gross_amount: 800 },
    ];

    it('groups by YYYY-MM and sorts chronologically', () => {
        const result = revenueByMonth(loads, null);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ month: '2025-03', value: 1500 });
        expect(result[1]).toEqual({ month: '2025-04', value: 800 });
    });
});

// ── formatCurrency ─────────────────────────────────────────────────

describe('formatCurrency', () => {
    it('formats positive numbers', () => {
        expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('handles zero', () => {
        expect(formatCurrency(0)).toBe('$0.00');
    });

    it('handles null/undefined/NaN', () => {
        expect(formatCurrency(null)).toBe('$0.00');
        expect(formatCurrency(undefined)).toBe('$0.00');
        expect(formatCurrency(NaN)).toBe('$0.00');
    });
});

// ── formatMiles ────────────────────────────────────────────────────

describe('formatMiles', () => {
    it('formats with comma separators', () => {
        expect(formatMiles(1234)).toBe('1,234');
    });

    it('rounds to nearest integer', () => {
        expect(formatMiles(1234.7)).toBe('1,235');
    });

    it('handles null/undefined/NaN', () => {
        expect(formatMiles(null)).toBe('0');
        expect(formatMiles(undefined)).toBe('0');
        expect(formatMiles(NaN)).toBe('0');
    });
});
