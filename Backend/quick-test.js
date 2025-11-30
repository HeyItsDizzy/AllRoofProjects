// Enhanced test for underscore (never spaced), mixed case abbreviation, and intentional all-caps handling
const { normalizeProjectNameWithProperCase } = require('./utils/projectNameNormalizer');

const testCases = [
  // Intentional business abbreviations (should stay as-is)
  'ART Roofing Project - Brisbane',         // Should keep: ART
  'Lot 3 Bullen Range Road - ART Shed',     // Should keep: ART
  'NBHF Building Services Pty Ltd',         // Should keep: NBHF
  'QLD Government - ART Contract',          // Should keep: QLD, ART
  
  // Mixed case that should become uppercase
  'Art Roofing Project - Brisbane',         // Should become: ART
  'Lot 3 Bullen Range Road - art Shed',     // Should become: ART
  'nbhf Building Services Pty Ltd',         // Should become: NBHF
  
  // Original underscore tests (never spaced, but words treated separately)
  'Lot 3 Bullen Range Road_nbhf Shed',      // Should become: Road_NBHF
  'Lot 3 Bullen Range Road _ nbhf Shed',    // Should become: Road_NBHF
  'Lot 3 Bullen Range Road_ART Shed',       // Should keep: Road_ART
  
  // Control tests
  'Lot 3 Bullen Range Road - nbhf Shed',    // Should become: Road - NBHF
  'Lot 3 Bullen Range Road-nbhf Shed',      // Should become: Road-Nbhf (attached)
];

console.log('🧪 Enhanced Test: Intentional All-Caps, Underscore & Mixed Case Abbreviations');
console.log('=' .repeat(90));

testCases.forEach((testCase, index) => {
  const result = normalizeProjectNameWithProperCase(testCase);
  console.log(`Test ${index + 1}:`);
  console.log(`Input:  "${testCase}"`);
  console.log(`Output: "${result}"`);
  console.log('-'.repeat(70));
});

console.log('✅ Testing Complete!');