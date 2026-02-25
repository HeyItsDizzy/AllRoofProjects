// Test script to verify table preferences persistence
// Run this in the browser console on the JobBoard page

console.log('🧪 Testing Table Preferences Persistence...');

// Get the current user from AuthContext
const user = JSON.parse(localStorage.getItem('authUser'));
console.log('👤 Current user:', user ? user.name : 'Not logged in');

// Check if localStorage has jobBoard preferences
const localPrefs = localStorage.getItem('jobBoardPreferences');
console.log('💾 Local storage preferences:', localPrefs ? JSON.parse(localPrefs) : 'None');

// Test the API endpoints
const testAPI = async () => {
  const authToken = localStorage.getItem('authToken');
  const baseURL = window.location.origin;
  
  try {
    // Test GET endpoint
    console.log('📥 Testing GET /users/table-preferences...');
    const getResponse = await fetch(`${baseURL}/api/users/table-preferences?tableKey=jobBoard`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const getData = await getResponse.json();
    console.log('✅ GET Response:', getData);
    
    // Test POST endpoint with dummy data
    console.log('📤 Testing POST /users/table-preferences...');
    const testPrefs = {
      columnSizing: { test: 100 },
      sorting: [],
      columnFilters: [],
      zoomLevel: 110
    };
    
    const postResponse = await fetch(`${baseURL}/api/users/table-preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tableKey: 'jobBoard',
        preferences: testPrefs
      })
    });
    const postData = await postResponse.json();
    console.log('✅ POST Response:', postData);
    
    // Verify the data was saved
    console.log('🔄 Verifying data was saved...');
    const verifyResponse = await fetch(`${baseURL}/api/users/table-preferences?tableKey=jobBoard`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const verifyData = await verifyResponse.json();
    console.log('✅ Verification Response:', verifyData);
    
    if (verifyData.preferences && verifyData.preferences.zoomLevel === 110) {
      console.log('🎉 Table preferences are working correctly!');
    } else {
      console.log('❌ Table preferences are not persisting correctly');
    }
    
  } catch (error) {
    console.error('❌ API Test failed:', error);
  }
};

// Run the test if user is logged in
if (user && localStorage.getItem('authToken')) {
  testAPI();
} else {
  console.log('❌ Please log in first to test table preferences');
}

console.log(`
📋 MANUAL TEST STEPS:
1. Adjust column widths in the JobBoard
2. Change the zoom level
3. Refresh the page (F5)
4. Check if your settings persist
5. Restart the server and test again

If settings persist after server restart, the fix is working! ✅
`);