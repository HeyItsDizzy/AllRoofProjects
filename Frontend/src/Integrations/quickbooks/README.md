# QuickBooks Integration

This folder contains a complete QuickBooks Online integration for your React application, based on the official Intuit OAuth2.0 JS client library.

## Files Overview

### Core Integration Files

- **`QuickBooksClient.js`** - Main client class for QuickBooks OAuth and API operations
- **`useQuickBooksAuth.js`** - React hook for managing QuickBooks authentication
- **`QuickBooksService.js`** - Service layer with common QuickBooks operations
- **`config.js`** - Configuration constants and environment settings
- **`utils.js`** - Utility functions for data transformation and error handling
- **`components.jsx`** - Pre-built React components for QuickBooks integration
- **`index.js`** - Main export file

## Setup Instructions

### 1. Environment Variables

Add these environment variables to your `.env` file:

```env
# QuickBooks OAuth Configuration
REACT_APP_QB_CLIENT_ID=your_quickbooks_client_id
REACT_APP_QB_CLIENT_SECRET=your_quickbooks_client_secret
REACT_APP_QB_ENVIRONMENT=sandbox
REACT_APP_QB_REDIRECT_URI=http://localhost:3000/quickbooks/callback
```

### 2. Backend API Endpoints

You'll need to create backend API endpoints to handle token exchange (since client secrets should not be exposed in frontend). Create these endpoints:

- `POST /api/quickbooks/token` - Exchange authorization code for tokens
- `POST /api/quickbooks/refresh` - Refresh access token
- `POST /api/quickbooks/revoke` - Revoke tokens

### 3. Router Setup

Add a route for the OAuth callback in your React Router:

```jsx
import { QuickBooksCallback } from './Integrations/quickbooks';

// In your App.js or router configuration
<Route 
  path="/quickbooks/callback" 
  element={
    <QuickBooksCallback 
      onSuccess={(tokenData) => console.log('Connected!', tokenData)}
      onError={(error) => console.error('Connection failed:', error)}
    />
  } 
/>
```

## Usage Examples

### Basic Authentication

```jsx
import { useQuickBooksAuth, QuickBooksConnectButton } from './Integrations/quickbooks';

function MyComponent() {
  const { isAuthenticated, companyInfo } = useQuickBooksAuth();

  return (
    <div>
      {!isAuthenticated ? (
        <QuickBooksConnectButton 
          onSuccess={() => console.log('Connected!')}
          onError={(error) => console.error(error)}
        />
      ) : (
        <div>
          <h3>Connected to {companyInfo?.CompanyName}</h3>
        </div>
      )}
    </div>
  );
}
```

### Using the Service Layer

```jsx
import { createQuickBooksService, useQuickBooksAuth } from './Integrations/quickbooks';

function CustomersList() {
  const { client, isAuthenticated } = useQuickBooksAuth();
  const [customers, setCustomers] = useState([]);
  
  useEffect(() => {
    if (isAuthenticated) {
      const service = createQuickBooksService(client);
      service.getAllCustomers()
        .then(setCustomers)
        .catch(console.error);
    }
  }, [isAuthenticated, client]);

  return (
    <div>
      {customers.map(customer => (
        <div key={customer.Id}>{customer.Name}</div>
      ))}
    </div>
  );
}
```

### Creating Invoices

```jsx
import { createQuickBooksService } from './Integrations/quickbooks';

const service = createQuickBooksService();

const invoiceData = {
  customerId: '123',
  lineItems: [
    {
      itemId: '456',
      itemName: 'Service',
      quantity: 1,
      unitPrice: 100.00,
      amount: 100.00
    }
  ],
  dueDate: '2024-12-31',
  docNumber: 'INV-001'
};

service.createInvoice(invoiceData)
  .then(invoice => console.log('Invoice created:', invoice))
  .catch(error => console.error('Error creating invoice:', error));
```

## Available Methods

### QuickBooksClient
- `getAuthorizationUri(options)` - Get OAuth authorization URL
- `exchangeCodeForToken(code, realmId, state)` - Exchange auth code for tokens
- `refreshToken()` - Refresh access token
- `makeApiCall(options)` - Make authenticated API calls
- `getCompanyInfo()` - Get company information
- `revokeToken()` - Revoke access token

### QuickBooksService
- **Customers**: `getAllCustomers()`, `createCustomer()`, `updateCustomer()`
- **Items**: `getAllItems()`, `createItem()`
- **Invoices**: `getAllInvoices()`, `createInvoice()`, `sendInvoice()`
- **Estimates**: `getAllEstimates()`, `createEstimate()`, `convertEstimateToInvoice()`
- **Payments**: `getAllPayments()`, `createPayment()`
- **Reports**: `getProfitAndLossReport()`, `getBalanceSheetReport()`
- **Utilities**: `searchEntities()`, `getEntityById()`

### React Components
- `QuickBooksConnectButton` - OAuth connection button
- `QuickBooksStatus` - Connection status display
- `QuickBooksCallback` - OAuth callback handler
- `QuickBooksCompanyInfo` - Company information display
- `QuickBooksIntegration` - Complete integration component

## Backend Implementation Example

Here's a basic Node.js/Express backend implementation for the required endpoints:

```javascript
const express = require('express');
const OAuthClient = require('intuit-oauth');

const app = express();
app.use(express.json());

const oauthClient = new OAuthClient({
  clientId: process.env.QB_CLIENT_ID,
  clientSecret: process.env.QB_CLIENT_SECRET,
  environment: process.env.QB_ENVIRONMENT || 'sandbox',
  redirectUri: process.env.QB_REDIRECT_URI
});

// Exchange authorization code for tokens
app.post('/api/quickbooks/token', async (req, res) => {
  try {
    const { code, redirectUri, realmId, state } = req.body;
    const authResponse = await oauthClient.createToken(`${redirectUri}?code=${code}&realmId=${realmId}&state=${state}`);
    res.json(authResponse.getToken());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Refresh access token
app.post('/api/quickbooks/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    oauthClient.getToken().refresh_token = refresh_token;
    const authResponse = await oauthClient.refresh();
    res.json(authResponse.getToken());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Revoke tokens
app.post('/api/quickbooks/revoke', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    oauthClient.getToken().refresh_token = refresh_token;
    await oauthClient.revoke();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## Installation

If you need to install the base Intuit OAuth library for your backend:

```bash
npm install intuit-oauth --save
```

## Security Notes

- Never expose your client secret in frontend code
- Always handle token exchange on the backend
- Store tokens securely
- Implement proper error handling
- Use HTTPS in production
- Validate all user inputs

## QuickBooks Developer Setup

1. Create a QuickBooks app at [developer.intuit.com](https://developer.intuit.com)
2. Get your Client ID and Client Secret
3. Configure redirect URIs in your app settings
4. Test in sandbox environment first
5. Apply for production access when ready

## Scopes

Common scope combinations:
- **Basic**: `com.intuit.quickbooks.accounting` + `openid`
- **Full Access**: Add `com.intuit.quickbooks.payment` + `profile` + `email`
- **Payroll**: `com.intuit.quickbooks.payroll` + related scopes

## Error Handling

The integration includes comprehensive error handling:
- Authentication errors
- API rate limiting
- Network timeouts
- Invalid data validation
- Token expiration
- QuickBooks-specific errors

## Support

For QuickBooks API documentation, visit:
- [QuickBooks Online API Documentation](https://developer.intuit.com/app/developer/qbo/docs/api)
- [OAuth 2.0 for QuickBooks Online](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
- [API Explorer](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used)