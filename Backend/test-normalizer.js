// Test script for enhanced project name normalizer
const { normalizeProjectName, normalizeProjectNameWithProperCase } = require('../utils/projectNameNormalizer');

console.log('🧪 Testing Enhanced Project Name Normalizer\n');

// Test cases with Rusty AI prefixes (including new emoji-based ones)
const testCases = [
  // New emoji-based prefixes
  '🔧 ENHANCED EXTRACTION: 14 Cameron Street Richmond',
  '🔄 RECOVERY EXTRACTION: ACME Roof Plumbing PTY LTD',
  '🚨 BASIC EXTRACTION: Quote Request',
  '📍 MULTI-ADDRESS: 123 Main Street - Project 2',
  '📧 SINGLE EMAIL: Construction Inquiry',
  
  // Legacy text-based prefixes
  '(basic extraction) 123 ABC Street Brisbane',
  '(simple extraction) 456 def road melbourne',
  'basic extraction - 789 GHI Avenue Sydney',
  'failed extraction - 321 jkl lane perth',
  '(ai failed) 654 MNO Court Adelaide',
  
  // Complex cases
  '🔧 ENHANCED EXTRACTION: Fwd: Quote no. 831 from ACME Roof Plumbing PTY LTD',
  '📍 MULTI-ADDRESS: Lot 4 8 Greer Road, Salisbury - Project 1',
  
  // Clean project names (should pass through)
  'ACME Building Services Ltd',
  '15 Glen Avon Dr Bannockburn',
  'QLD Roofing Solutions Pty Ltd',
  'NSW Department of Education',
  'ABC Company - Building Services',
  'TH1 Construction Group',
  'XYZ Holdings and Associates',
  'The Smith Building Company',
  'Jones Construction of Brisbane',
  '(fallback extraction) Rusty Test Project ABC',
  'Simple extraction - THE OLD BUILDING LLC'
];

console.log('Testing Basic Normalization (removes prefixes only):');
console.log('='.repeat(60));
testCases.forEach(testCase => {
  const result = normalizeProjectName(testCase);
  console.log(`Input:  "${testCase}"`);
  console.log(`Output: "${result}"`);
  console.log('');
});

console.log('\nTesting Enhanced Normalization (removes prefixes + proper case + abbreviations):');
console.log('='.repeat(80));
testCases.forEach(testCase => {
  const result = normalizeProjectNameWithProperCase(testCase);
  console.log(`Input:  "${testCase}"`);
  console.log(`Output: "${result}"`);
  console.log('');
});

console.log('✅ Testing Complete!');