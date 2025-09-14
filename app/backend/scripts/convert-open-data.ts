/**
 * convert-open-data.ts
 *
 * Convert government open data CSVs into canonical app CSVs:
 * - locations.csv (cities + ports)
 * - links.csv (port-to-port links)
 * - modes.csv (mode coefficients)
 *
 * Usage (from app/backend):
 *   npm run convert:open-data
 *
 * Output directory:
 *   ../../オープンデータ/_processed
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { parse } from 'csv-parse';

type LocationRow = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'city' | 'port';
};

type LinkRow = {
  from_port_id: string;
  to_port_id: string;
  distance_km: number;
  time_hours: number;
  operator: string;
  frequency_per_week: number;
};

// File paths (relative to app/backend)
const ROOT = resolve(__dirname, '../../..');
const BACKEND_DIR = resolve(__dirname, '..');
const OPEN_DATA_DIR = resolve(ROOT, 'オープンデータ');
const OUTPUT_DIR = resolve(OPEN_DATA_DIR, '_processed');

const PORTS_SOURCE = resolve(OPEN_DATA_DIR, '内航海運業データ/03_kouwanchousa.csv');
const LINKS_SOURCE = resolve(OPEN_DATA_DIR, 'モーダルシフト/01_naikousenpakuyusoutoukeityousa.csv');

const SAMPLE_CITIES = resolve(BACKEND_DIR, 'data/locations.csv');

// Ship speed (km/h) for time estimate when needed
const DEFAULT_SHIP_SPEED = 20; // km/h

// Helper: basic slugify to ASCII id (very conservative)
function slugify(input: string): string {
  const s = input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\u3000]/g, '-') // Japanese full-width space
    .replace(/[（）()]/g, '')
    .replace(/港/g, '') // drop trailing "港" to stabilize (we add it in id prefix)
    .replace(/[^a-z0-9\-]+/g, '');
  return s.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function parseCsv(file: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    });

    parser.on('readable', function () {
      let record;
      // eslint-disable-next-line no-cond-assign
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });
    parser.on('error', (err) => reject(err));
    parser.on('end', () => resolve(records));

    createReadStream(file).pipe(parser);
  });
}

async function buildPorts(): Promise<Map<string, { id: string; name: string; lat: number; lon: number }>> {
  if (!existsSync(PORTS_SOURCE)) {
    throw new Error(`Ports source not found: ${PORTS_SOURCE}`);
  }
  const rows = await parseCsv(PORTS_SOURCE);
  const ports = new Map<string, { id: string; name: string; lat: number; lon: number }>();

  for (const row of rows) {
    // Columns per sample header: PORT_NAME, PREFECTURE_NAME, LAT, LON
    const rawName = (row['PORT_NAME'] || row['Port_Name'] || row['port_name'] || '').toString().trim();
    const latStr = (row['LAT'] || row['Lat'] || row['lat'] || '').toString().trim();
    const lonStr = (row['LON'] || row['Lon'] || row['lon'] || '').toString().trim();
    if (!rawName || !latStr || !lonStr) continue;
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!isFinite(lat) || !isFinite(lon)) continue;

    // Deduplicate by name; keep first valid coords
    if (!ports.has(rawName)) {
      // Use raw name as ID to preserve Japanese identifiers reliably
      // (App treats IDs as opaque strings; links.csv must match these exactly.)
      const id = rawName;
      ports.set(rawName, { id, name: rawName, lat, lon });
    }
  }

  return ports;
}

async function buildCities(): Promise<LocationRow[]> {
  // Copy existing CITY rows from sample locations as-is to ensure app compatibility (Tokyo, Osaka, etc.)
  if (!existsSync(SAMPLE_CITIES)) {
    return [];
  }
  const content = readFileSync(SAMPLE_CITIES, 'utf-8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) return [];
  const cols = header.split(',');
  const idx = {
    id: cols.indexOf('id'),
    name: cols.indexOf('name'),
    lat: cols.indexOf('lat'),
    lon: cols.indexOf('lon'),
    type: cols.indexOf('type'),
  };
  const cities: LocationRow[] = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 5) continue;
    const type = parts[idx.type];
    if (type !== 'city') continue;
    cities.push({
      id: parts[idx.id],
      name: parts[idx.name],
      lat: parseFloat(parts[idx.lat]),
      lon: parseFloat(parts[idx.lon]),
      type: 'city',
    });
  }
  return cities;
}

function writeCsv(path: string, header: string[], rows: (string | number)[][]): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  writeFileSync(path, csv, 'utf-8');
}

async function buildLinks(
  ports: Map<string, { id: string; name: string; lat: number; lon: number }>
): Promise<LinkRow[]> {
  if (!existsSync(LINKS_SOURCE)) {
    throw new Error(`Links source not found: ${LINKS_SOURCE}`);
  }
  const rows = await parseCsv(LINKS_SOURCE);
  const links: LinkRow[] = [];

  // Helper to resolve port name from data into known port map entry
  const resolvePort = (name: string) => {
    if (!name) return undefined;
    const candidates = [name, name.replace(/港$/, ''), name.replace(/港.*/, '')];
    for (const c of candidates) {
      if (ports.has(c)) return ports.get(c)!;
    }
    // Try partial match (e.g., 京浜 → 横浜 など含意は難しいため最初の包含一致を採用)
    for (const key of ports.keys()) {
      if (key.includes(name) || name.includes(key)) {
        return ports.get(key)!;
      }
    }
    return undefined;
  };

  for (const row of rows) {
    // Column names in this file are verbose and may include spaces/underscores.
    const loadPortName = (
      row['LOADING PORT_NAME'] ||
      row['LOADING PORT NAME'] ||
      row['Loading Port Name'] ||
      row['loading_port_name'] ||
      row['LOADING PORT'] ||
      ''
    ).toString().trim();
    const unloadPortName = (
      row['UNLOADING PORT_NAME'] ||
      row['DISCHARGE PORT_NAME'] ||
      row['UNLOADING PORT NAME'] ||
      row['DISCHARGE PORT NAME'] ||
      row['Unloading Port Name'] ||
      row['Discharge Port Name'] ||
      row['unloading_port_name'] ||
      ''
    ).toString().trim();

    if (!loadPortName || !unloadPortName) continue;

    const fromPort = resolvePort(loadPortName);
    const toPort = resolvePort(unloadPortName);
    if (!fromPort || !toPort) continue;

    // Distance: use average distance column if numeric; else compute from port coords
    const distStr = (
      row['AVERAGE_TRANSPORT DISTANCE'] ||
      row['AVERAGE_TRANSPORT_DISTANCE'] ||
      row['Average Transport Distance'] ||
      row['average_transport_distance'] ||
      ''
    ).toString().trim();
    let distanceKm = parseFloat(distStr);
    if (!isFinite(distanceKm)) {
      distanceKm = haversineKm(fromPort.lat, fromPort.lon, toPort.lat, toPort.lon);
    }
    if (!isFinite(distanceKm) || distanceKm <= 0) continue;

    const timeHours = distanceKm / DEFAULT_SHIP_SPEED;

    const link: LinkRow = {
      from_port_id: fromPort.id,
      to_port_id: toPort.id,
      distance_km: Math.round(distanceKm * 10) / 10,
      time_hours: Math.round(timeHours * 10) / 10,
      operator: 'Unknown',
      frequency_per_week: 3,
    };

    // Deduplicate by unordered pair (keep shortest distance)
    const existing = links.find(
      (l) =>
        (l.from_port_id === link.from_port_id && l.to_port_id === link.to_port_id) ||
        (l.from_port_id === link.to_port_id && l.to_port_id === link.from_port_id)
    );
    if (!existing) {
      links.push(link);
    } else if (link.distance_km < existing.distance_km) {
      existing.distance_km = link.distance_km;
      existing.time_hours = link.time_hours;
    }
  }

  return links;
}

