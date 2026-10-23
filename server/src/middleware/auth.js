import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Authentication middleware verifying JWT from cookie or Bearer header.
 * Attaches user { id, email } to req.user.
 */
export const authenticate = (req, res, next) => {
  let token = null;

  // 1. Try reading token from cookie
  if (req.cookies && req.cookies.tg_token) {
    token = req.cookies.tg_token;
  }

  // 2. Fall back to Authorization Bearer header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No authorization token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = {
      id: decoded.id,
      email: decoded.email
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authorization token.',
      error: err.name
    });
  }
};

export default authenticate;
