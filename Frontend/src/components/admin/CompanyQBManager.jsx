/**
 * Company QuickBooks Management Component
 * Admin interface for single-company QB integration
 */

import React, { useState, useEffect } from 'react';
import useAxiosSecure from '../../hooks/AxiosSecure/useAxiosSecure';

const CompanyQBManager = () => {
  const axios = useAxiosSecure(); // Use secure axios with auth token
  const [qbStatus, setQbStatus] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);

  // Uses axios with baseURL already set to http://localhost:5002/api in dev
  // So paths like '/qb-company/status' become 'http://localhost:5002/api/qb-company/status'
  
  useEffect(() => {
    console.log('[QB MANAGER] Component initialized - axios baseURL includes /api');
    const loadInitialData = async () => {
      try {
        // Check for OAuth callback parameters
        const urlParams = new URLSearchParams(window.location.search);
        const connected = urlParams.get('connected');
        const error = urlParams.get('error');
        
        if (connected === 'true') {
          addLog('✅ QuickBooks connected successfully!');
          // Clear URL parameters
          window.history.replaceState({}, '', '/admin/quickbooks');
        } else if (error) {
          addLog('❌ Connection failed: ' + decodeURIComponent(error));
          // Clear URL parameters
          window.history.replaceState({}, '', '/admin/quickbooks');
        }
        
        await Promise.all([fetchQBStatus(), fetchMappings()]);
      } catch (error) {
        console.error('Failed to load initial data:', error);
        addLog('❌ Failed to load initial data: ' + error.message);
      }
    };
    
    loadInitialData();
  }, []);

  const fetchQBStatus = async () => {
    try {
      const response = await axios.get('/qb-company/status');
      // Ensure we have a valid data structure
      const data = response.data || {};
      setQbStatus({
        connection: data.connection || {},
        stats: data.stats || {}
      });
    } catch (error) {
      console.error('Failed to fetch QB status:', error);
      // Set default state on error
      setQbStatus({
        connection: { connected: false },
        stats: {}
      });
    }
  };

  const fetchMappings = async () => {
    try {
      const response = await axios.get('/qb-company/client-mappings');
      const mappings = response.data?.mappings || [];
      // Ensure mappings are properly formatted
      const safeMappings = mappings.map(mapping => ({
        clientId: mapping.clientId || '',
        clientName: String(mapping.clientName || 'Unknown'),
        qbCustomerName: String(mapping.qbCustomerName || 'Unknown'),
        verified: Boolean(mapping.verified),
        autoMapped: Boolean(mapping.autoMapped)
      }));
      setMappings(safeMappings);
    } catch (error) {
      console.error('Failed to fetch mappings:', error);
      setMappings([]);
    }
  };

  const connectQuickBooks = async () => {
    try {
      setLoading(true);
      addLog('🔄 Initiating QuickBooks connection...');
      
      const response = await axios.get('/qb-company/connect');
      
      if (response.data.success && response.data.authUri) {
        addLog('✅ Redirecting to QuickBooks authorization...');
        // Use full page redirect instead of popup (more reliable)
        window.location.href = response.data.authUri;
      } else {
        throw new Error('Failed to get authorization URL from server');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      const errorMsg = error.response?.data?.error || error.message;
      addLog('❌ QuickBooks connection failed: ' + errorMsg);
      
      // Check if it's a configuration error
      if (errorMsg.includes('credentials not configured') || errorMsg.includes('MISSING')) {
        addLog('⚠️ QuickBooks app credentials are not configured in the backend.');
        addLog('📝 Please set QB_CLIENT_ID and QB_CLIENT_SECRET in your .env file.');
        addLog('🔗 Get credentials from: https://developer.intuit.com/app/developer/qbo/docs/get-started');
      }
      
      setLoading(false);
    }
  };

  const disconnectQuickBooks = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks?')) return;
    
    try {
      setLoading(true);
      await axios.delete('/qb-company/disconnect');
      await fetchQBStatus();
      addLog('✅ QuickBooks disconnected');
    } catch (error) {
      console.error('Disconnect failed:', error);
      addLog('❌ Disconnect failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/qb-company/test-connection');
      addLog(`✅ Connection test successful - ${response.data.customerCount} customers found`);
    } catch (error) {
      console.error('Connection test failed:', error);
      addLog('❌ Connection test failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testHealth = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/qb-company/health');
      if (response.data.success) {
        setHealthStatus('✅ Backend is responding');
        addLog(`✅ Health check passed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus('❌ Backend not responding');
      addLog('❌ Health check failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const syncCustomers = async () => {
    try {
      setSyncing(true);
      addLog('🔄 Syncing QB customers with MongoDB clients...');
      
      const response = await axios.post('/qb-company/sync-customers');
      const result = response.data.result;
      
      addLog(`✅ Customer sync complete: ${result.newMappings} new mappings, ${result.existingMappings} existing`);
      await fetchMappings();
    } catch (error) {
      console.error('Customer sync failed:', error);
      addLog('❌ Customer sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const syncInvoices = async () => {
    try {
      setSyncing(true);
      addLog('🔄 Syncing all QB invoices to MongoDB...');
      
      const response = await axios.post('/qb-company/sync-invoices');
      const result = response.data.result;
      
      addLog(`✅ Invoice sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);
      await fetchQBStatus();
    } catch (error) {
      console.error('Invoice sync failed:', error);
      addLog('❌ Invoice sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const verifyMapping = async (clientId) => {
    try {
      await axios.post(`/qb-company/verify-mapping/${clientId}`);
      addLog('✅ Mapping verified');
      await fetchMappings();
    } catch (error) {
      console.error('Verification failed:', error);
      addLog('❌ Mapping verification failed: ' + error.message);
    }
  };

  const addLog = (message) => {
    setLogs(prev => [
      { time: new Date().toLocaleTimeString(), message },
      ...prev.slice(0, 19) // Keep last 20 logs
    ]);
  };

  const ConnectionStatus = () => {
    if (!qbStatus) return <div className="text-gray-500">Loading...</div>;
    
    const connection = qbStatus.connection || {};
    const stats = qbStatus.stats || {};
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">QuickBooks Connection Status</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`flex items-center p-3 rounded-lg ${connection.connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <div className={`w-3 h-3 rounded-full mr-3 ${connection.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">{connection.connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          <div className={`flex items-center p-3 rounded-lg ${connection.needsRefresh ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
            <span className="font-medium">{connection.needsRefresh ? 'Token Needs Refresh' : 'Token Valid'}</span>
          </div>
        </div>
        
        {connection.connected && (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Invoices</div>
              <div className="font-semibold text-lg">{stats.totalInvoices || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">QB Synced</div>
              <div className="font-semibold text-lg">{stats.qbInvoices || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">Clients</div>
              <div className="font-semibold text-lg">{stats.totalClients || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">Mapped</div>
              <div className="font-semibold text-lg">{connection.mappedClients || 0}</div>
            </div>
          </div>
        )}
        
        {connection.lastSync && (
          <div className="mt-4 text-sm text-gray-600">
            Last sync: {new Date(connection.lastSync).toLocaleString()}
          </div>
        )}
      </div>
    );
  };

  const ActionButtons = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">QuickBooks Actions</h2>
      
      {healthStatus && (
        <div className={`mb-3 p-2 rounded text-sm ${healthStatus.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {healthStatus}
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Health check button - always visible for debugging */}
        <button
          onClick={testHealth}
          disabled={loading}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Health Check'}
        </button>
        
        {!qbStatus?.connection?.connected ? (
          <button
            onClick={connectQuickBooks}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect QB'}
          </button>
        ) : (
          <>
            <button
              onClick={testConnection}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              onClick={syncCustomers}
              disabled={syncing || loading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Customers'}
            </button>
            
            <button
              onClick={syncInvoices}
              disabled={syncing || loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Invoices'}
            </button>
            
            <button
              onClick={disconnectQuickBooks}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );

  const ClientMappings = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Client to Customer Mappings</h2>
      
      {mappings.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No mappings found. Connect QuickBooks and sync customers first.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">MongoDB Client</th>
                <th className="text-left p-2">QB Customer</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{String(mapping.clientName || 'Unknown')}</td>
                  <td className="p-2">{String(mapping.qbCustomerName || 'Unknown')}</td>
                  <td className="p-2">
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        mapping.verified 
                          ? 'bg-green-100 text-green-700' 
                          : mapping.autoMapped 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {mapping.verified ? 'Verified' : mapping.autoMapped ? 'Auto-mapped' : 'Manual'}
                      </span>
                    </div>
                  </td>
                  <td className="p-2">
                    {!mapping.verified && (
                      <button
                        onClick={() => verifyMapping(mapping.clientId)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const ActivityLog = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
      
      <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-sm">No activity yet</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="text-sm mb-2 flex">
              <span className="text-gray-400 mr-3 flex-shrink-0">{String(log.time || '')}</span>
              <span className="flex-1">{String(log.message || '')}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">QuickBooks Company Integration</h1>
        <div className="text-sm text-gray-500">
          Single-company QB integration for All Roof Takeoffs
        </div>
      </div>
      
      <ConnectionStatus />
      <ActionButtons />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClientMappings />
        <ActivityLog />
      </div>
    </div>
  );
};

export default CompanyQBManager;