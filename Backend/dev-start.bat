@echo off
echo 🔧 Starting Local Development Environment...

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️ Creating .env file for local development...
    echo NODE_ENV=development > .env
    echo HTTP_PORT_DEV=5002 >> .env
    echo SOCKET_PORT_DEV=3002 >> .env
    echo MONGODB_URI=your_local_mongo_connection >> .env
    echo JWT_SECRET=your_dev_jwt_secret >> .env
    echo.
    echo ✏️ Please edit .env file with your local settings
    pause
)

echo 📦 Installing dependencies...
npm install

echo 🚀 Starting development server...
echo.
echo 🌐 Backend will be available at: http://localhost:5002
echo 🔌 Socket server will be available at: http://localhost:3002
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev