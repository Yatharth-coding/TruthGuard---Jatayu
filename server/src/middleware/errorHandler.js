import multer from 'multer';
import { ZodError } from 'zod';
import config from '../config/index.js';

/**
 * Global Express error handling middleware.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error occurred';
    errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
  }

  // Handle Mongoose Cast Error (Invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier: ${err.value}`;
    errors = [{ field: err.path, message: `Invalid ID format for ${err.path}` }];
  }

  // Handle Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    message = `A record with this ${field} ('${value}') already exists.`;
    errors = [{ field, message }];
  }

  // Handle Zod Error
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Request validation failed';
    errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  }

  // Handle Multer Errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `File too large. Maximum allowed size is ${config.maxFileSizeMb}MB.`;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected file field '${err.field}'. Expected 'file'.`;
    } else {
      message = `File upload error: ${err.message}`;
    }
    errors = [{ field: err.field || 'file', message }];
  }

  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(config.nodeEnv !== 'production' && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};

export default errorHandler;
