# QuickBooks Integration Setup Guide

## Prerequisites
You need to create a QuickBooks app to get API credentials.

## Step 1: Create QuickBooks App

1. Go to [QuickBooks Developer Portal](https://developer.intuit.com/app/developer/qbo/docs/get-started)
2. Sign in with your Intuit account (or create one)
3. Click "Create an app" or go to "My Apps"
4. Select "QuickBooks Online and Payments" as the platform
5. Click "Create app"

## Step 2: Get Your Credentials

After creating your app:

1. Go to your app's dashboard
2. Navigate to "Keys & credentials" tab
3. You'll see:
   - **Client ID** (this is your QB_CONSUMER_KEY)
   - **Client Secret** (this is your QB_CONSUMER_SECRET)

## Step 3: Configure Redirect URI

In your QuickBooks app settings:

1. Go to "Keys & credentials"
2. Scroll down to "Redirect URIs"
3. Add your redirect URI:
   - Development: `http://localhost:5173/quickbooks/callback` (frontend dev server)
   - Production: `https://projects.allrooftakeoffs.com.au/quickbooks/callback` (production frontend)

**Note:** The redirect goes to the *frontend*, not the backend. The frontend receives the OAuth callback, then makes an API call to the backend to save the tokens. This allows you to access Production QuickBooks even when running backend in dev mode (localhost).

## Step 4: Update Backend .env File

Your `.env` file should already have these configured:

```env
# QuickBooks Integration
QB_CLIENT_ID=your_client_id_here
QB_CLIENT_SECRET=your_client_secret_here
QB_ENVIRONMENT=sandbox  # or 'production' for live QB account
QB_REDIRECT_URI=https://projects.allrooftakeoffs.com.au/quickbooks/callback
QB_REDIRECT_URI_DEV=http://localhost:5173/quickbooks/callback
```

## Step 5: Understand the Dev Mode Setup

When running in development mode (`npm run dev`):
- Backend runs on `localhost:5002`
- Frontend runs on `localhost:5173` (Vite dev server)
- Frontend proxies `/api/*` requests to backend at `localhost:5002`
- OAuth callback goes to frontend at `http://localhost:5173/quickbooks/callback`
- Frontend then makes API call to `/api/qb-company/save-connection` (proxied to backend)

This setup allows you to:
- **Access Production QuickBooks data** while backend is in dev mode
- Test OAuth flow locally before deploying
- Debug with actual QuickBooks data

## Step 6: Restart Your Backend Server

After adding the credentials:

```bash
cd Backend
npm run dev
```

## Step 6: Connect QuickBooks

1. Navigate to `/admin/quickbooks` in your app
2. Click "Connect QB" button
3. You'll be redirected to QuickBooks to authorize
4. After authorization, you'll be redirected back to your app

## Troubleshooting

### "QuickBooks credentials not configured" error
- Make sure you added the credentials to `.env` file (not `.env.template`)
- Restart your backend server after adding credentials
- Check that variable names are exact: `QB_CONSUMER_KEY`, `QB_CONSUMER_SECRET`, `QB_REDIRECT_URI`

### "Redirect URI mismatch" error
- Make sure the redirect URI in your .env matches exactly what you configured in QuickBooks app
- Include the protocol (http:// or https://)
- Check for trailing slashes

### OAuth fails silently
- Check browser console for errors
- Check backend server logs
- Verify your QuickBooks app is not in "Development" mode if you're trying to connect a production company

### Connection works but then disconnects
- QuickBooks tokens expire after 1 hour (access token) and 100 days (refresh token)
- The system automatically refreshes tokens, but if it fails repeatedly, you may need to reconnect

## Testing

To test your connection:
1. Connect QuickBooks via the admin panel
2. Click "Test Connection" - it should show the number of customers
3. Click "Sync Customers" - it should map QB customers to your MongoDB clients
4. Check the Activity Log for any errors

## Production Checklist

- [ ] Created QuickBooks app in production mode (not sandbox)
- [ ] Added production redirect URI to QuickBooks app
- [ ] Updated `.env` with production `QB_REDIRECT_URI`
- [ ] Tested OAuth flow in production
- [ ] Verified customer sync works
- [ ] Tested invoice creation

## Security Notes

- **Never commit your `.env` file to Git** - it contains secrets
- Store credentials securely (use environment variables in production)
- QuickBooks tokens are stored encrypted in MongoDB
- Refresh tokens are automatically rotated
- Failed authentication attempts are tracked and logged

## Support

For QuickBooks API documentation:
- [QuickBooks OAuth 2.0](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
- [QuickBooks API Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer)

For issues with this integration:
- Check backend logs: `Backend/logs/`
- Check frontend console
- Review Activity Log in `/admin/quickbooks`
