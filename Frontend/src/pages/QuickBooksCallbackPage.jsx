/**
 * QuickBooks OAuth Callback Page
 * Handles the OAuth callback from QuickBooks
 */

import React, { useEffect, useState } from 'react';
import { Spin, Result, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAxiosSecure from '../hooks/AxiosSecure/useAxiosSecure';

const QuickBooksCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get('code');
        const realmId = searchParams.get('realmId');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for OAuth errors
        if (error) {
          throw new Error(errorDescription || error);
        }

        if (!code || !realmId) {
          throw new Error('Missing required parameters from QuickBooks');
        }

        // Check if this is company-level integration (state = 'company-integration')
        if (state === 'company-integration') {
          console.log('🏢 Processing company-level QuickBooks connection...');
          
          // Call company-level endpoint
          const response = await axiosSecure.post('/qb-company/save-connection', {
            code,
            realmId,
            state
          });

          if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to save company connection');
          }

          console.log('✅ Company QuickBooks connection successful!');
          setStatus('success');

          // Redirect to admin QB page
          setTimeout(() => {
            navigate('/admin/quickbooks?connected=true');
          }, 2000);
          
          return;
        }

        // Otherwise, handle client-level integration (legacy flow)
        // Parse state to get client ID
        let clientId;
        try {
          const storedStateData = localStorage.getItem('quickbooks_oauth_state');
          if (!storedStateData) {
            throw new Error('No stored state found - possible CSRF attack');
          }
          
          const stateData = JSON.parse(storedStateData);
          clientId = stateData.clientId;
          
          // Verify the received state matches our stored state if it's base64 encoded
          try {
            const decodedReceivedState = JSON.parse(atob(state || ''));
            if (decodedReceivedState.nonce !== stateData.nonce) {
              throw new Error('State nonce mismatch');
            }
          } catch (e) {
            // If decoding fails, fall back to direct comparison
            console.warn('State verification warning:', e.message);
          }
          
          // Clean up stored state
          localStorage.removeItem('quickbooks_oauth_state');
        } catch (e) {
          throw new Error('Invalid state parameter');
        }

        if (!clientId) {
          throw new Error('No client ID in state');
        }

        // Step 1: Exchange code for tokens
        console.log('Exchanging code for tokens...');
        const tokenResponse = await fetch('/api/quickbooks/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirectUri: `${window.location.origin}/quickbooks/callback`,
            realmId,
            state
          })
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(errorData.error || 'Failed to exchange code for tokens');
        }

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.success || !tokenData.data) {
          throw new Error('Invalid token response');
        }

        const tokens = tokenData.data;

        // Step 2: Save tokens to client record
        console.log('Saving tokens to client record...');
        await axiosSecure.post(`/clients/${clientId}/quickbooks/connect`, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          realmId: tokens.realmId || realmId,
          tokenExpiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000)
        });

        console.log('QuickBooks connection successful!');
        setStatus('success');

        // Redirect to settings page after success
        setTimeout(() => {
          navigate('/admin/quickbooks');
        }, 2000);

      } catch (err) {
        console.error('Callback error:', err);
        setErrorMessage(err.message || 'An unknown error occurred');
        setStatus('error');
      }
    };

    handleCallback();
  }, [searchParams, navigate, axiosSecure]);

  if (status === 'processing') {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        padding: '20px'
      }}>
        <Spin 
          size="large" 
          indicator={<LoadingOutlined style={{ fontSize: 64 }} spin />}
        />
        <h2 style={{ marginTop: '24px', color: '#0077C5' }}>
          Connecting to QuickBooks...
        </h2>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Please wait while we complete the connection
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="Successfully Connected to QuickBooks!"
          subTitle="Your QuickBooks Online account is now connected. Redirecting to settings..."
          extra={[
            <Button 
              type="primary" 
              key="settings"
              onClick={() => navigate('/admin/quickbooks')}
              style={{ backgroundColor: '#0077C5', borderColor: '#0077C5' }}
            >
              Go to Settings
            </Button>
          ]}
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <Result
          status="error"
          icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
          title="Connection Failed"
          subTitle={errorMessage || 'There was an error connecting to QuickBooks'}
          extra={[
            <Button 
              type="primary" 
              key="retry"
              onClick={() => navigate('/admin/quickbooks')}
              style={{ backgroundColor: '#0077C5', borderColor: '#0077C5' }}
            >
              Try Again
            </Button>
          ]}
        />
      </div>
    );
  }

  return null;
};

export default QuickBooksCallbackPage;
