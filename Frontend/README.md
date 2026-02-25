# All Roof Takeoffs - Project Manager App (Frontend)

A comprehensive project management system for roof takeoff estimates, client management, and project tracking.

## 🚀 Features

### Core Functionality
- **Job Board**: Interactive table with inline editing, auto-save, and real-time collaboration
- **Project Management**: Create, edit, and track roofing projects with file management
- **Client Management**: Comprehensive client database with contact management
- **Email System**: Professional email templates for estimates and project communication
- **File Management**: Drag & drop file uploads with live folder synchronization
- **User Management**: Role-based access control (Admin, Estimator, Client)

### Advanced Features
- **Zoom-enabled Job Table**: Scale view with persistence
- **Real-time Auto-save**: Automatic saving with change tracking
- **Template System**: Professional email templates with live preview
- **Responsive Design**: Mobile-friendly interface
- **Green Theme**: Custom scrollbars and consistent UI theming

## 🛠 Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + Ant Design
- **State Management**: React Context + Custom Hooks
- **Tables**: TanStack Table with advanced features
- **File Management**: Custom drag & drop with live sync
- **Authentication**: JWT-based with role management
- **Icons**: Ant Design Icons + Custom Icon Set

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── features/           # Feature-based modules
│   └── emails/         # Email system (modals, templates)
├── hooks/              # Custom React hooks
├── shared/             # Shared utilities and components
├── appjobboard/        # Job board specific components
├── auth/               # Authentication components
├── FileManager/        # File management system
└── utils/              # Utility functions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend API running

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd Frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_API_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:5173
```

## 📋 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🔗 Key Features Documentation

### Job Board System
- **Location**: `src/appjobboard/`
- **Features**: Inline editing, auto-save, zoom, filtering, sorting
- **Hooks**: `useAutoSave`, `useTablePreferences`, `useInlineEdits`

### Email System
- **Location**: `src/features/emails/`
- **Documentation**: [Email Features README](src/features/emails/README.md)
- **Components**: EstimateCompleteModal, SendMessageModal, Templates

### File Management
- **Location**: `src/FileManager/`
- **Features**: Live sync, drag & drop, folder management
- **Documentation**: [Live Sync Guide](src/FileManager/LIVE_SYNC_GUIDE.md)

## 🐛 Bug Reports & Improvements

See [BUGS_AND_IMPROVEMENTS.md](BUGS_AND_IMPROVEMENTS.md) for current issues and planned features.

## 🎨 UI/UX Features

- **Green Theme**: Consistent #009245 color scheme
- **Custom Scrollbars**: Global green scrollbar styling
- **Responsive Tables**: Zoom and freeze pane functionality
- **Professional Email Templates**: Live preview system
- **Drag & Drop**: File uploads with visual feedback

## 🔧 Development Notes

### State Management
- Global authentication state via AuthContext
- Table preferences with localStorage persistence
- Auto-save functionality with optimistic updates

### Performance Optimizations
- Lazy loading for email components
- Debounced search and form inputs
- Optimized table rendering with virtualization

## 📦 Deployment

```bash
# Build for production
npm run build

# Files will be in ./dist directory
# Deploy to your hosting service
```

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript for new components when possible
3. Update documentation for new features
4. Test thoroughly before submitting

---

Built with ❤️ for efficient roof takeoff project management.
