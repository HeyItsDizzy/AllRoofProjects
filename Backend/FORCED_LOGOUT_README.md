# Forced User Logout on Deployment

This system ensures that when you deploy a new version of your web application, all existing users are automatically logged out and forced to refresh their browsers. This prevents compatibility issues between old cached frontend code and new backend APIs.

## How It Works

### 1. Version Checking System
- **Backend**: Each deployment generates a unique version number and deployment ID
- **Frontend**: Sends its version number with every API request
- **Middleware**: Backend checks version compatibility and rejects outdated requests

### 2. Automatic User Logout
- **Version Mismatch**: Users with outdated versions get HTTP 426 (Upgrade Required)
- **Deployment Change**: New deployment ID forces all users to refresh
- **Periodic Checks**: Frontend checks for updates every 5 minutes
- **Real-time Detection**: API calls immediately detect version mismatches

### 3. Multiple Logout Strategies

#### Strategy 1: Version-Based Logout (Recommended)
- Updates version numbers on both frontend and backend
- Automatic detection and forced refresh
- User-friendly update prompts

#### Strategy 2: JWT Secret Rotation (Nuclear Option)
- Rotates JWT secret to invalidate all tokens
- Immediate logout for all users
- Use for security updates or major changes

## Quick Deployment

### Windows Users
```bash
cd y:\Backend
npm run deploy:logout:win
```

### Linux/Mac Users
```bash
cd y:/Backend
npm run deploy:logout
```

### Manual Steps
1. Update version numbers in:
   - `y:\Backend\config\version.js`
   - `c:\Coding\AllRoofsWebApps\ProjectManagerApp\Frontend\src\config\version.js`

2. Build frontend:
   ```bash
   cd "c:\Coding\AllRoofsWebApps\ProjectManagerApp\Frontend"
   npm run build
   ```

3. Deploy both frontend and backend to production

## Configuration

### Version Numbers
- Format: `Major.Minor.Timestamp` (e.g., "1.2.1694567890")
- Backend: `y:\Backend\config\version.js`
- Frontend: `c:\Coding\AllRoofsWebApps\ProjectManagerApp\Frontend\src\config\version.js`

### Check Interval
- Default: 5 minutes
- Configure in: `AuthProvider.jsx` → `versionService.startPeriodicCheck(5)`

### Public Routes (No Version Check)
- `/login`
- `/register`
- `/reset-password`
- `/version`

## User Experience

### Update Available
```
🔄 App Update Available
A new version of the application is available. 
Please refresh to get the latest features and fixes.

[Refresh Now] [Later]
```

### Forced Update
```
⚠️ Version Outdated
Your app version is outdated. Please refresh 
the application to continue.

[Refresh App]
```

## Development Workflow

### Regular Deployment
1. Make your code changes
2. Run deployment script: `npm run deploy:logout:win`
3. Deploy to production
4. All users automatically get the update

### Emergency Security Update
1. Run deployment script with JWT rotation
2. Deploy immediately
3. All users immediately logged out

### Testing
- Version info endpoint: `GET /api/version`
- Manual version check: `versionService.manualCheck()`

## Technical Details

### API Headers
- `X-App-Version`: Client version number
- `X-Deployment-Id`: Unique deployment identifier

### HTTP Status Codes
- `426 Upgrade Required`: Version mismatch detected
- `401 Unauthorized`: Session expired (role changes)

### Error Codes
- `VERSION_REQUIRED`: Client didn't send version
- `VERSION_OUTDATED`: Client version too old
- `DEPLOYMENT_MISMATCH`: New deployment detected

## Troubleshooting

### Users Not Logging Out
1. Check version numbers match between frontend/backend
2. Verify CORS allows version headers
3. Check browser console for errors

### False Positives
1. Ensure deployment script updates both frontend and backend
2. Check for caching issues in CDN/proxy

### Emergency Disable
Comment out version check middleware in `index.js`:
```javascript
// app.use("/api", checkVersion());
```

## Security Benefits

1. **Prevents API Compatibility Issues**: Old frontend can't call new backend APIs
2. **Forces Security Updates**: Critical patches reach all users immediately  
3. **Reduces Support Burden**: No mixed-version troubleshooting
4. **Clean State**: Fresh sessions after major changes

## Best Practices

1. **Test in Staging**: Verify version checking works before production
2. **Inform Users**: Announce major updates beforehand
3. **Monitor Logs**: Watch for version mismatch patterns
4. **Quick Rollback**: Keep previous version config for emergencies
5. **Document Changes**: Note what triggered the forced logout