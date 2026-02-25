// src/hooks/useClientAccountStatus.js
/**
 * HOOK: useClientAccountStatus
 * 
 * Fetches and manages client account status (Active/Hold)
 * Returns account status and helper functions for checking restrictions
 */

import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../auth/AuthProvider';
import useAxiosSecure from './AxiosSecure/useAxiosSecure';

export const useClientAccountStatus = () => {
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  
  const [accountStatus, setAccountStatus] = useState('Active');
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState(null);

  useEffect(() => {
    const fetchClientStatus = async () => {
      // Three-tier fallback for finding client ID
      let clientId = user?.linkedClient; // Try singular field first (legacy)
      
      if (!clientId && user?.linkedClients?.length > 0) {
        clientId = user.linkedClients[0]; // Try array format
        console.log('✅ Using linkedClients[0]:', clientId);
      }
      
      if (!clientId && user?.company) {
        // Fetch by company name
        try {
          const response = await axiosSecure.get('/clients', { 
            params: { search: user.company } 
          });
          const matchingClient = response.data?.find(c => c.name === user.company);
          if (matchingClient) {
            clientId = matchingClient._id;
            console.log('✅ Found client by company name:', user.company, '→', clientId);
          }
        } catch (error) {
          console.error('❌ Error searching client by company name:', error);
        }
      }
      
      if (!clientId) {
        console.log('⚠️ useClientAccountStatus: No linkedClient found for user', {
          userName: user?.name,
          linkedClients: user?.linkedClients,
          linkedClient: user?.linkedClient,
          company: user?.company
        });
        setLoading(false);
        return;
      }

      try {
        // Fetch client information including accountStatus
        console.log('🔍 Fetching client data from /clients/' + clientId);
        const response = await axiosSecure.get(`/clients/${clientId}`);
        console.log('📦 Client response data:', response.data);
        
        // Handle both response formats: direct client object or {success: true, client: {...}}
        const clientData = response.data?.client || response.data;
        
        if (clientData) {
          setClientInfo(clientData);
          setAccountStatus(clientData.accountStatus || 'Active');
          console.log('✅ useClientAccountStatus: Fetched client status', {
            clientId,
            clientName: clientData.name,
            accountStatus: clientData.accountStatus || 'Active',
            isOnHold: (clientData.accountStatus || 'Active') === 'Hold'
          });
        }
      } catch (error) {
        console.error('❌ useClientAccountStatus: Error fetching client account status:', error);
        // Default to Active on error to prevent false lockouts
        setAccountStatus('Active');
      } finally {
        setLoading(false);
      }
    };

    fetchClientStatus();
  }, [user?.linkedClients, user?.linkedClient, user?.company, axiosSecure]);

  // Helper: Check if account is on hold
  const isOnHold = accountStatus === 'Hold';

  // Helper: Check if a feature should be blocked
  const isFeatureBlocked = (featureName) => {
    if (!isOnHold) return false;

    // Features blocked when on hold
    const blockedFeatures = [
      'fileDownload',      // Block downloading files
      'fileUpload',        // Block uploading new files
      'createNewProject',  // Block creating new projects
      // Note: Preview (images/PDFs) is allowed
      // Note: Project status updates work normally (ART: prefix prevents updates automatically)
    ];

    const blocked = blockedFeatures.includes(featureName);
    if (blocked) {
      console.log(`🚫 Feature "${featureName}" is BLOCKED (account on hold)`);
    }
    return blocked;
  };

  console.log('🔍 useClientAccountStatus returning:', { 
    accountStatus, 
    isOnHold, 
    userLinkedClients: user?.linkedClients,
    userLinkedClient: user?.linkedClient,
    userName: user?.name 
  });

  return {
    accountStatus,
    isOnHold,
    isFeatureBlocked,
    clientInfo,
    loading
  };
};
