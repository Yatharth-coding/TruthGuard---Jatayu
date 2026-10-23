import { ZodError } from 'zod';

/**
 * Generic Zod validation middleware factory.
 * Validates req.body against provided Zod schema.
 * @param {import('zod').ZodSchema} schema 
 * @returns {Function} Express middleware
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors
      });
    }
    next(error);
  }
};

export default validate;
