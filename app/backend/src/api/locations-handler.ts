/**
 * Locations API Handler
 * Provides list of available cities for selection
 */

import { Request, Response } from 'express';
import { CsvDataLoader } from '../services/CsvDataLoader';
import { LocationType } from '../lib/shared-types';

/**
 * GET /locations
 * Returns list of cities available for route comparison
 */
export async function locationsHandler(req: Request, res: Response): Promise<void> {
  try {
    // Create CSV loader instance
    const csvLoader = new CsvDataLoader({
      bucketName: process.env.S3_BUCKET || 'eco-route-data',
      region: process.env.AWS_REGION || 'ap-northeast-1',
      cacheEnabled: true,
    });

    // Load all locations from CSV
    const allLocations = await csvLoader.loadLocations();

    // Filter for cities only (exclude ports)
    const cities = allLocations
      .filter(location => location.type === LocationType.CITY)
      .map(location => ({
        id: location.id,
        name: location.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Return response
    res.json({
      locations: cities,
    });
  } catch (error) {
    console.error('Failed to load locations:', error);
    res.status(500).json({
      error: {
        message: '都市一覧の取得に失敗しました',
        code: 'LOCATIONS_LOAD_ERROR',
      },
    });
  }
}