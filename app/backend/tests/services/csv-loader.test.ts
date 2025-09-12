/**
 * Service Test: CsvDataLoader
 * Tests the CSV data loading service with S3 mocking
 * 
 * Test Scenarios:
 * - Loading CSV files from S3
 * - Parsing different CSV formats
 * - Caching mechanisms
 * - Error handling for missing/corrupt data
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream';
import { Readable } from 'stream';
import { CsvDataLoader } from '../../src/services/CsvDataLoader';
import { LocationType, ModeType } from '../../src/lib/shared-types';
import { TEST_CONFIG } from '../setup/test-config';

const s3Mock = mockClient(S3Client);

// Helper to create S3 response stream
function createS3Stream(content: string) {
  const stream = new Readable();
  stream.push(content);
  stream.push(null);
  return sdkStreamMixin(stream);
}

describe('CsvDataLoader Service', () => {
  let loader: CsvDataLoader;

  beforeEach(() => {
    s3Mock.reset();
    loader = new CsvDataLoader({
      bucketName: TEST_CONFIG.aws.s3Bucket,
      region: TEST_CONFIG.aws.region,
      cacheEnabled: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    loader.clearCache();
  });

  describe('Loading Locations', () => {
    it('should load and parse locations.csv from S3', async () => {
      const csvContent = `id,name,lat,lon,type
tokyo,Tokyo,35.6895,139.6917,city
osaka,Osaka,34.6937,135.5023,city
tokyo-port,Tokyo Port,35.6329,139.7753,port
osaka-port,Osaka Port,34.6503,135.4278,port`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const locations = await loader.loadLocations();

      expect(locations).toHaveLength(4);
      
      // Check first city
      expect(locations[0]).toEqual({
        id: 'tokyo',
        name: 'Tokyo',
        lat: 35.6895,
        lon: 139.6917,
        type: LocationType.CITY
      });

      // Check first port
      expect(locations[2]).toEqual({
        id: 'tokyo-port',
        name: 'Tokyo Port',
        lat: 35.6329,
        lon: 139.7753,
        type: LocationType.PORT
      });
    });

    it('should handle Japanese characters in location names', async () => {
      const csvContent = `id,name,lat,lon,type
tokyo,東京,35.6895,139.6917,city
osaka,大阪,34.6937,135.5023,city
tokyo-port,東京港,35.6329,139.7753,port`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const locations = await loader.loadLocations();

      expect(locations[0].name).toBe('東京');
      expect(locations[1].name).toBe('大阪');
      expect(locations[2].name).toBe('東京港');
    });

    it('should validate coordinate ranges', async () => {
      const csvContent = `id,name,lat,lon,type
valid,Valid City,35.6895,139.6917,city
invalid1,Invalid Lat,200,139.6917,city
invalid2,Invalid Lon,35.6895,300,city`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const locations = await loader.loadLocations({ validateCoordinates: true });

      // Should only return valid location
      expect(locations).toHaveLength(1);
      expect(locations[0].id).toBe('valid');
    });

    it('should cache locations after first load', async () => {
      const csvContent = `id,name,lat,lon,type
tokyo,Tokyo,35.6895,139.6917,city`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      // First load
      await loader.loadLocations();
      
      // Second load (should use cache)
      await loader.loadLocations();

      // Verify S3 was only called once
      const calls = s3Mock.commandCalls(GetObjectCommand);
      expect(calls.length).toBe(1);
    });
  });

  describe('Loading Transport Modes', () => {
    it('should load and parse modes.csv from S3', async () => {
      const csvContent = `mode,cost_per_km,co2_kg_per_ton_km,avg_speed_kmph
truck,150,0.1,65
ship,50,0.02,20`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const modes = await loader.loadTransportModes();

      expect(modes).toHaveLength(2);
      
      // Check truck mode
      expect(modes[0]).toEqual({
        mode: ModeType.TRUCK,
        costPerKm: 150,
        co2KgPerTonKm: 0.1,
        avgSpeedKmph: 65
      });

      // Check ship mode
      expect(modes[1]).toEqual({
        mode: ModeType.SHIP,
        costPerKm: 50,
        co2KgPerTonKm: 0.02,
        avgSpeedKmph: 20
      });
    });

    it('should handle different CSV column formats', async () => {
      const csvContent = `Mode,CostPerKm,CO2KgPerTonKm,AvgSpeedKmph
Truck,150,0.1,65
Ship,50,0.02,20`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const modes = await loader.loadTransportModes({ 
        columnMapping: {
          mode: 'Mode',
          costPerKm: 'CostPerKm',
          co2KgPerTonKm: 'CO2KgPerTonKm',
          avgSpeedKmph: 'AvgSpeedKmph'
        }
      });

      expect(modes).toHaveLength(2);
      expect(modes[0].mode).toBe(ModeType.TRUCK);
    });

    it('should validate numeric values', async () => {
      const csvContent = `mode,cost_per_km,co2_kg_per_ton_km,avg_speed_kmph
truck,150,0.1,65
invalid,abc,0.02,20
ship,50,0.02,20`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const modes = await loader.loadTransportModes({ skipInvalid: true });

      // Should skip invalid row
      expect(modes).toHaveLength(2);
      expect(modes.map((m: any) => m.mode)).toEqual([ModeType.TRUCK, ModeType.SHIP]);
    });
  });

  describe('Loading Links', () => {
    it('should load and parse links.csv from S3', async () => {
      const csvContent = `from_port_id,to_port_id,distance_km,time_hours,operator,frequency_per_week
tokyo-port,osaka-port,400,12,NYK Line,7
osaka-port,kobe-port,30,1.5,Mitsui OSK,14
yokohama-port,nagoya-port,280,10,K Line,5`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const links = await loader.loadShipLinks();

      expect(links).toHaveLength(3);
      
      // Check first link
      expect(links[0]).toEqual({
        fromPortId: 'tokyo-port',
        toPortId: 'osaka-port',
        distanceKm: 400,
        timeHours: 12,
        operator: 'NYK Line',
        frequencyPerWeek: 7
      });
    });

    it('should filter links by minimum frequency', async () => {
      const csvContent = `from_port_id,to_port_id,distance_km,time_hours,operator,frequency_per_week
tokyo-port,osaka-port,400,12,NYK Line,7
osaka-port,kobe-port,30,1.5,Mitsui OSK,14
yokohama-port,nagoya-port,280,10,K Line,2`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const links = await loader.loadShipLinks({ minFrequency: 5 });

      // Should filter out link with frequency < 5
      expect(links).toHaveLength(2);
      expect(links.every((l: any) => l.frequencyPerWeek >= 5)).toBe(true);
    });

    it('should handle bidirectional links', async () => {
      const csvContent = `from_port_id,to_port_id,distance_km,time_hours,operator,frequency_per_week
tokyo-port,osaka-port,400,12,NYK Line,7`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const links = await loader.loadShipLinks({ bidirectional: true });

      // Should create reverse link automatically
      expect(links).toHaveLength(2);
      expect(links[1].fromPortId).toBe('osaka-port');
      expect(links[1].toPortId).toBe('tokyo-port');
      expect(links[1].distanceKm).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle S3 connection errors', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 connection failed'));

      await expect(loader.loadLocations())
        .rejects.toThrow('S3 connection failed');
    });

    it('should handle empty CSV files', async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(''),
        ContentType: 'text/csv'
      });

      const locations = await loader.loadLocations();
      expect(locations).toEqual([]);
    });

    it('should handle malformed CSV data', async () => {
      const malformedCsv = `id,name,lat,lon,type
tokyo,Tokyo,35.6895
osaka,Osaka,34.6937,135.5023,city,extra_column`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(malformedCsv),
        ContentType: 'text/csv'
      });

      const locations = await loader.loadLocations({ strict: false });
      
      // Should skip malformed rows in non-strict mode
      expect(locations).toHaveLength(1);
      expect(locations[0].id).toBe('osaka');
    });

    it('should handle missing required columns', async () => {
      const csvContent = `id,name,latitude,longitude,category
tokyo,Tokyo,35.6895,139.6917,city`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      await expect(loader.loadLocations())
        .rejects.toThrow('Missing required column');
    });

    it('should handle S3 access denied errors', async () => {
      s3Mock.on(GetObjectCommand).rejects({
        name: 'AccessDenied',
        message: 'Access Denied'
      });

      await expect(loader.loadLocations())
        .rejects.toThrow('Access Denied');
    });
  });

  describe('Data Transformation', () => {
    it('should normalize location types', async () => {
      const csvContent = `id,name,lat,lon,type
tokyo,Tokyo,35.6895,139.6917,City
osaka,Osaka,34.6937,135.5023,CITY
port1,Port 1,35.6329,139.7753,Port
port2,Port 2,34.6503,135.4278,PORT`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const locations = await loader.loadLocations();

      // All types should be normalized to lowercase
      expect(locations[0].type).toBe(LocationType.CITY);
      expect(locations[1].type).toBe(LocationType.CITY);
      expect(locations[2].type).toBe(LocationType.PORT);
      expect(locations[3].type).toBe(LocationType.PORT);
    });

    it('should convert numeric strings correctly', async () => {
      const csvContent = `mode,cost_per_km,co2_kg_per_ton_km,avg_speed_kmph
truck,"150","0.1","65"
ship," 50 "," 0.02 "," 20 "`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvContent),
        ContentType: 'text/csv'
      });

      const modes = await loader.loadTransportModes();

      // Should trim and convert to numbers
      expect(modes[0].costPerKm).toBe(150);
      expect(modes[0].co2KgPerTonKm).toBe(0.1);
      expect(modes[1].costPerKm).toBe(50);
      expect(modes[1].avgSpeedKmph).toBe(20);
    });

    it('should handle CSV with BOM', async () => {
      const csvWithBom = '\uFEFF' + `id,name,lat,lon,type
tokyo,Tokyo,35.6895,139.6917,city`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(csvWithBom),
        ContentType: 'text/csv'
      });

      const locations = await loader.loadLocations();

      expect(locations).toHaveLength(1);
      expect(locations[0].id).toBe('tokyo');
    });
  });

  describe('Performance', () => {
    it('should handle large CSV files efficiently', async () => {
      // Generate large CSV (1000 locations)
      const rows = ['id,name,lat,lon,type'];
      for (let i = 0; i < 1000; i++) {
        rows.push(`loc${i},Location ${i},${35 + i * 0.001},${139 + i * 0.001},city`);
      }
      const largeCsv = rows.join('\n');

      s3Mock.on(GetObjectCommand).resolves({
        Body: createS3Stream(largeCsv),
        ContentType: 'text/csv'
      });

      const startTime = Date.now();
      const locations = await loader.loadLocations();
      const duration = Date.now() - startTime;

      expect(locations).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should process within 1 second
    });

    it('should stream large files instead of loading into memory', async () => {
      // Mock a very large file scenario
      const largeStream = new Readable({
        read() {
          // Simulate streaming data
          this.push('id,name,lat,lon,type\n');
          for (let i = 0; i < 100; i++) {
            this.push(`loc${i},Location ${i},35.${i},139.${i},city\n`);
          }
          this.push(null);
        }
      });

      s3Mock.on(GetObjectCommand).resolves({
        Body: sdkStreamMixin(largeStream),
        ContentType: 'text/csv'
      });

      const locations = await loader.loadLocations({ streaming: true });
      
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should implement cache expiration', async () => {
      const csvContent = `id,name,lat,lon,type
tokyo,Tokyo,35.6895,139.6917,city`;

      s3Mock.on(GetObjectCommand)
        .resolvesOnce({
          Body: createS3Stream(csvContent),
          ContentType: 'text/csv'
        })
        .resolvesOnce({
          Body: createS3Stream(csvContent + '\nosaka,Osaka,34.6937,135.5023,city'),
          ContentType: 'text/csv'
        });

      // First load
      const locations1 = await loader.loadLocations();
      expect(locations1).toHaveLength(1);

      // Simulate cache expiration
      loader.setCacheExpiration(0); // Expire immediately
      
      // Second load should fetch from S3 again
      const locations2 = await loader.loadLocations();
      expect(locations2).toHaveLength(2);

      const calls = s3Mock.commandCalls(GetObjectCommand);
      expect(calls.length).toBe(2);
    });
  });

  describe('Data Integration', () => {
    it('should load all data types in parallel', async () => {
      const locationsCsv = `id,name,lat,lon,type
tokyo,Tokyo,35.6895,139.6917,city`;
      
      const modesCsv = `mode,cost_per_km,co2_kg_per_ton_km,avg_speed_kmph
truck,150,0.1,65`;
      
      const linksCsv = `from_port_id,to_port_id,distance_km,time_hours,operator,frequency_per_week
tokyo-port,osaka-port,400,12,NYK Line,7`;

      s3Mock.on(GetObjectCommand)
        .resolvesOnce({ Body: createS3Stream(locationsCsv), ContentType: 'text/csv' })
        .resolvesOnce({ Body: createS3Stream(modesCsv), ContentType: 'text/csv' })
        .resolvesOnce({ Body: createS3Stream(linksCsv), ContentType: 'text/csv' });

      const [locations, modes, links] = await Promise.all([
        loader.loadLocations(),
        loader.loadTransportModes(),
        loader.loadShipLinks()
      ]);

      expect(locations).toHaveLength(1);
      expect(modes).toHaveLength(1);
      expect(links).toHaveLength(1);
    });

    it('should validate referential integrity between datasets', async () => {
      const locationsCsv = `id,name,lat,lon,type
tokyo-port,Tokyo Port,35.6329,139.7753,port
osaka-port,Osaka Port,34.6503,135.4278,port`;
      
      const linksCsv = `from_port_id,to_port_id,distance_km,time_hours,operator,frequency_per_week
tokyo-port,osaka-port,400,12,NYK Line,7
tokyo-port,invalid-port,300,10,Test Line,5`;

      s3Mock.on(GetObjectCommand)
        .resolvesOnce({ Body: createS3Stream(locationsCsv), ContentType: 'text/csv' })
        .resolvesOnce({ Body: createS3Stream(linksCsv), ContentType: 'text/csv' });

      const locations = await loader.loadLocations();
      const links = await loader.loadShipLinks({ validatePorts: locations });

      // Should filter out link with invalid port
      expect(links).toHaveLength(1);
      expect(links[0].toPortId).toBe('osaka-port');
    });
  });
});