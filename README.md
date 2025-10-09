# All Roof Projects - Project Management System

A comprehensive project management system for roofing contractors built with React frontend and Node.js backend.

## 🏗️ Architecture

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express + MySQL
- **Authentication**: JWT
- **Real-time**: Socket.io
- **Deployment**: PM2 + Nginx

## 📁 Project Structure

```
├── Frontend/          # React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── shared/        # Shared utilities
│   │   └── styles/        # CSS and styling
│   └── package.json
│
├── Backend/           # Node.js API server
│   ├── routes/            # API endpoints
│   ├── middleware/        # Express middleware
│   ├── config/           # Configuration files
│   ├── features/         # Feature modules
│   ├── services/         # Business logic
│   └── package.json
│
└── README.md
```

## 🚀 Quick Start

### Backend Setup

1. Navigate to Backend directory:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.template .env
   ```

4. Configure your `.env` file with database and other credentials

5. Start the server:
   ```bash
   npm run dev          # Development
   npm start            # Production with PM2
   ```

### Frontend Setup

1. Navigate to Frontend directory:
   ```bash
   cd Frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.template .env
   ```

4. Configure your `.env` file with API endpoints

5. Start the development server:
   ```bash
   npm run dev
   ```

## 🔧 Features

- **Project Management**: Create, track, and manage roofing projects
- **User Management**: Role-based access (Admin, Estimator, User)
- **Month Filtering**: Advanced filtering by months and date ranges
- **Client Management**: Link projects to clients
- **Real-time Updates**: Live updates across users
- **Responsive Design**: Mobile-friendly interface
- **Performance Optimized**: Virtual scrolling for large datasets

## 🛠️ Technologies

### Frontend
- React 18
- Vite
- TailwindCSS
- React Router DOM
- Axios
- Socket.io Client
- React Window (Virtual Scrolling)
- TanStack Table

### Backend
- Node.js
- Express.js
- MySQL
- Socket.io
- JWT Authentication
- PM2 Process Manager
- Multer (File Uploads)

## 📝 API Documentation

The backend provides RESTful APIs for:

- `/api/auth/*` - Authentication endpoints
- `/api/projects/*` - Project management
- `/api/users/*` - User management  
- `/api/clients/*` - Client management
- `/api/uploads/*` - File handling

## 🔒 Security

- JWT-based authentication
- Role-based authorization
- SQL injection protection
- CORS configuration
- Input validation and sanitization

## 🚀 Deployment

### Production Backend
```bash
cd Backend
npm install --production
pm2 start ecosystem.config.js
```

### Production Frontend
```bash
cd Frontend
npm run build
# Serve build files with nginx or your preferred web server
```

## 📊 Performance

- Virtual scrolling for large datasets
- Optimized database queries
- Lazy loading components
- Debounced search functionality
- Efficient state management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software for All Roof Takeoffs.

## 🆘 Support

For support, contact the development team or create an issue in this repository.
