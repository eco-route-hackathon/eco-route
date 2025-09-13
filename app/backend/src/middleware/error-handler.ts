/**
 * Error Handler Middleware
 * Standardizes error responses according to OpenAPI spec
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorResponse, ErrorCode } from '../lib/shared-types';

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `req_${timestamp}${random}`;
}

/**
 * Map error to HTTP status code
 */
function getStatusCode(error: any): number {
  // If status code is already set
  if (error.statusCode) {
    return error.statusCode;
  }

  // Map by error code
  switch (error.code) {
    case ErrorCode.VALIDATION_ERROR:
      return 400;
    case ErrorCode.ROUTE_NOT_FOUND:
      return 404;
    case ErrorCode.DATA_ERROR:
    case ErrorCode.SERVICE_ERROR:
      return 500;
    default:
      return 500;
  }
}

/**
 * Determine error code from error
 */
function getErrorCode(error: any): ErrorCode {
  // If error code is already set
  if (error.code && Object.values(ErrorCode).includes(error.code)) {
    return error.code;
  }

  // Determine by error type/message
  if (error.message && error.message.includes('not found')) {
    return ErrorCode.ROUTE_NOT_FOUND;
  }

  if (error.message && error.message.includes('validation')) {
    return ErrorCode.VALIDATION_ERROR;
  }

  if (error.message && (error.message.includes('CSV') || error.message.includes('data'))) {
    return ErrorCode.DATA_ERROR;
  }

  // Default to service error
  return ErrorCode.SERVICE_ERROR;
}

/**
 * Error handler middleware
 */
export function errorHandler(error: any, _req: Request, res: Response, _next: NextFunction): void {
  // Generate request ID for tracking
  const requestId = generateRequestId();

  // Log error for debugging
  console.error(`[${requestId}] Error:`, error);

  // Determine status code and error code
  const statusCode = getStatusCode(error);
  const errorCode = getErrorCode(error);

  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message: error.message || 'An unexpected error occurred',
      field: error.field,
      details: error.details,
    },
    requestId,
    timestamp: new Date().toISOString(),
  };

  // Special handling for JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    errorResponse.error.code = ErrorCode.VALIDATION_ERROR;
    errorResponse.error.message = 'Invalid JSON in request body';
    res.status(400).json(errorResponse);
    return;
  }

  // Special handling for AWS errors
  if (error.name === 'ResourceNotFoundException') {
    errorResponse.error.code = ErrorCode.SERVICE_ERROR;
    errorResponse.error.message = 'Route calculation service not configured';
    res.status(500).json(errorResponse);
    return;
  }

  if (error.name === 'AccessDenied' || error.name === 'NoSuchBucket') {
    errorResponse.error.code = ErrorCode.SERVICE_ERROR;
    errorResponse.error.message = 'Unable to access data storage';
    res.status(500).json(errorResponse);
    return;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Not found handler (for undefined routes)
 */
export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse: ErrorResponse = {
    error: {
      code: ErrorCode.ROUTE_NOT_FOUND,
      message: `Endpoint not found: ${req.method} ${req.path}`,
    },
    requestId: generateRequestId(),
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(errorResponse);
}
