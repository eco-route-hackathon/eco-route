/**
 * CSV Data Validation Tests
 * Tests to ensure CSV data files are properly formatted and contain valid data
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

describe('CSV Data Validation', () => {
  const dataPath = join(process.cwd(), 'data');

  describe('restaurants.csv', () => {
    let restaurantsData: any[];

    beforeAll(() => {
      const csvPath = join(dataPath, 'restaurants.csv');
      expect(existsSync(csvPath)).toBe(true);
      
      const csvContent = readFileSync(csvPath, 'utf-8');
      restaurantsData = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    });

    it('should have required columns', () => {
      const requiredColumns = [
        'id', 'name', 'type', 'cuisine', 'price_range', 'lat', 'lon',
        'address', 'rating', 'distance_from_route', 'estimated_stop_time',
        'amenities', 'opening_hours'
      ];

      if (restaurantsData.length > 0) {
        const actualColumns = Object.keys(restaurantsData[0]);
        requiredColumns.forEach(column => {
          expect(actualColumns).toContain(column);
        });
      }
    });

    it('should have valid data types', () => {
      restaurantsData.forEach((restaurant, index) => {
        // Check required string fields
        expect(typeof restaurant.id).toBe('string');
        expect(typeof restaurant.name).toBe('string');
        expect(typeof restaurant.type).toBe('string');
        expect(typeof restaurant.address).toBe('string');
        expect(typeof restaurant.opening_hours).toBe('string');

        // Check numeric fields
        expect(Number(restaurant.lat)).not.toBeNaN();
        expect(Number(restaurant.lon)).not.toBeNaN();
        expect(Number(restaurant.rating)).not.toBeNaN();
        expect(Number(restaurant.distance_from_route)).not.toBeNaN();
        expect(Number(restaurant.estimated_stop_time)).not.toBeNaN();

        // Check enum values
        expect(['restaurant', 'cafe', 'fast_food', 'convenience_store']).toContain(restaurant.type);
        expect(['low', 'medium', 'high']).toContain(restaurant.price_range);
      });
    });

    it('should have valid coordinates', () => {
      restaurantsData.forEach((restaurant, index) => {
        const lat = Number(restaurant.lat);
        const lon = Number(restaurant.lon);

        // Japan coordinates roughly: lat 24-46, lon 122-146
        expect(lat).toBeGreaterThan(24);
        expect(lat).toBeLessThan(46);
        expect(lon).toBeGreaterThan(122);
        expect(lon).toBeLessThan(146);
      });
    });

    it('should have valid ratings', () => {
      restaurantsData.forEach((restaurant, index) => {
        const rating = Number(restaurant.rating);
        expect(rating).toBeGreaterThanOrEqual(0);
        expect(rating).toBeLessThanOrEqual(5);
      });
    });

    it('should have valid distances', () => {
      restaurantsData.forEach((restaurant, index) => {
        const distance = Number(restaurant.distance_from_route);
        expect(distance).toBeGreaterThanOrEqual(0);
        expect(distance).toBeLessThan(50); // Reasonable max distance
      });
    });

    it('should have valid stop times', () => {
      restaurantsData.forEach((restaurant, index) => {
        const stopTime = Number(restaurant.estimated_stop_time);
        expect(stopTime).toBeGreaterThan(0);
        expect(stopTime).toBeLessThan(300); // Max 5 hours
      });
    });

    it('should have valid cuisine lists', () => {
      restaurantsData.forEach((restaurant, index) => {
        expect(restaurant.cuisine).toBeDefined();
        expect(typeof restaurant.cuisine).toBe('string');
        expect(restaurant.cuisine.length).toBeGreaterThan(0);
      });
    });

    it('should have valid amenities lists', () => {
      restaurantsData.forEach((restaurant, index) => {
        expect(restaurant.amenities).toBeDefined();
        expect(typeof restaurant.amenities).toBe('string');
        expect(restaurant.amenities.length).toBeGreaterThan(0);
        
        // Check amenities format (should use semicolon separator)
        const amenities = restaurant.amenities.split(';').map((a: string) => a.trim());
        expect(amenities.length).toBeGreaterThan(0);
      });
    });
  });

  describe('service_areas.csv', () => {
    let serviceAreasData: any[];

    beforeAll(() => {
      const csvPath = join(dataPath, 'service_areas.csv');
      expect(existsSync(csvPath)).toBe(true);
      
      const csvContent = readFileSync(csvPath, 'utf-8');
      serviceAreasData = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    });

    it('should have required columns', () => {
      const requiredColumns = [
        'id', 'name', 'type', 'lat', 'lon', 'address', 'distance_from_route',
        'facilities', 'estimated_stop_time', 'opening_hours'
      ];

      if (serviceAreasData.length > 0) {
        const actualColumns = Object.keys(serviceAreasData[0]);
        requiredColumns.forEach(column => {
          expect(actualColumns).toContain(column);
        });
      }
    });

    it('should have valid data types', () => {
      serviceAreasData.forEach((serviceArea, index) => {
        // Check required string fields
        expect(typeof serviceArea.id).toBe('string');
        expect(typeof serviceArea.name).toBe('string');
        expect(typeof serviceArea.type).toBe('string');
        expect(typeof serviceArea.address).toBe('string');
        expect(typeof serviceArea.opening_hours).toBe('string');

        // Check numeric fields
        expect(Number(serviceArea.lat)).not.toBeNaN();
        expect(Number(serviceArea.lon)).not.toBeNaN();
        expect(Number(serviceArea.distance_from_route)).not.toBeNaN();
        expect(Number(serviceArea.estimated_stop_time)).not.toBeNaN();

        // Check enum values
        expect(['service_area', 'rest_area', 'parking_area']).toContain(serviceArea.type);
      });
    });

    it('should have valid coordinates', () => {
      serviceAreasData.forEach((serviceArea, index) => {
        const lat = Number(serviceArea.lat);
        const lon = Number(serviceArea.lon);

        expect(lat).toBeGreaterThan(24);
        expect(lat).toBeLessThan(46);
        expect(lon).toBeGreaterThan(122);
        expect(lon).toBeLessThan(146);
      });
    });

    it('should have valid facilities lists', () => {
      serviceAreasData.forEach((serviceArea, index) => {
        expect(serviceArea.facilities).toBeDefined();
        expect(typeof serviceArea.facilities).toBe('string');
        expect(serviceArea.facilities.length).toBeGreaterThan(0);

        // Check for common facilities (should use semicolon separator)
        const facilities = serviceArea.facilities.split(';').map((f: string) => f.trim());
        expect(facilities.length).toBeGreaterThan(0);
      });
    });

    it('should have reasonable stop times', () => {
      serviceAreasData.forEach((serviceArea, index) => {
        const stopTime = Number(serviceArea.estimated_stop_time);
        expect(stopTime).toBeGreaterThan(0);
        expect(stopTime).toBeLessThan(120); // Max 2 hours for service areas
      });
    });
  });

  describe('attractions.csv', () => {
    let attractionsData: any[];

    beforeAll(() => {
      const csvPath = join(dataPath, 'attractions.csv');
      expect(existsSync(csvPath)).toBe(true);
      
      const csvContent = readFileSync(csvPath, 'utf-8');
      attractionsData = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    });

    it('should have required columns', () => {
      const requiredColumns = [
        'id', 'name', 'type', 'lat', 'lon', 'address', 'distance_from_route',
        'estimated_visit_time', 'rating', 'category'
      ];

      if (attractionsData.length > 0) {
        const actualColumns = Object.keys(attractionsData[0]);
        requiredColumns.forEach(column => {
          expect(actualColumns).toContain(column);
        });
      }
    });

    it('should have valid data types', () => {
      attractionsData.forEach((attraction, index) => {
        // Check required string fields
        expect(typeof attraction.id).toBe('string');
        expect(typeof attraction.name).toBe('string');
        expect(typeof attraction.type).toBe('string');
        expect(typeof attraction.address).toBe('string');

        // Check numeric fields
        expect(Number(attraction.lat)).not.toBeNaN();
        expect(Number(attraction.lon)).not.toBeNaN();
        expect(Number(attraction.distance_from_route)).not.toBeNaN();
        expect(Number(attraction.estimated_visit_time)).not.toBeNaN();
        expect(Number(attraction.rating)).not.toBeNaN();

        // Check enum values
        expect(['tourist_spot', 'landmark', 'museum', 'park']).toContain(attraction.type);
      });
    });

    it('should have valid coordinates', () => {
      attractionsData.forEach((attraction, index) => {
        const lat = Number(attraction.lat);
        const lon = Number(attraction.lon);

        expect(lat).toBeGreaterThan(24);
        expect(lat).toBeLessThan(46);
        expect(lon).toBeGreaterThan(122);
        expect(lon).toBeLessThan(146);
      });
    });

    it('should have valid ratings', () => {
      attractionsData.forEach((attraction, index) => {
        const rating = Number(attraction.rating);
        expect(rating).toBeGreaterThanOrEqual(0);
        expect(rating).toBeLessThanOrEqual(5);
      });
    });

    it('should have valid visit times', () => {
      attractionsData.forEach((attraction, index) => {
        const visitTime = Number(attraction.estimated_visit_time);
        expect(visitTime).toBeGreaterThan(0);
        expect(visitTime).toBeLessThan(480); // Max 8 hours
      });
    });

    it('should have valid category lists', () => {
      attractionsData.forEach((attraction, index) => {
        expect(attraction.category).toBeDefined();
        expect(typeof attraction.category).toBe('string');
        expect(attraction.category.length).toBeGreaterThan(0);
        
        // Check category format (should use semicolon separator)
        const categories = attraction.category.split(';').map((c: string) => c.trim());
        expect(categories.length).toBeGreaterThan(0);
      });
    });
  });

  describe('data consistency', () => {
    it('should have unique IDs across all files', () => {
      const allIds: string[] = [];

      // Load all CSV files and collect IDs
      ['restaurants.csv', 'service_areas.csv', 'attractions.csv'].forEach(filename => {
        const csvPath = join(dataPath, filename);
        if (existsSync(csvPath)) {
          const csvContent = readFileSync(csvPath, 'utf-8');
          const data = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
          });

          data.forEach((row: any) => {
            if (row.id) {
              allIds.push(row.id);
            }
          });
        }
      });

      // Check for duplicates
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it('should have reasonable data volume', () => {
      const csvPath = join(dataPath, 'restaurants.csv');
      if (existsSync(csvPath)) {
        const csvContent = readFileSync(csvPath, 'utf-8');
        const data = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        expect(data.length).toBeGreaterThan(0);
        expect(data.length).toBeLessThan(1000); // Reasonable upper limit
      }
    });

    it('should have consistent data format', () => {
      ['restaurants.csv', 'service_areas.csv', 'attractions.csv'].forEach(filename => {
        const csvPath = join(dataPath, filename);
        if (existsSync(csvPath)) {
          const csvContent = readFileSync(csvPath, 'utf-8');
          
          // Check that CSV has proper structure
          const lines = csvContent.split('\n').filter(line => line.trim());
          expect(lines.length).toBeGreaterThan(1); // At least header + 1 data row
          
          // Check that all lines have same number of columns
          const headerColumns = lines[0].split(',').length;
          lines.slice(1).forEach((line, index) => {
            const columns = line.split(',').length;
            expect(columns).toBe(headerColumns);
          });
        }
      });
    });
  });
});
