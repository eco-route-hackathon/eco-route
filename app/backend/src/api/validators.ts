/**
 * Request Validators
 * Validates incoming API requests
 */

import { ComparisonRequest } from '../lib/shared-types';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate comparison request
 */
export function validateComparisonRequest(body: any): ValidationError | null {
  // Check required fields
  if (!body.origin) {
    return { field: 'origin', message: 'origin is required' };
  }

  if (!body.destination) {
    return { field: 'destination', message: 'destination is required' };
  }

  if (body.weightKg === undefined || body.weightKg === null) {
    return { field: 'weightKg', message: 'weightKg is required' };
  }

  if (!body.weights) {
    return { field: 'weights', message: 'weights is required' };
  }

  // Validate origin and destination strings
  if (typeof body.origin !== 'string' || body.origin.trim() === '') {
    return { field: 'origin', message: 'origin must be a non-empty string' };
  }

  if (typeof body.destination !== 'string' || body.destination.trim() === '') {
    return { field: 'destination', message: 'destination must be a non-empty string' };
  }

  // Check string length limits
  if (body.origin.length > 100) {
    return { field: 'origin', message: 'origin must not exceed 100 characters' };
  }

  if (body.destination.length > 100) {
    return { field: 'destination', message: 'destination must not exceed 100 characters' };
  }

  // Check that origin and destination are different
  if (body.origin === body.destination) {
    return { field: 'destination', message: 'origin and destination must be different' };
  }

  // Validate weightKg
  const weight = Number(body.weightKg);
  if (isNaN(weight)) {
    return { field: 'weightKg', message: 'weightKg must be a number' };
  }

  if (weight <= 0) {
    return { field: 'weightKg', message: 'weightKg must be positive' };
  }

  if (weight < 0.1) {
    return { field: 'weightKg', message: 'weightKg must be at least 0.1' };
  }

  if (weight > 100000) {
    return { field: 'weightKg', message: 'weightKg must not exceed 100000' };
  }

  // Validate weights object
  const weightsError = validateWeights(body.weights);
  if (weightsError) {
    return weightsError;
  }

  return null;
}

/**
 * Validate weight factors
 */
function validateWeights(weights: any): ValidationError | null {
  // Check required weight fields
  if (weights.time === undefined || weights.time === null) {
    return { field: 'weights.time', message: 'weights.time is required' };
  }

  if (weights.cost === undefined || weights.cost === null) {
    return { field: 'weights.cost', message: 'weights.cost is required' };
  }

  if (weights.co2 === undefined || weights.co2 === null) {
    return { field: 'weights.co2', message: 'weights.co2 is required' };
  }

  // Convert to numbers
  const time = Number(weights.time);
  const cost = Number(weights.cost);
  const co2 = Number(weights.co2);

  // Check if they are valid numbers
  if (isNaN(time)) {
    return { field: 'weights.time', message: 'weights.time must be a number' };
  }

  if (isNaN(cost)) {
    return { field: 'weights.cost', message: 'weights.cost must be a number' };
  }

  if (isNaN(co2)) {
    return { field: 'weights.co2', message: 'weights.co2 must be a number' };
  }

  // Check for negative values
  if (time < 0) {
    return { field: 'weights.time', message: 'weights.time cannot be negative' };
  }

  if (cost < 0) {
    return { field: 'weights.cost', message: 'weights.cost cannot be negative' };
  }

  if (co2 < 0) {
    return { field: 'weights.co2', message: 'weights.co2 cannot be negative' };
  }

  // Check individual values don't exceed 1.0
  if (time > 1.0) {
    return { field: 'weights.time', message: 'weights.time must not exceed 1.0' };
  }

  if (cost > 1.0) {
    return { field: 'weights.cost', message: 'weights.cost must not exceed 1.0' };
  }

  if (co2 > 1.0) {
    return { field: 'weights.co2', message: 'weights.co2 must not exceed 1.0' };
  }

  // Check sum is approximately 1.0 (with tolerance)
  const sum = time + cost + co2;
  if (Math.abs(sum - 1.0) > 0.01) {
    return {
      field: 'weights',
      message: `weights must sum to approximately 1.0 (current sum: ${sum.toFixed(3)})`,
    };
  }

  return null;
}

/**
 * Parse and validate request body into ComparisonRequest
 */
export function parseComparisonRequest(body: any): ComparisonRequest {
  return {
    origin: body.origin.trim(),
    destination: body.destination.trim(),
    weightKg: Number(body.weightKg),
    weights: {
      time: Number(body.weights.time),
      cost: Number(body.weights.cost),
      co2: Number(body.weights.co2),
    },
  };
}
