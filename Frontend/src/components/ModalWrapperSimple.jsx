import React from 'react';

/**
 * Modal Wrapper for Templates.jsx Preview System ONLY
 * 
 * PURPOSE: Convert real modal form data → sample data format for backend template preview
 * 
 * FLOW:
 * 1. Real modal sends form data (as it would in production)
 * 2. Wrapper intercepts and maps to sample data format
 * 3. Templates.jsx receives sample data
 * 4. Templates.jsx feeds sample data to REAL backend template
 * 5. Preview shows exactly what real backend template produces
 * 
 * NOTE: This wrapper is ONLY used in Templates.jsx for preview.
 * Real production modals connect directly to backend (no wrapper).
 */
const ModalWrapper = ({ 
  ModalComponent, 
  project,
  testClients = [],
  testUsers = [],
  onFormChange = () => {}  // Callback to Templates.jsx with sample data
}) => {
  
  // Convert real modal form data to sample data format for backend template
  const mapFormDataToSampleData = (formValues) => {
    console.log('[ModalWrapper] Real modal form data:', formValues);
    console.log('[ModalWrapper] Form data keys:', Object.keys(formValues));
    console.log('[ModalWrapper] clientName value:', formValues.clientName);
    console.log('[ModalWrapper] clientEmail value:', formValues.clientEmail);
    
    const sampleData = {};
    
    // Map to exact backend template prop names (EstimateComplete.js expects these)
    if (formValues.clientName) {
      sampleData.contactName = formValues.clientName; // Backend template expects contactName, modal sends clientName
      console.log('[ModalWrapper] Mapping clientName to contactName:', formValues.clientName);
    } else {
      console.log('[ModalWrapper] clientName is missing or undefined:', formValues.clientName);
    }
    
    if (formValues.clientEmail) {
      sampleData.contactEmail = formValues.clientEmail; // For mock header
      console.log('[ModalWrapper] Mapping clientEmail to contactEmail:', formValues.clientEmail);
    }
    
    if (formValues.projectAddress) {
      // Convert object to string if needed (backend template expects string)
      if (typeof formValues.projectAddress === 'object' && formValues.projectAddress !== null) {
        const { address, city, state, zip } = formValues.projectAddress;
        sampleData.projectAddress = address || `${city || ''} ${state || ''} ${zip || ''}`.trim() || 'Project Address';
      } else if (typeof formValues.projectAddress === 'string') {
        sampleData.projectAddress = formValues.projectAddress;
      } else {
        sampleData.projectAddress = String(formValues.projectAddress || '');
      }
    }
    
    if (formValues.estimateDescription) {
      sampleData.estimateDescription = formValues.estimateDescription;
    }
    
    if (formValues.optionalBody !== undefined) {
      sampleData.optionalBody = formValues.optionalBody;
    }
    
    if (formValues.memo !== undefined) {
      sampleData.memo = formValues.memo;
    }
    
    // Pass through for dynamic calculation in Templates.jsx
    if (formValues.qty !== undefined) {
      sampleData.qty = formValues.qty;
    }
    
    if (formValues.planType) {
      sampleData.planType = formValues.planType;
    }
    
    console.log('[ModalWrapper] Sample data for backend template:', sampleData);
    console.log('[ModalWrapper] ContactName and ContactEmail check:', {
      hasContactName: !!sampleData.contactName,
      hasContactEmail: !!sampleData.contactEmail,
      contactName: sampleData.contactName,
      contactEmail: sampleData.contactEmail,
      originalClientName: formValues.clientName
    });
    
    // Send sample data to Templates.jsx
    onFormChange(sampleData);
  };
  
  // Wrapper props for modal (preview mode only)
  const wrappedProps = {
    isVisible: true,  // Always visible in preview
    onClose: () => console.log('[ModalWrapper] Preview close (no action)'),
    project: project,
    previewMode: true, // Tell modal this is preview mode
    mockClients: testClients, // Test data for client selection
    mockUsers: testUsers, // Test data for user selection
    onFormChange: mapFormDataToSampleData // Intercept form changes
  };

  return (
    <div className="w-full h-full">
      <ModalComponent {...wrappedProps} />
    </div>
  );
};

export default ModalWrapper;
