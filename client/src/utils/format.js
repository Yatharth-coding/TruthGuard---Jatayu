/**
 * Format date string into human-readable format
 * @param {string|Date} date 
 * @param {boolean} includeTime 
 * @returns {string}
 */
export function formatDate(date, includeTime = false) {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid date';
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
    };
    return d.toLocaleDateString(undefined, options);
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format bytes into KB, MB, GB
 * @param {number} bytes 
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return '0 B';
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {string}
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

/**
 * Map file MIME type or extension to icon type identifier
 * @param {string} type 
 * @returns {string}
 */
export function getFileTypeIcon(type) {
  if (!type) return 'file';
  const lower = type.toLowerCase();
  if (lower.includes('pdf')) return 'pdf';
  if (lower.includes('markdown') || lower.endsWith('.md')) return 'markdown';
  if (lower.includes('text') || lower.endsWith('.txt')) return 'text';
  return 'file';
}
