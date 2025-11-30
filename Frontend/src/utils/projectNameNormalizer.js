// Project Name Normalizer - Frontend Version
// Replicates Excel formula for consistent project name formatting
// Based on: =SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE([@ProjectName],
// CHAR(10)," "), "	"," "), ","," "), "'",""), "."," "), "'",""), "%20"," "), "/","_")))

import { useState, useEffect } from 'react';

// Project Name Normalizer - Frontend Version (Enhanced)
// Replicates the sophisticated backend normalizer for instant UI feedback
// Includes: Rusty AI prefix removal, smart hyphen/underscore handling, abbreviation detection

/**
 * Normalizes project names following the enhanced backend pattern
 * Enhanced for folder-safe names with intelligent abbreviation and spacing handling
 * @param {string} projectName - Raw project name to normalize
 * @returns {string} - Normalized project name
 */
export const normalizeProjectName = (projectName) => {
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

  // Remove Rusty AI diagnostic prefixes (enhanced)
  const rustyPrefixes = [
    // New emoji-based prefixes
    '🔧 ENHANCED EXTRACTION:',
    '🔄 RECOVERY EXTRACTION:',
    '🚨 BASIC EXTRACTION:',
    '📍 MULTI-ADDRESS:',
    '📧 SINGLE EMAIL:',
    // Legacy text-based prefixes
    '(basic extraction)',
    '(simple extraction)',
    '(fallback extraction)',
    '(failed extraction)',
    '(ai failed)',
    '(manual extraction)',
    '(recovered extraction)',
    '(partial extraction)',
    'basic extraction -',
    'simple extraction -',
    'fallback extraction -',
    'failed extraction -',
    'ai failed -',
    'manual extraction -',
    'recovered extraction -',
    'partial extraction -'
  ];
  
  // Remove prefixes (case insensitive, handle emojis)
  for (const prefix of rustyPrefixes) {
    // Escape special regex characters and handle emojis
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedPrefix}\\s*`, 'i');
    normalized = normalized.replace(regex, '');
  }
  
  // Additional cleanup for any remaining project numbering patterns
  normalized = normalized.replace(/^\s*-\s*Project\s+\d+\s*/i, '');
  normalized = normalized.replace(/^\s*Project\s+\d+\s*-?\s*/i, '');

  // Second pass: Remove all characters that aren't folder-safe
  // Allow only: letters, numbers, spaces, hyphens, underscores
  normalized = normalized.replace(/[^a-zA-Z0-9\s\-_]/g, ' ');

  // Third pass: Clean up whitespace and handle hyphens/underscores intelligently
  normalized = normalized
    .trim()                     // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ')       // Multiple spaces -> single space
    // Smart hyphen handling: preserve spaced hyphens, keep attached hyphens
    .replace(/\s+-\s+/g, ' - ') // Multiple spaces around hyphen -> single spaces
    .replace(/\s+-(?!\s)/g, ' -') // Space before hyphen, no space after -> add space after
    .replace(/(?<!\s)-\s+/g, '- ') // No space before hyphen, space after -> add space before
    // Smart underscore handling: never spaced (always attached)
    .replace(/\s*_\s*/g, '_');  // Any underscore pattern -> attached underscore

  return normalized;
};

/**
 * Smart abbreviation and proper case formatting for project names
 * @param {string} projectName - Raw project name to normalize
 * @returns {string} - Normalized and properly cased project name with smart abbreviations
 */
export const normalizeProjectNameWithProperCase = (projectName) => {
  const normalized = normalizeProjectName(projectName);
  
  // Common concatenation words that should be lowercase
  const concatenationWords = new Set([
    'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 
    'the', 'a', 'an', 'but', 'yet', 'so', 'nor', 'as', 'if', 'than', 'that'
  ]);
  
  // Common abbreviations that should remain uppercase
  const knownAbbreviations = new Set([
    'qly', 'abc', 'fkn', 'fscc', 'ltd', 'pty', 'llc', 'inc', 'corp',
    'co', 'govt', 'dept', 'univ', 'uni', 'tafe', 'rta', 'nsw', 'vic', 'qld',
    'wa', 'sa', 'nt', 'act', 'tas', 'usa', 'uk', 'nz', 'au', 'ca', 'fr',
    'de', 'jp', 'cn', 'it', 'es', 'br', 'mx', 'in', 'ru', 'za', 'eg',
    'diy', 'hvac', 'it', 'hr', 'pr', 'rd', 'qc', 'qa', 'ceo', 'cfo',
    'cto', 'coo', 'vp', 'gm', 'mgr', 'dir', 'sr', 'jr', 'ph', 'md',
    'phd', 'ba', 'ma', 'mba', 'bsc', 'msc', 'bcom', 'llb', 'jd',
    'st', 'ave', 'rd', 'dr', 'ln', 'ct', 'pl', 'cres', 'blvd', 'hwy',
    'north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw',
    'pov', 'roi', 'kpi', 'sla', 'api', 'ui', 'ux', 'seo', 'crm', 'erp',
    'acme', 'th1', 'th2', 'th3', // Added common construction abbreviations
    'art', 'nbhf' // Added business-specific abbreviations
  ]);
  
  /**
   * Determines if a word is likely an abbreviation based on pattern analysis
   * @param {string} word - Word to analyze
   * @returns {boolean} - True if likely an abbreviation
   */
  const isLikelyAbbreviation = (word) => {
    const lowerWord = word.toLowerCase();
    
    // Check known abbreviations first (case insensitive)
    if (knownAbbreviations.has(lowerWord)) {
      return true;
    }
    
    // Pattern-based detection
    const isAllCaps = word === word.toUpperCase();
    const isAllLower = word === word.toLowerCase();
    const isMixedCase = !isAllCaps && !isAllLower;
    const hasVowels = /[aeiou]/i.test(word);
    const length = word.length;
    
    // IMPORTANT: Preserve intentional all-caps abbreviations (business names, etc.)
    // If it's already all caps and 2-6 characters, likely intentional - keep as-is
    if (isAllCaps && length >= 2 && length <= 6) {
      return true;
    }
    
    // Rules for other abbreviation detection:
    // 1. Mixed case + 2-5 characters + known pattern (like Nbhf, Qld, etc.)
    if (isMixedCase && length >= 2 && length <= 5) {
      // Check if it's likely an abbreviation based on consonant density
      const consonants = word.replace(/[aeiou]/gi, '').length;
      const vowels = word.replace(/[^aeiou]/gi, '').length;
      // If more consonants than vowels and short, likely abbreviation
      if (consonants > vowels) {
        return true;
      }
    }
    
    // 2. Contains numbers and caps (like 5G, H1B, etc.)
    if (/\d/.test(word) && (isAllCaps || isMixedCase)) {
      return true;
    }
    
    // 3. Ends with common abbreviation patterns
    if (isAllCaps && (word.endsWith('LLC') || word.endsWith('LTD') || word.endsWith('INC'))) {
      return true;
    }
    
    return false;
  };
  
  /**
   * Determines if a word should be lowercase (concatenation word)
   * @param {string} word - Word to check
   * @param {number} index - Position in the sentence (0-based)
   * @param {number} totalWords - Total number of words
   * @returns {boolean} - True if should be lowercase
   */
  const shouldBeLowercase = (word, index, totalWords) => {
    const lowerWord = word.toLowerCase();
    
    // Don't make first word lowercase
    if (index === 0) {
      return false;
    }
    
    // Special case: if it's the last word and it's "the", make it lowercase
    // unless it's the only word in the sentence
    if (index === totalWords - 1 && lowerWord === 'the' && totalWords > 1) {
      return true;
    }
    
    // Don't make other last words lowercase  
    if (index === totalWords - 1) {
      return false;
    }
    
    return concatenationWords.has(lowerWord);
  };
  
  // Apply smart casing
  return normalized
    .toLowerCase()
    .split(' ')
    .map((word, index, words) => {
      if (word.length === 0) return word;
      
      // Handle underscore-separated words specially
      if (word.includes('_')) {
        return word.split('_').map(part => {
          if (part.length === 0) return part;
          
          // Check if this part is likely an abbreviation
          if (isLikelyAbbreviation(part)) {
            return part.toUpperCase();
          }
          
          // Apply standard proper case to the part
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }).join('_');
      }
      
      // Check if this should be a concatenation word (lowercase)
      if (shouldBeLowercase(word, index, words.length)) {
        return word.toLowerCase();
      }
      
      // Check if this is likely an abbreviation
      if (isLikelyAbbreviation(word)) {
        return word.toUpperCase();
      }
      
      // Apply standard proper case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Validates that a project name meets normalization standards
 * @param {string} projectName - Project name to validate
 * @returns {object} - { isValid: boolean, normalized: string, issues: string[] }
 */
export const validateProjectName = (projectName) => {
  const issues = [];
  
  if (!projectName || typeof projectName !== 'string') {
    issues.push('Project name must be a non-empty string');
    return { isValid: false, normalized: '', issues };
  }

  const normalized = normalizeProjectNameWithProperCase(projectName);
  
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

// Example usage in components:
/*
import { normalizeProjectName, normalizeProjectNameWithProperCase } from '../utils/projectNameNormalizer';

// Direct normalization (recommended for on-save normalization):
const cleanName = normalizeProjectNameWithProperCase("My Project, Name/Test");
// Result: "My Project Name_Test"

// Usage in component save handler:
const handleSave = () => {
  const normalizedName = normalizeProjectNameWithProperCase(projectName);
  setProjectName(normalizedName); // Update UI immediately
  // Send normalizedName to backend...
};
*/
