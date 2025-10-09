// Project Name Normalizer
// Replicates Excel formula for consistent project name formatting
// Based on: =SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE([@ProjectName],
// CHAR(10)," "), "	"," "), ","," "), "'",""), "."," "), "'",""), "%20"," "), "/","_")))

/**
 * Normalizes project names following the Excel formula pattern
 * Enhanced for folder-safe names (only allows letters, numbers, spaces, hyphens, underscores)
 * @param {string} projectName - Raw project name to normalize
 * @returns {string} - Normalized project name
 */
const normalizeProjectName = (projectName) => {
  if (!projectName || typeof projectName !== 'string') {
    return '';
  }

  // First pass: Apply Excel formula substitutions
  let normalized = projectName
    .replace(/\n/g, ' ')        // CHAR(10) -> space (newlines)
    .replace(/\r/g, ' ')        // Carriage returns -> space
    .replace(/\t/g, ' ')        // tabs -> space
    .replace(/,/g, ' ')         // commas -> space
    .replace(/'/g, '')          // single quotes -> remove
    .replace(/'/g, '')          // curly single quotes -> remove
    .replace(/"/g, '')          // double quotes -> remove
    .replace(/"/g, '')          // curly double quotes -> remove
    .replace(/"/g, '')          // curly double quotes -> remove
    .replace(/\./g, ' ')        // periods -> space
    .replace(/%20/g, ' ')       // URL encoded spaces -> space
    .replace(/%2E/g, ' ')       // URL encoded periods -> space
    .replace(/%2F/g, '_')       // URL encoded slashes -> underscore
    .replace(/\//g, '_')        // forward slashes -> underscore
    .replace(/\\/g, '_');       // backslashes -> underscore

  // Second pass: Remove all characters that aren't folder-safe
  // Allow only: letters, numbers, spaces, hyphens, underscores
  normalized = normalized.replace(/[^a-zA-Z0-9\s\-_]/g, ' ');

  // Third pass: Clean up whitespace
  normalized = normalized
    .trim()                     // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ')       // Multiple spaces -> single space
    .replace(/\s*-\s*/g, '-')   // Clean up spaces around hyphens
    .replace(/\s*_\s*/g, '_');  // Clean up spaces around underscores

  return normalized;
};

/**
 * Normalizes project name and applies proper case formatting
 * @param {string} projectName - Raw project name to normalize
 * @returns {string} - Normalized and properly cased project name
 */
const normalizeProjectNameWithProperCase = (projectName) => {
  const normalized = normalizeProjectName(projectName);
  
  // Apply proper case (like Excel PROPER function)
  return normalized
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

/**
 * Validates that a project name meets normalization standards
 * @param {string} projectName - Project name to validate
 * @returns {object} - { isValid: boolean, normalized: string, issues: string[] }
 */
const validateProjectName = (projectName) => {
  const issues = [];
  
  if (!projectName || typeof projectName !== 'string') {
    issues.push('Project name must be a non-empty string');
    return { isValid: false, normalized: '', issues };
  }

  const normalized = normalizeProjectName(projectName);
  
  if (normalized.length === 0) {
    issues.push('Project name cannot be empty after normalization');
  }
  
  if (normalized.length > 200) {
    issues.push('Project name too long (max 200 characters after normalization)');
  }
  
  // Check for potentially problematic characters that survived normalization
  const problematicChars = /[<>:"|?*\\]/;
  if (problematicChars.test(normalized)) {
    issues.push('Project name contains invalid characters');
  }

  return {
    isValid: issues.length === 0,
    normalized,
    issues
  };
};

module.exports = {
  normalizeProjectName,
  normalizeProjectNameWithProperCase,
  validateProjectName
};