async function main() {
  // Prepare output dir
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1) Ports from open data
  const portsMap = await buildPorts();

  // 2) Cities from sample data (preserve well-known cities for truck routing)
  const cityRows = await buildCities();

  // 3) Compose locations (cities + ports)
  const locations: LocationRow[] = [];
  locations.push(...cityRows);
  for (const p of portsMap.values()) {
    locations.push({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, type: 'port' });
  }

  // 4) Build links from modal shift data (port-to-port)
  const links = await buildLinks(portsMap);

  // 4b) Seed a few major links if not present (distance via Haversine)
  const seedPairs: Array<[string, string]> = [
    ['横浜', '神戸'],
    ['横浜', '名古屋'],
    ['神戸', '名古屋'],
    ['横浜', '博多'],
    ['東京', '大阪'],
  ];
  for (const [a, b] of seedPairs) {
    const pa = portsMap.get(a);
    const pb = portsMap.get(b);
    if (!pa || !pb) continue;
    const exists = links.find(
      (l) =>
        (l.from_port_id === pa.id && l.to_port_id === pb.id) ||
        (l.from_port_id === pb.id && l.to_port_id === pa.id)
    );
    if (exists) continue;
    const d = haversineKm(pa.lat, pa.lon, pb.lat, pb.lon);
    if (!isFinite(d) || d <= 0) continue;
    links.push({
      from_port_id: pa.id,
      to_port_id: pb.id,
      distance_km: Math.round(d * 10) / 10,
      time_hours: Math.round((d / DEFAULT_SHIP_SPEED) * 10) / 10,
      operator: 'Unknown',
      frequency_per_week: 3,
    });
  }

  // 5) Modes — keep MVP defaults
  const modesHeader = ['mode', 'cost_per_km', 'co2_kg_per_ton_km', 'avg_speed_kmph'];
  const modesRows: (string | number)[][] = [
    ['truck', 50, 0.1, 60],
    ['ship', 20, 0.02, 20],
  ];

  // Write outputs
  // locations.csv
  writeCsv(
    join(OUTPUT_DIR, 'locations.csv'),
    ['id', 'name', 'lat', 'lon', 'type'],
    locations.map((l) => [l.id, l.name, l.lat, l.lon, l.type])
  );

  // links.csv
  writeCsv(
    join(OUTPUT_DIR, 'links.csv'),
    ['from_port_id', 'to_port_id', 'distance_km', 'time_hours', 'operator', 'frequency_per_week'],
    links.map((l) => [l.from_port_id, l.to_port_id, l.distance_km, l.time_hours, l.operator, l.frequency_per_week])
  );

  // modes.csv
  writeCsv(join(OUTPUT_DIR, 'modes.csv'), modesHeader, modesRows);

  // Basic summary to stdout
  console.log('✅ Open data converted.');
  console.log(`• locations: ${locations.length}`);
  console.log(`• links:     ${links.length}`);
  console.log(`• modes:     ${modesRows.length}`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Conversion failed:', err);
  process.exit(1);
});
