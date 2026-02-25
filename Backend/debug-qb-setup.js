// QB Diagnostic Script
console.log('🔍 QuickBooks Integration Diagnostic Tool\n');

// Check environment variables
const requiredEnvVars = [
  'QB_CLIENT_ID',
  'QB_CLIENT_SECRET', 
  'QB_REDIRECT_URI',
  'QB_ENVIRONMENT'
];

console.log('📋 Environment Variable Check:');
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  const status = value ? '✅' : '❌';
  const displayValue = envVar.includes('SECRET') ? 
    (value ? `${value.substring(0, 8)}...` : 'NOT SET') : 
    (value || 'NOT SET');
  
  console.log(`${status} ${envVar}: ${displayValue}`);
});

console.log('\n🔗 Configuration Summary:');
console.log('Environment:', process.env.QB_ENVIRONMENT || 'sandbox');
console.log('Client ID:', process.env.QB_CLIENT_ID?.substring(0, 20) + '...' || 'NOT SET');
console.log('Redirect URI:', process.env.QB_REDIRECT_URI || 'NOT SET');

// Test OAuth client creation
try {
  const OAuthClient = require('intuit-oauth');
  
  const oauthClient = new OAuthClient({
    clientId: process.env.QB_CLIENT_ID,
    clientSecret: process.env.QB_CLIENT_SECRET,
    environment: process.env.QB_ENVIRONMENT || 'sandbox',
    redirectUri: process.env.QB_REDIRECT_URI
  });

  // Test auth URL generation
  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: 'test-state'
  });

  console.log('\n✅ OAuth Client Creation: SUCCESS');
  console.log('🔗 Sample Auth URL:', authUri.substring(0, 100) + '...');
  
} catch (error) {
  console.log('\n❌ OAuth Client Creation: FAILED');
  console.error('Error:', error.message);
}

console.log('\n📝 Next Steps:');
console.log('1. Verify all environment variables are set');
console.log('2. Check QuickBooks Developer Dashboard settings');
console.log('3. Ensure redirect URI matches exactly');
console.log('4. Verify app is published/active in sandbox');
console.log('5. Check backend server logs during OAuth flow');