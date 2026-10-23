import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/index.js';

/**
 * Generate JWT token for user payload
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

/**
 * Set authentication cookie on response
 */
const setAuthCookie = (res, token) => {
  res.cookie('tg_token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
};

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists'
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Log in an existing user
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Log out current user
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    res.clearCookie('tg_token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get currently authenticated user
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

export default {
  register,
  login,
  logout,
  getMe
};
