import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

/**
 * Sanitize filename to prevent directory traversal and remove unsafe characters.
 * @param {string} filename 
 * @returns {string}
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'document';
  }
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 255);
}

/**
 * Generate a unique chunk identifier.
 * @returns {string}
 */
export function generateChunkId() {
  return uuidv4();
}

/**
 * Normalize text by collapsing multiple whitespace characters and trimming.
 * @param {string} text 
 * @returns {string}
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Check if a string is a valid MongoDB ObjectId.
 * @param {string} id 
 * @returns {boolean}
 */
export function isValidObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/**
 * Escape regular expression special characters.
 * @param {string} string 
 * @returns {string}
 */
export function escapeRegex(string) {
  if (!string || typeof string !== 'string') {
    return '';
  }
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tokenize a string into alphanumeric tokens filtered by minimum length.
 * @param {string} text 
 * @param {number} minLength 
 * @returns {string[]}
 */
export function tokenize(text, minLength = 2) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= minLength);
}
