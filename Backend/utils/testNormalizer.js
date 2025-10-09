// Test script for project name normalizer
const { normalizeProjectName, normalizeProjectNameWithProperCase, validateProjectName } = require('./projectNameNormalizer');

// Test cases
const testCases = [
  "My Project, Name/Test",
  "Test	Project\nWith Tabs",
  "Project's Name.Extension",
  "Project%20With%20Spaces",
  "Multiple   Spaces,,,Here",
  "Mixed/Characters'Test.Name,Final"
];

console.log("🧪 Testing Project Name Normalizer");
console.log("==================================");

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: "${testCase}"`);
  
  const normalized = normalizeProjectName(testCase);
  const properCase = normalizeProjectNameWithProperCase(testCase);
  const validation = validateProjectName(testCase);
  
  console.log(`  Normalized: "${normalized}"`);
  console.log(`  Proper Case: "${properCase}"`);
  console.log(`  Valid: ${validation.isValid}`);
  if (validation.issues.length > 0) {
    console.log(`  Issues: ${validation.issues.join(', ')}`);
  }
});

console.log("\n✅ Test complete");
