#!/usr/bin/env node
/**
 * Converts loads exported from Firestore (old format) to TruckFlow (Base44) import format.
 *
 * Usage: node scripts/convert-loads.js [input] [output]
 *   input  - path to source JSON file (default: loads_2025-05-01_to_2026-01-31_2026-02-22.json)
 *   output - path to output file (default: truckflow-import.json)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Full US state name → 2-letter abbreviation
const STATE_NAME_TO_CODE = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY', 'district of columbia': 'DC',
};

// Valid 2-letter state codes (for quick lookup)
const VALID_STATE_CODES = new Set(Object.values(STATE_NAME_TO_CODE));

/**
 * Normalise a raw state token to a 2-letter uppercase code.
 * Returns '' when the token cannot be resolved.
 */
function resolveState(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Already a 2-letter code (case-insensitive)
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    const upper = trimmed.toUpperCase();
    return VALID_STATE_CODES.has(upper) ? upper : '';
  }

  // Full state name lookup (case-insensitive)
  const lower = trimmed.toLowerCase();
  if (STATE_NAME_TO_CODE[lower]) return STATE_NAME_TO_CODE[lower];

  return '';
}

/**
 * Parse "City, State" or "City State" strings into { city, state }.
 * Handles:
 *   - "Rittmann, oh"
 *   - "Melrose Park, Illinois"
 *   - "ALBUQUERQUE, New Mexico"
 *   - "Bolingbrook IL"   (space-separated, no comma)
 *   - "Arrey, NM 87930"  (zip after state abbr)
 *   - "St. George, UT, 84790" (extra comma + zip)
 *   - "WINDSOR , CO"     (space before comma)
 */
function parseCityState(raw) {
  if (!raw) return { city: '', state: '' };

  // Remove trailing ZIP (5-digit or ZIP+4) and any surrounding whitespace/commas
  let cleaned = raw.trim().replace(/[,\s]+\d{5}(-\d{4})?$/, '').trim();

  // Try comma-separated first
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    const city = parts[0].trim();

    // Take the first non-empty part after the city as the state candidate
    // (handles "St. George, UT, 84790" after zip removal → "St. George, UT")
    let stateRaw = '';
    for (let i = 1; i < parts.length; i++) {
      const candidate = parts[i].trim();
      if (candidate) { stateRaw = candidate; break; }
    }
    const state = resolveState(stateRaw);
    return { city, state };
  }

  // No comma — try space-separated: last token is the state
  const tokens = cleaned.split(/\s+/);
  if (tokens.length >= 2) {
    const possibleState = tokens[tokens.length - 1];
    const state = resolveState(possibleState);
    if (state) {
      const city = tokens.slice(0, tokens.length - 1).join(' ');
      return { city, state };
    }
  }

  // Cannot split — return the whole string as city
  return { city: cleaned, state: '' };
}

/**
 * Convert a single Firestore load record to TruckFlow load format.
 */
function convertLoad(load) {
  const { city: pickupCity, state: pickupState } = parseCityState(load.origin);
  const { city: deliveryCity, state: deliveryState } = parseCityState(load.destination);

  return {
    load_id: load.loadId || '',
    broker_name: load.broker || '',
    pickup_city: pickupCity,
    pickup_state: pickupState,
    delivery_city: deliveryCity,
    delivery_state: deliveryState,
    pickup_date: load.puDate || '',
    delivery_date: load.doDate || '',
    loaded_miles: load.miles != null ? load.miles : 0,
    deadhead_miles: load.deadhead != null ? load.deadhead : 0,
    gross_amount: load.amount != null ? load.amount : 0,
    notes: load.notes || '',
    status: 'Delivered',
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const repoRoot = path.resolve(__dirname, '..');
const inputFile = process.argv[2] || path.join(repoRoot, 'loads_2025-05-01_to_2026-01-31_2026-02-22.json');
const outputFile = process.argv[3] || path.join(repoRoot, 'truckflow-import.json');

const source = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const rawLoads = source.loads || source;

if (!Array.isArray(rawLoads)) {
  console.error('ERROR: Could not find a "loads" array in the input file.');
  process.exit(1);
}

const convertedLoads = rawLoads.map(convertLoad);

const output = {
  version: '1.0',
  exportDate: new Date().toISOString(),
  loads: convertedLoads,
  expenses: [],
  settings: {},
};

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');

console.log(`Converted ${convertedLoads.length} loads → ${outputFile}`);

// Warn about any loads where state could not be resolved
convertedLoads.forEach((l, i) => {
  if (!l.pickup_state) console.warn(`  [${i}] pickup_state empty  (origin:  ${rawLoads[i].origin})`);
  if (!l.delivery_state) console.warn(`  [${i}] delivery_state empty (destination: ${rawLoads[i].destination})`);
});
