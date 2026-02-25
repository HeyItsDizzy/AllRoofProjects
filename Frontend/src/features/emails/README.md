# Email Feature Structure

This directory contains all email-related components organized in a logical feature-based structure.

## Directory Structure

```
src/features/emails/
├── components/          # Reusable email UI components
├── modals/             # Email-related modals
│   ├── jobboard/       # Jobboard-specific modals
│   └── shared/         # Shared email modals
├── templates/          # Email templates (HTML generation)
│   ├── jobboard/       # Jobboard email templates
│   └── shared/         # Shared email templates
└── index.js            # Barrel exports
```

## Available Components

### Jobboard Email Modals
- `EstimateCompleteModal` - Modal for sending estimate complete emails
- `SendEstimateModal` - Modal for sending estimate emails  
- `JobDelayedModal` - Modal for sending job delayed notifications
- `SendMessageModal` - General message sending modal
- `MessageTypeSelector` - Component for selecting message types

### Email Templates
- `EstimateCompleteTemplate` - HTML template for estimate complete emails
- `JobDelayedTemplate` - HTML template for job delayed notifications
- `SendEstimateTemplate` - HTML template for sending estimates

## Usage

### Import individual components
```jsx
import { EstimateCompleteModal } from '@/features/emails';
import { EstimateCompleteTemplate } from '@/features/emails';
```

### Import specific components
```jsx
import EstimateCompleteModal from '@/features/emails/modals/jobboard/EstimateCompleteModal';
```

### Lazy loading with grouped exports
```jsx
import { JobboardModals } from '@/features/emails';

const EstimateCompleteModal = React.lazy(JobboardModals.EstimateCompleteModal);
```

## Migration Notes

This structure consolidates previously scattered email components from:
- `src/modals/emails/jobboard/` ✅ Moved
- `src/templates/emailmodals/` ✅ Moved  
- `src/templates/emails/emailmodals/` ✅ Moved
- `src/components/emailmodals/` ✅ Moved
- `src/templates/emails/jobboard/` ✅ Moved

All import paths have been updated throughout the codebase to use the new structure.
