/**
 * CsvDataLoader Service
 * Loads and parses CSV data from S3 with caching support
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { parse } from 'csv-parse';
import { 
  Location, 
  LocationType, 
  ModeType, 
  TransportMode 
} from '../lib/shared-types';

// ShipLink interface for CSV data
export interface ShipLink {
  fromPortId: string;
  toPortId: string;
  distanceKm: number;
  timeHours: number;
  operator: string;
  frequencyPerWeek: number;
}

// Configuration options
interface CsvLoaderConfig {
  bucketName: string;
  region: string;
  cacheEnabled?: boolean;
}

interface LoadOptions {
  validateCoordinates?: boolean;
  columnMapping?: Record<string, string>;
  skipInvalid?: boolean;
  strict?: boolean;
  minFrequency?: number;
  bidirectional?: boolean;
  validatePorts?: Location[];
  streaming?: boolean;
}

export class CsvDataLoader {
  private s3Client: S3Client;
  private bucketName: string;
  private cache: Map<string, any> = new Map();
  private cacheEnabled: boolean;
  private cacheExpiration: number = 3600000; // 1 hour default

  constructor(config: CsvLoaderConfig) {
    this.bucketName = config.bucketName;
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.s3Client = new S3Client({ region: config.region });
  }

  clearCache(): void {
    this.cache.clear();
  }

  setCacheExpiration(ms: number): void {
    this.cacheExpiration = ms;
    if (ms === 0) {
      this.clearCache();
    }
  }

  async loadLocations(options: LoadOptions = {}): Promise<Location[]> {
    const cacheKey = 'locations';
    
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const data = await this.fetchAndParseCsv('locations.csv', options);
    
    // Check for required columns in the first row (only in strict mode or default)
    if (options.strict !== false && data.length > 0) {
      const firstRow = data[0];
      if (!('lat' in firstRow)) {
        throw new Error('Missing required column: lat');
      }
      if (!('lon' in firstRow)) {
        throw new Error('Missing required column: lon');
      }
    }
    
    const locations: Location[] = [];

    for (const row of data) {
      // Skip rows missing required fields
      if (!row.id || !row.name) {
        continue;
      }

      // Handle missing lat/lon fields
      if (!row.lat || !row.lon) {
        if (options.strict !== false) {
          continue;
        }
        continue;
      }

      const lat = parseFloat(row.lat);
      const lon = parseFloat(row.lon);

      // Skip invalid numeric values
      if (isNaN(lat) || isNaN(lon)) {
        continue;
      }

      // Validate coordinates if requested
      if (options.validateCoordinates && !this.isValidCoordinate(lat, lon)) {
        continue;
      }

      locations.push({
        id: row.id,
        name: row.name,
        lat,
        lon,
        type: this.normalizeLocationType(row.type || 'city')
      });
    }

    if (this.cacheEnabled) {
      this.cache.set(cacheKey, locations);
    }

    return locations;
  }

  async loadTransportModes(options: LoadOptions = {}): Promise<TransportMode[]> {
    const cacheKey = 'transport_modes';
    
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const data = await this.fetchAndParseCsv('modes.csv', options);
    const modes: TransportMode[] = [];

    for (const row of data) {
      const mapping = options.columnMapping || {};
      const mode = row[mapping.mode || 'mode'];
      const costPerKm = parseFloat(row[mapping.costPerKm || 'cost_per_km']);
      const co2KgPerTonKm = parseFloat(row[mapping.co2KgPerTonKm || 'co2_kg_per_ton_km']);
      const avgSpeedKmph = parseFloat(row[mapping.avgSpeedKmph || 'avg_speed_kmph']);

      // Skip invalid rows if requested
      if (options.skipInvalid && (isNaN(costPerKm) || isNaN(co2KgPerTonKm) || isNaN(avgSpeedKmph))) {
        continue;
      }

      modes.push({
        mode: this.normalizeModeType(mode),
        costPerKm,
        co2KgPerTonKm,
        avgSpeedKmph
      });
    }

    if (this.cacheEnabled) {
      this.cache.set(cacheKey, modes);
    }

    return modes;
  }

  async loadShipLinks(options: LoadOptions = {}): Promise<ShipLink[]> {
    const cacheKey = 'ship_links';
    
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const data = await this.fetchAndParseCsv('links.csv', options);
    const links: ShipLink[] = [];

    for (const row of data) {
      const frequencyPerWeek = parseInt(row.frequency_per_week);
      
      // Filter by minimum frequency
      if (options.minFrequency && frequencyPerWeek < options.minFrequency) {
        continue;
      }

      // Validate port references if provided
      if (options.validatePorts) {
        const validPorts = options.validatePorts.map(p => p.id);
        if (!validPorts.includes(row.from_port_id) || !validPorts.includes(row.to_port_id)) {
          continue;
        }
      }

      const link: ShipLink = {
        fromPortId: row.from_port_id,
        toPortId: row.to_port_id,
        distanceKm: parseFloat(row.distance_km),
        timeHours: parseFloat(row.time_hours),
        operator: row.operator,
        frequencyPerWeek
      };

      links.push(link);

      // Add reverse link if bidirectional
      if (options.bidirectional) {
        links.push({
          fromPortId: link.toPortId,
          toPortId: link.fromPortId,
          distanceKm: link.distanceKm,
          timeHours: link.timeHours,
          operator: link.operator,
          frequencyPerWeek: link.frequencyPerWeek
        });
      }
    }

    if (this.cacheEnabled) {
      this.cache.set(cacheKey, links);
    }

    return links;
  }

  private async fetchAndParseCsv(key: string, options: LoadOptions): Promise<any[]> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: `latest/${key}`
    });

    try {
      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        return [];
      }

      const stream = response.Body as Readable;
      const records: any[] = [];

      return new Promise((resolve, reject) => {
        const parser = parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
          relax_column_count: options.strict === false, // Allow inconsistent column counts in non-strict mode
          skip_records_with_error: options.strict === false, // Skip malformed records in non-strict mode
          cast: (value) => {
            // Auto-trim string values
            if (typeof value === 'string') {
              return value.trim();
            }
            return value;
          }
        });

        parser.on('readable', function() {
          let record;
          while ((record = parser.read()) !== null) {
            records.push(record);
          }
        });

        parser.on('error', (err: any) => {
          // In non-strict mode, skip errors related to column count
          if (options.strict === false && err.code === 'CSV_RECORD_INCONSISTENT_COLUMNS') {
            // Continue processing
            return;
          }
          reject(err);
        });
        
        parser.on('end', () => resolve(records));

        stream.pipe(parser);
      });
    } catch (error: any) {
      if (error.name === 'AccessDenied') {
        throw new Error('Access Denied');
      }
      throw error;
    }
  }

  private isValidCoordinate(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  private normalizeLocationType(type: string): LocationType {
    const normalized = type.toLowerCase();
    if (normalized === 'city') return LocationType.CITY;
    if (normalized === 'port') return LocationType.PORT;
    return LocationType.CITY; // default
  }

  private normalizeModeType(mode: string): ModeType {
    const normalized = mode.toLowerCase();
    if (normalized === 'truck') return ModeType.TRUCK;
    if (normalized === 'ship') return ModeType.SHIP;
    return ModeType.TRUCK; // default
  }
}