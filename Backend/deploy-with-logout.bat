@echo off
setlocal enabledelayedexpansion

REM Deployment script for forcing user logout on new releases
echo 🚀 Starting deployment with forced user logout...

REM Get current timestamp for versioning
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "Sec=%dt:~12,2%"

set "timestamp=%YYYY%%MM%%DD%%HH%%Min%%Sec%"
set "NEW_VERSION=1.2.%timestamp%"

echo 📅 Deployment Date: %YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%
echo 🔢 New Version: %NEW_VERSION%

REM Update backend version
echo 🔧 Updating backend version...
(
echo // Version management for forced logout on deployments
echo const crypto = require('crypto'^);
echo.
echo // This should be updated on each deployment
echo const APP_VERSION = "%NEW_VERSION%"; // Updated on %date% %time%
echo const DEPLOYMENT_DATE = new Date(^).toISOString(^);
echo.
echo // Generate a unique deployment ID (regenerated on each deployment^)
echo const DEPLOYMENT_ID = crypto.randomBytes(16^).toString('hex'^);
echo.
echo // Minimum supported version (older versions will be forced to logout^)
echo const MIN_SUPPORTED_VERSION = "%NEW_VERSION%";
echo.
echo module.exports = {
echo   APP_VERSION,
echo   DEPLOYMENT_DATE,
echo   DEPLOYMENT_ID,
echo   MIN_SUPPORTED_VERSION,
echo.  
echo   // Helper function to check if version is supported
echo   isVersionSupported: (clientVersion^) =^> {
echo     if (^!clientVersion^) return false;
echo.    
echo     // Simple version comparison (assumes semantic versioning^)
echo     const parseVersion = (v^) =^> v.split('.'^).map(Number^);
echo     const clientParts = parseVersion(clientVersion^);
echo     const minParts = parseVersion(MIN_SUPPORTED_VERSION^);
echo.    
echo     for (let i = 0; i ^< Math.max(clientParts.length, minParts.length^); i++^) {
echo       const client = clientParts[i] ^|^| 0;
echo       const min = minParts[i] ^|^| 0;
echo.      
echo       if (client ^> min^) return true;
echo       if (client ^< min^) return false;
echo     }
echo.    
echo     return true; // Versions are equal
echo   }
echo };
) > "y:\Backend\config\version.js"

REM Update frontend version
echo 🔧 Updating frontend version...
(
echo // Frontend version configuration
echo export const APP_CONFIG = {
echo   VERSION: "%NEW_VERSION%", // Updated on %date% %time%
echo   BUILD_TIME: new Date(^).toISOString(^),
echo.  
echo   // This should match the backend version for compatibility
echo   API_VERSION: "%NEW_VERSION%"
echo };
) > "c:\Coding\AllRoofsWebApps\ProjectManagerApp\Frontend\src\config\version.js"

REM Ask about JWT secret rotation
set /p "rotate_jwt=🔐 Do you want to rotate JWT secret to force logout all users? (y/N): "
if /i "%rotate_jwt%"=="y" (
    echo 🔄 Generating new JWT secret...
    echo ⚠️  IMPORTANT: You need to manually generate a new JWT secret and update your .env file
    echo Example: JWT_SECRET=your_new_64_character_random_string
    echo You can generate one at: https://generate-secret.vercel.app/64
)

REM Build frontend
echo 🏗️  Building frontend...
cd /d "c:\Coding\AllRoofsWebApps\ProjectManagerApp\Frontend"
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)

echo.
echo ✅ Deployment preparation complete!
echo 📋 Summary:
echo    - Backend version updated to: %NEW_VERSION%
echo    - Frontend version updated to: %NEW_VERSION%
echo    - Frontend built successfully
echo.
echo 🎯 Next steps:
echo    1. Deploy your backend to production
echo    2. Deploy your frontend to production  
echo    3. All existing users will be forced to refresh/login
echo.
echo 💡 For automatic deployment, modify this script to include your deployment commands.

pause