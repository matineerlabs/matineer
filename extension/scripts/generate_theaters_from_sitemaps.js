/**
 * Generate amc_theaters.json catalog from AMC's official public XML sitemaps
 * including addresses, geocodes, and Google Maps links.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_CODES = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new-hampshire': 'NH', 'new-jersey': 'NJ',
  'new-mexico': 'NM', 'new-york': 'NY', 'north-carolina': 'NC', 'north-dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode-island': 'RI', 'south-carolina': 'SC',
  'south-dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west-virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district-of-columbia': 'DC'
};

const ABBR_TO_STATE = Object.fromEntries(
  Object.entries(STATE_CODES).map(([st, abbr]) => [abbr.toLowerCase(), st])
);
ABBR_TO_STATE['d-c'] = 'district-of-columbia';
ABBR_TO_STATE['dc'] = 'district-of-columbia';

const EXPLICIT_METRO_TO_STATE = {
  'binghamton': 'new-york',
  'brownsville': 'texas',
  'buffalo': 'new-york',
  'cincinnati': 'ohio',
  'dallas-ft-worth': 'texas',
  'detroit': 'michigan',
  'fort-myers': 'florida',
  'gary': 'indiana',
  'grand-rapids': 'michigan',
  'hartford-new-haven': 'connecticut',
  'lake-delton': 'wisconsin',
  'madison': 'wisconsin',
  'miami-ft-lauderdale': 'florida',
  'milwaukee': 'wisconsin',
  'minneapolis-st-paul': 'minnesota',
  'muncie-richmond': 'indiana',
  'new-orleans': 'louisiana',
  'new-york-city': 'new-york',
  'norfolk': 'virginia',
  'oakland': 'california',
  'orlando-daytona-beach': 'florida',
  'pensacola-mobile': 'florida',
  'raleigh-durham': 'north-carolina',
  'rochester': 'new-york',
  'salt-lake-city': 'utah',
  'seattle-tacoma': 'washington',
  'st-louis': 'missouri',
  'tampa-st-petersburg': 'florida',
  'west-palm-beach': 'florida',
  'washington-d-c': 'district-of-columbia',
};

function formatSlug(slug) {
  if (slug === 'amc-9-co-10') return 'AMC 9+CO 10';
  const words = slug.split('-');
  const res = [];
  for (const w of words) {
    const wLow = w.toLowerCase();
    if (wLow === 'amc') res.push('AMC');
    else if (wLow === 'imax') res.push('IMAX');
    else if (wLow === 'dine') res.push('DINE-IN');
    else if (wLow === 'in' && res.length && res[res.length - 1] === 'DINE-IN') continue;
    else if (/^\d+$/.test(w)) res.push(w);
    else res.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  return res.join(' ');
}

class WafOrTransientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WafOrTransientError';
  }
}

function parseArgs(argv) {
  const args = { softFailWaf: false, summaryFile: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--soft-fail-waf') {
      args.softFailWaf = true;
    } else if (arg.startsWith('--summary-file=')) {
      args.summaryFile = arg.slice('--summary-file='.length);
    } else if (arg === '--summary-file' && argv[i + 1]) {
      args.summaryFile = argv[++i];
    }
  }
  return args;
}

function appendStepSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    fs.appendFileSync(summaryPath, `${markdown}\n`, 'utf-8');
  }
}

async function fetchXml(url) {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
  const res = await fetch(url, { headers });
  if (res.status === 403 || res.status === 429 || res.status >= 500) {
    throw new WafOrTransientError(`HTTP ${res.status} fetching ${url}`);
  }
  if (!res.ok) throw new Error(`HTTP error ${res.status} fetching ${url}`);
  const text = await res.text();
  if (!text.includes('<urlset') || !text.includes('<loc>')) {
    throw new WafOrTransientError(`Non-XML or challenge response received from ${url}`);
  }
  return text;
}

function loadExistingCatalog(outPath) {
  if (!fs.existsSync(outPath)) {
    return { existingById: new Map(), existingCityToState: {} };
  }
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    const existingById = new Map();
    const existingCityToState = {};
    for (const item of existing) {
      if (item?.id) existingById.set(item.id, item);
      if (item?.city_slug && item?.state_code && item.state !== 'Unknown') {
        const st = ABBR_TO_STATE[item.state_code.toLowerCase()];
        if (st) existingCityToState[item.city_slug] = st;
      }
    }
    return { existingById, existingCityToState };
  } catch {
    return { existingById: new Map(), existingCityToState: {} };
  }
}

function buildDiffSummary(existingById, records) {
  const nextById = new Map(records.map(r => [r.id, r]));
  const added = [];
  const removed = [];
  const updated = [];
  const unknownStates = records.filter(r => r.state === 'Unknown');

  for (const r of records) {
    const prev = existingById.get(r.id);
    if (!prev) {
      added.push(r);
    } else if (JSON.stringify(prev) !== JSON.stringify(r)) {
      updated.push({ prev, next: r });
    }
  }
  for (const [id, prev] of existingById.entries()) {
    if (!nextById.has(id)) {
      removed.push(prev);
    }
  }

  const lines = [
    '### AMC Theater Catalog Sync',
    '',
    `- **Total theaters:** ${records.length}`,
    `- **Added:** ${added.length}`,
    `- **Removed:** ${removed.length}`,
    `- **Updated:** ${updated.length}`,
    `- **Unknown state entries:** ${unknownStates.length}`,
  ];

  if (added.length > 0) {
    lines.push('', '#### Added', ...added.slice(0, 25).map(r => `- ${r.name} (${r.city || r.city_slug}, ${r.state_code}) [\`${r.id}\`]`));
    if (added.length > 25) lines.push(`- ...and ${added.length - 25} more`);
  }
  if (removed.length > 0) {
    lines.push('', '#### Removed', ...removed.slice(0, 25).map(r => `- ${r.name} (${r.city || r.city_slug}, ${r.state_code}) [\`${r.id}\`]`));
    if (removed.length > 25) lines.push(`- ...and ${removed.length - 25} more`);
  }
  if (updated.length > 0) {
    lines.push('', '#### Updated', ...updated.slice(0, 25).map(({ next }) => `- ${next.name} (${next.city || next.city_slug}, ${next.state_code}) [\`${next.id}\`]`));
    if (updated.length > 25) lines.push(`- ...and ${updated.length - 25} more`);
  }
  if (unknownStates.length > 0) {
    lines.push('', '#### ⚠️ Unknown States (add to `EXPLICIT_METRO_TO_STATE` if needed)', ...unknownStates.map(r => `- ${r.name} (\`${r.city_slug}\` / \`${r.id}\`)`));
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outPath = path.resolve(__dirname, '../src/shared/data/amc_theaters.json');
  const { existingById, existingCityToState } = loadExistingCatalog(outPath);

  console.log('Fetching cities sitemap...');
  const citiesXml = await fetchXml('https://www.amctheatres.com/sitemaps/sitemap-cities.xml');

  const cityToState = {};
  const cityLocRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
  let match;
  while ((match = cityLocRegex.exec(citiesXml)) !== null) {
    const url = match[1];
    const m = url.match(/\/movie-theatres\/states\/([^/]+)\/([^/]+)/);
    if (m) {
      const [, st, c] = m;
      cityToState[c] = st;
    }
  }

  console.log('Fetching theatres sitemap...');
  const theatresXml = await fetchXml('https://www.amctheatres.com/sitemaps/sitemap-theatres.xml');

  const urlBlockRegex = /<url>([\s\S]*?)<\/url>/g;
  const parsedEntries = [];
  const siblingCityToState = {};

  while ((match = urlBlockRegex.exec(theatresXml)) !== null) {
    const block = match[1];
    const locMatch = block.match(/<loc>(https?:\/\/[^<]+)<\/loc>/);
    if (!locMatch) continue;

    const u = locMatch[1];
    const m = u.match(/\/movie-theatres\/([^/]+)\/([^/]+)/);
    if (!m) continue;

    const [, cSlug, tSlug] = m;

    // Extract PageMap attributes
    const attrs = {};
    const attrRegex = /<Attribute\s+name="([^"]+)">([^<]*)<\/Attribute>/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(block)) !== null) {
      const [, name, val] = attrMatch;
      if (name && val) {
        attrs[name] = val.trim();
      }
    }

    if (attrs.state) {
      const stateFromAttr = ABBR_TO_STATE[attrs.state.toLowerCase()];
      if (stateFromAttr && !siblingCityToState[cSlug]) {
        siblingCityToState[cSlug] = stateFromAttr;
      }
    }

    parsedEntries.push({ cSlug, tSlug, attrs });
  }

  const records = [];
  for (const { cSlug, tSlug, attrs } of parsedEntries) {
    let st = cityToState[cSlug];
    if (!st) {
      if (EXPLICIT_METRO_TO_STATE[cSlug]) {
        st = EXPLICIT_METRO_TO_STATE[cSlug];
      } else {
        for (const [abbr, stName] of Object.entries(ABBR_TO_STATE)) {
          if (cSlug.endsWith(`-${abbr}`)) {
            st = stName;
            break;
          }
        }
      }
    }
    if (!st && attrs.state) {
      st = ABBR_TO_STATE[attrs.state.toLowerCase()] || 'unknown';
    }
    if (!st) {
      st = siblingCityToState[cSlug] || existingCityToState[cSlug];
    }

    const stateName = st ? st.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : 'Unknown';
    const stCode = attrs.state || STATE_CODES[st] || 'US';
    const name = attrs.title || formatSlug(tSlug);
    const address = attrs.addressLine1 || null;

    const cityRaw = attrs.city;
    const cityName = cityRaw ? cityRaw.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : null;
    const postalCode = attrs.postalCode || null;
    const lat = attrs.latitude || null;
    const lon = attrs.longitude || null;

    const showtimesUrl = `https://www.amctheatres.com/movie-theatres/${cSlug}/${tSlug}/showtimes`;

    // Google Maps URL
    const queryParts = [name];
    if (address) queryParts.push(address);
    if (cityName) queryParts.push(cityName);
    if (stCode) queryParts.push(stCode);
    if (postalCode) queryParts.push(postalCode);

    const encodedQuery = encodeURIComponent(queryParts.join(', '));
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

    records.push({
      id: tSlug,
      name,
      address,
      city: cityName,
      state: stateName,
      state_code: stCode,
      postal_code: postalCode,
      latitude: lat,
      longitude: lon,
      google_maps_url: googleMapsUrl,
      city_slug: cSlug,
      showtimes_url: showtimesUrl
    });
  }

  const MIN_THEATER_COUNT = 400;
  if (records.length < MIN_THEATER_COUNT) {
    throw new Error(`Sanity check failed: only parsed ${records.length} theaters (expected >= ${MIN_THEATER_COUNT}). Refusing to overwrite ${outPath}.`);
  }

  // Sort deterministically by state, then name, then id
  records.sort((a, b) => {
    const sCmp = a.state.localeCompare(b.state);
    if (sCmp !== 0) return sCmp;
    const nCmp = a.name.localeCompare(b.name);
    if (nCmp !== 0) return nCmp;
    return a.id.localeCompare(b.id);
  });

  const summary = buildDiffSummary(existingById, records);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(records, null, 2), 'utf-8');

  if (args.summaryFile) {
    fs.mkdirSync(path.dirname(path.resolve(args.summaryFile)), { recursive: true });
    fs.writeFileSync(args.summaryFile, `${summary}\n`, 'utf-8');
  }

  const statesCount = new Set(records.map(r => r.state)).size;
  console.log(`Successfully generated ${records.length} theaters with addresses in ${outPath} across ${statesCount} states.`);
  const unknownCount = records.filter(r => r.state === 'Unknown').length;
  if (unknownCount > 0) {
    console.warn(`Warning: ${unknownCount} theater(s) resolved with state "Unknown".`);
  }
}

main().catch(err => {
  const args = parseArgs(process.argv.slice(2));
  if (args.softFailWaf && err instanceof WafOrTransientError) {
    const msg = `⚠️ Skipping theater catalog sync due to WAF/transient AMC response: ${err.message}`;
    console.warn(msg);
    appendStepSummary(msg);
    process.exit(0);
  }
  console.error('Error generating theaters catalog:', err);
  process.exit(1);
});
