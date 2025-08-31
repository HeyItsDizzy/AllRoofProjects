// CompanyForm
import React, { useState } from "react";
import { IconExpandBox, IconCollapseBox } from "@/shared/IconSet";
import AddressInput from "./AddressInput";
import CompanyAutocomplete from "./CompanyAutocomplete";
import Avatar from "@/shared/Avatar";
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const BASE_URL = import.meta.env.VITE_STATIC_BASE_URL;

export default function CompanyForm({
  isEmbedded = false,
  showHeader = true, // New prop to control header visibility
  showTitle = true, // New prop to control title visibility
  isEditing = false,
  isAdmin = false,
  form,
  handleChange,
  handleSubmit,
  setIsEditing,
  onAddressChange, // Accept custom address change handler
  submitButtonText = "Save Changes", // Default button text
  onCancel, // Custom cancel handler
  onEnterEdit, // Custom handler for entering edit mode
}) {
  const [showAddressDetails, setShowAddressDetails] = useState(false);
  const [abrBusinessNames, setAbrBusinessNames] = useState([]); // Store ABR business names
  const [showAbrSuccess, setShowAbrSuccess] = useState(false); // Show success message after ABR population

  // Phone formatting function
  const formatPhoneForDisplay = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Remove any existing formatting
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Try to parse and format the phone number
    try {
      const parsed = parsePhoneNumberFromString(cleaned, 'AU'); // Default to AU
      if (parsed && parsed.isValid()) {
        return parsed.formatNational();
      }
    } catch (error) {
      // If parsing fails, return the cleaned number
      console.log('Phone formatting error:', error);
    }
    
    // Fallback: return the cleaned number
    return cleaned;
  };

  // Handle phone change with formatting
  const handlePhoneChange = (value, contactType = 'mainContact') => {
    // Store the raw value but format for display
    const rawValue = value.replace(/[^\d+]/g, ''); // Keep only digits and +
    const formattedValue = formatPhoneForDisplay(value);
    
    if (contactType === 'mainContact') {
      handleChange({
        target: {
          name: 'mainContact',
          value: { ...form.mainContact, phone: formattedValue }
        }
      });
    }
  };

  // Utility function to normalize company names by removing legal titles
  const normalizeCompanyName = (entityName) => {
    if (!entityName) return '';
    
    // Common Australian company legal titles to remove
    const legalTitles = [
      'PTY LTD', 'PTY. LTD.', 'PTY LTD.', 'PTY. LTD',
      'LIMITED', 'LTD', 'LTD.', 
      'PROPRIETARY LIMITED', 'PROP LTD', 'PROP. LTD.',
      'INCORPORATED', 'INC', 'INC.',
      'COMPANY', 'CO', 'CO.',
      'CORPORATION', 'CORP', 'CORP.',
      'ENTERPRISES', 'ENT', 'ENT.',
      'GROUP', 'GRP', 'GRP.'
    ];
    
    let cleanName = entityName.trim();
    
    // Remove legal titles (case insensitive)
    legalTitles.forEach(title => {
      const regex = new RegExp(`\\b${title.replace(/\./g, '\\.')}\\b`, 'gi');
      cleanName = cleanName.replace(regex, '');
    });
    
    // Clean up extra spaces and convert to proper case
    cleanName = cleanName.replace(/\s+/g, ' ').trim();
    
    // Convert to proper case (first letter of each word capitalized)
    return cleanName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Handler for when a company is selected from ABR search
  const handleCompanySelected = (companyData) => {
    console.log('Selected company from ABR:', companyData);
    
    // Determine the company/trading name
    let companyName = '';
    let businessNames = [];
    
    if (companyData.BusinessName && companyData.BusinessName.length > 0) {
      // Use business names if available
      businessNames = companyData.BusinessName;
      companyName = businessNames[0];
      setAbrBusinessNames(businessNames);
    } else {
      // No business names - use normalized entity name
      companyName = normalizeCompanyName(companyData.EntityName);
      setAbrBusinessNames([]); // Clear business names array
      console.log('No business names found, using normalized EntityName:', companyName);
    }
    
    // Map ABR data to form fields - only essential UI fields
    const updatedForm = {
      ...form,
      // Use determined company name (either business name or normalized entity name)
      name: companyName,
      // Entity name is always the legal name
      legalName: companyData.EntityName || '',
      abn: companyData.Abn || '',
      acn: companyData.Acn || '',
      // GST registration - simplified to yes/no
      gstRegistered: companyData.Gst ? 'yes' : 'no',
      // Store ALL ABR data for backend
      abrData: {
        ...companyData,
        capturedAt: new Date().toISOString(),
        source: 'abr_api',
        normalizedName: companyName // Store the normalized name we generated
      }
    };

    // Handle address from ABN details if available
    if (companyData.AddressState && companyData.AddressPostcode) {
      updatedForm.physicalAddress = {
        ...form.physicalAddress,
        state: companyData.AddressState || '',
        zip: companyData.AddressPostcode || '',
        country: 'Australia',
        // Preserve existing address details and update state/postcode
        full_address: form.physicalAddress?.full_address || '',
      };
    }
    // Fallback to BusinessAddress structure (from search results)
    else if (companyData.BusinessAddress && companyData.BusinessAddress.length > 0) {
      const address = companyData.BusinessAddress[0];
      updatedForm.physicalAddress = {
        line1: address.AddressLine || '',
        city: address.Locality || '',
        state: address.State || '',
        zip: address.Postcode || '',
        country: 'Australia',
        full_address: `${address.AddressLine || ''}, ${address.Locality || ''} ${address.State || ''} ${address.Postcode || ''}`.trim(),
      };
    }

    console.log('Mapped form data:', updatedForm);
    console.log('Company name being set:', updatedForm.name);
    console.log('Current form.name before update:', form.name);

    // Update each field individually to ensure proper state updates
    if (updatedForm.name) {
      console.log('Updating name field to:', updatedForm.name);
      handleChange({ target: { name: 'name', value: updatedForm.name } });
    }
    
    if (updatedForm.legalName) {
      handleChange({ target: { name: 'legalName', value: updatedForm.legalName } });
    }
    
    if (updatedForm.abn) {
      handleChange({ target: { name: 'abn', value: updatedForm.abn } });
    }
    
    if (updatedForm.acn) {
      handleChange({ target: { name: 'acn', value: updatedForm.acn } });
    }
    
    if (updatedForm.gstRegistered) {
      handleChange({ target: { name: 'gstRegistered', value: updatedForm.gstRegistered } });
    }
    
    if (updatedForm.abrData) {
      handleChange({ target: { name: 'abrData', value: updatedForm.abrData } });
    }

    // Handle address separately if available
    if (updatedForm.physicalAddress && onAddressChange) {
      console.log('Setting physical address:', updatedForm.physicalAddress);
      onAddressChange('physicalAddress', updatedForm.physicalAddress);
    }

    console.log('✅ Form populated with ABR data - autocomplete will now reset');
    
    // Show success message and auto-hide after 3 seconds
    setShowAbrSuccess(true);
    setTimeout(() => {
      setShowAbrSuccess(false);
    }, 3000);
  };

  // Map country codes to full names for display
  const getCountryDisplayName = (countryCode) => {
    const countryMapping = {
      'AU': 'Australia',
      'US': 'United States',
      'NO': 'Norway'
    };
    return countryMapping[countryCode] || countryCode || '<empty>';
  };

  // Convert backend address format to AddressInput format
  const convertBackendToAddressInput = (backendAddress) => {
    if (!backendAddress) return {};
    
    let streetNumber = backendAddress.streetNumber || '';
    let addressLine1 = backendAddress.line1 || '';
    
    // If no street number but we have a full address, try to extract it
    if (!streetNumber && backendAddress.full_address) {
      const fullAddress = backendAddress.full_address;
      
      // Try multiple patterns to extract street number
      const patterns = [
        /^(\d+[A-Za-z]?)\s+(.+)/,  // "248 Poddy Hut Road..."
        /^(\d+[A-Za-z]?),\s*(.+)/, // "248, Poddy Hut Road..."
        /^(\d+[A-Za-z]?)[\/\-]\s*(.+)/, // "248/A Street Name..."
      ];
      
      for (const pattern of patterns) {
        const match = fullAddress.match(pattern);
        if (match) {
          streetNumber = match[1];
          
          // Extract street name from the rest
          const remainder = match[2];
          const beforeComma = remainder.split(',')[0].trim();
          if (beforeComma && (!addressLine1 || addressLine1 === 'sadda')) {
            addressLine1 = beforeComma;
          }
          break;
        }
      }
    }
    
    return {
      address_line_1: addressLine1,
      address_line_2: backendAddress.line2 || '',
      city: backendAddress.city || '',
      state: backendAddress.state || '',
      zip: backendAddress.postalCode || '',
      region: backendAddress.region || 'AU',               // Backend region -> AddressInput region
      country: backendAddress.country || 'Australia',      // Backend country -> AddressInput country
      full_address: backendAddress.full_address || '',
      streetNumber: streetNumber,
    };
  };

  // Handle address input from AddressInput component
  const handleAddressChange = (addressData) => {
    
    // Use custom address change handler if provided, otherwise use default
    if (onAddressChange) {
      onAddressChange(addressData);
    } else {
      // AddressInput now sends:
      // - region: Country code (AU, US, NO)  
      // - country: Full country name (Australia, United States, Norway)
      
      const updatedAddress = {
        line1: addressData.address_line_1 || '',
        line2: addressData.address_line_2 || '',
        city: addressData.city || '',
        state: addressData.state || '',
        postalCode: addressData.zip || '',
        country: addressData.country || 'Australia',      // Full country name
        region: addressData.region || 'AU',               // Country code
        full_address: addressData.full_address || '',
        streetNumber: addressData.streetNumber || '',
      };
      
      // Use the existing handleChange function with a synthetic event
      const syntheticEvent = {
        target: {
          name: 'billingAddress',
          value: updatedAddress
        }
      };
      
      handleChange(syntheticEvent);
    }
  };

  const renderEditingMode = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Australian Business Search */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          🔍 Search Australian Business Register
        </h3>
        <p className="text-xs text-blue-600 mb-3">
          Search by ABN, ACN, or company name to auto-populate company details
        </p>
        <CompanyAutocomplete 
          country="AU" 
          onSave={handleCompanySelected}
        />
      </div>

      {/* Success Message */}
      {showAbrSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span className="text-sm text-green-800 font-medium">
              Form populated with Australian business data successfully!
            </span>
          </div>
        </div>
      )}

      {/* ABR Business Name Selector - only show if multiple business names available */}
      {abrBusinessNames.length > 1 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-green-800 mb-2">
            Select Business Name
          </label>
          <select
            className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            value={form.name}
            onChange={(e) => handleChange({ target: { name: 'name', value: e.target.value } })}
          >
            {abrBusinessNames.map((businessName, index) => (
              <option key={index} value={businessName}>
                {businessName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-green-600">
            Select the business name you want to use for this company
          </p>
        </div>
      )}

      {/* Company Name with Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Name / Trading Name*
        </label>
        <div className="flex items-center justify-start gap-4">
          {form.logoUrl && (
            <Avatar 
              name={form.name || "Company"}
              avatarUrl={form.logoUrl}
              size="lg"
            />
          )}
          <input
            type="text"
            name="name"
            value={form.name || ''}
            onChange={handleChange}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* Primary Contact */}
      <fieldset className="border border-gray-200 p-4 rounded">
        <legend className="font-medium text-gray-700 px-2">Primary Contact</legend>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                name="mainContact.name"
                value={form.mainContact?.name || ''}
                onChange={(e) => handleChange({
                  target: {
                    name: 'mainContact',
                    value: { ...form.mainContact, name: e.target.value }
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="mainContact.phone"
                value={form.mainContact?.phone || ''}
                onChange={(e) => handlePhoneChange(e.target.value, 'mainContact')}
                placeholder="e.g., 0412 345 678"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              name="mainContact.email"
              value={form.mainContact?.email || ''}
              onChange={(e) => handleChange({
                target: {
                  name: 'mainContact',
                  value: { ...form.mainContact, email: e.target.value }
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          
          {/* Accounts Email Section */}
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="sameAsMainContact"
                name="sameAsMainContact"
                checked={form.sameAsMainContact || false}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="sameAsMainContact" className="text-sm font-medium text-gray-700">
                Use primary contact email for accounting
              </label>
            </div>
            
            {!form.sameAsMainContact && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accounts Email</label>
                <input
                  type="email"
                  name="mainContact.accountsEmail"
                  value={form.mainContact?.accountsEmail || ''}
                  onChange={(e) => handleChange({
                    target: {
                      name: 'mainContact',
                      value: { ...form.mainContact, accountsEmail: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* Billing Address */}
      <fieldset className="border border-gray-200 p-4 rounded">
        <legend className="font-medium text-gray-700 px-2">Billing Address</legend>
        <div className="mt-2">
          <AddressInput
            location={convertBackendToAddressInput(form.billingAddress)}
            setLocation={handleAddressChange}
          />
          
          {/* Show Address Details Button in Edit Mode */}
          {form.billingAddress?.full_address && (
            <>
              <div className="flex justify-start mt-3">
                <button
                  type="button"
                  onClick={() => setShowAddressDetails(!showAddressDetails)}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-50 transition-colors"
                >
                  {showAddressDetails ? (
                    <>
                      <IconCollapseBox size={16} />
                      Hide Address Details
                    </>
                  ) : (
                    <>
                      <IconExpandBox size={16} />
                      Show Address Details
                    </>
                  )}
                </button>
              </div>
              
              {/* Collapsible Address Details in Edit Mode */}
              {showAddressDetails && (
                <div className="space-y-3 border-t pt-3 mt-3">
                  <div className="text-sm text-gray-600 mb-2">Current Address Details:</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Street/Unit Number</label>
                      <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border text-sm">
                        {form.billingAddress?.streetNumber || '<empty>'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Street Name</label>
                      <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border text-sm">
                        {form.billingAddress?.line1 || '<empty>'}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Address Line 2</label>
                    <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border text-sm">
                      {form.billingAddress?.line2 || '<empty>'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
                      <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border text-sm">
                        {form.billingAddress?.city || '<empty>'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">State</label>
                      <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border text-sm">
                        {form.billingAddress?.state || '<empty>'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Postal Code</label>
                      <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border text-sm">
                        {form.billingAddress?.postalCode || '<empty>'}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Country</label>
                    <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border text-sm">
                      {getCountryDisplayName(form.billingAddress?.country)}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </fieldset>

      {/* Country-specific legal fields */}
      {form.billingAddress?.country && (
        <fieldset className="border border-gray-200 p-4 rounded">
          <legend className="font-medium text-gray-700 px-2">Legal Information</legend>
          <div className="space-y-4 mt-2">

            {/* Legal Entity Name - Universal field for all countries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Entity Name</label>
                <input
                  type="text"
                  name="legalName"
                  value={form.legalName || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Official registered legal name of the entity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registered Country</label>
                <input
                  type="text"
                  readOnly
                  value={form.billingAddress?.country || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  placeholder="Country from billing address"
                />
              </div>
            </div>

            {form.billingAddress.region === 'AU' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ABN</label>
                    <input
                      type="text"
                      name="abn"
                      value={form.abn || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ACN</label>
                    <input
                      type="text"
                      name="acn"
                      value={form.acn || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Registered</label>
                    <select
                      name="gstRegistered"
                      value={form.gstRegistered || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Invoice Required</label>
                    <select
                      name="taxInvoiceRequired"
                      value={form.taxInvoiceRequired || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {form.billingAddress.region === 'US' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">United States 🇺🇸</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">EIN</label>
                    <input
                      type="text"
                      name="ein"
                      value={form.ein || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State Tax ID</label>
                    <input
                      type="text"
                      name="stateTaxId"
                      value={form.stateTaxId || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SSN/ITIN</label>
                    <input
                      type="text"
                      name="ssnItin"
                      value={form.ssnItin || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">W-9 on File</label>
                    <select
                      name="w9OnFile"
                      value={form.w9OnFile || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {form.billingAddress.region === 'NO' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Norway 🇳🇴</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Number</label>
                    <input
                      type="text"
                      name="organizationNumber"
                      value={form.organizationNumber || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                    <input
                      type="text"
                      name="vatNumber"
                      value={form.vatNumber || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">VAT Registered</label>
                    <select
                      name="vatRegistered"
                      value={form.vatRegistered || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </fieldset>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel || (() => setIsEditing(false))}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {submitButtonText}
        </button>
      </div>
    </form>
  );

  const renderDisplayMode = () => (
    <div className="space-y-4">
      {/* Company Name with Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Company Name / Trading Name</label>
        <div className="flex items-center justify-start gap-4 text-gray-900 bg-gray-50 px-3 py-2 rounded border">
          {form.logoUrl && (
            <Avatar 
              name={form.name || "Company"}
              avatarUrl={form.logoUrl}
              size="lg"
            />
          )}
          <span className="flex-1">{form.name || '<empty>'}</span>
        </div>
      </div>

      {/* Primary Contact */}
      <fieldset className="border border-gray-200 p-4 rounded bg-gray-50">
        <legend className="font-medium text-gray-700 px-2">Primary Contact</legend>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <div className="text-gray-900">{form.mainContact?.name || '<empty>'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
              <div className="text-gray-900">{form.mainContact?.phone || '<empty>'}</div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <div className="text-gray-900">{form.mainContact?.email || '<empty>'}</div>
          </div>
          
          {/* Accounts Email Section */}
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-4 w-4 border rounded ${form.sameAsMainContact ? 'bg-primary border-primary' : 'border-gray-300'} flex items-center justify-center`}>
                {form.sameAsMainContact && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium text-gray-700">
                Use primary contact email for accounting
              </span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Accounts Email</label>
              <div className="text-gray-900">
                {form.sameAsMainContact 
                  ? (form.mainContact?.email || 'Same as primary contact')
                  : (form.mainContact?.accountsEmail || '<empty>')
                }
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Billing Address */}
      <fieldset className="border border-gray-200 p-4 rounded bg-gray-50">
        <legend className="font-medium text-gray-700 px-2">Billing Address</legend>
        <div className="mt-2">
          <div className="text-gray-900">
            {form.billingAddress?.full_address || '<empty>'}
          </div>
          
          {/* Expand/Collapse Button */}
          <div className="flex justify-start mt-3">
            <button
              type="button"
              onClick={() => setShowAddressDetails(!showAddressDetails)}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-50 transition-colors"
            >
              {showAddressDetails ? (
                <>
                  <IconCollapseBox size={16} />
                  Hide Address Details
                </>
              ) : (
                <>
                  <IconExpandBox size={16} />
                  Show Address Details
                </>
              )}
            </button>
          </div>
          
          {/* Collapsible Address Details */}
          {showAddressDetails && (
            <div className="space-y-3 border-t pt-3 mt-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Street/Unit Number</label>
                  <div className="text-gray-900 bg-white px-3 py-2 rounded border">
                    {form.billingAddress?.streetNumber || '<empty>'}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Street Name</label>
                  <div className="text-gray-900 bg-white px-3 py-2 rounded border">
                    {form.billingAddress?.line1 || '<empty>'}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Address Line 2</label>
                <div className="text-gray-900 bg-white px-3 py-2 rounded border">
                  {form.billingAddress?.line2 || '<empty>'}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
                  <div className="text-gray-900 bg-white px-3 py-2 rounded border">
                    {form.billingAddress?.city || '<empty>'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">State</label>
                  <div className="text-gray-900 bg-white px-3 py-2 rounded border">
                    {form.billingAddress?.state || '<empty>'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Postal Code</label>
                  <div className="text-gray-900 bg-white px-3 py-2 rounded border">
                    {form.billingAddress?.postalCode || '<empty>'}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Country</label>
                <div className="text-gray-900 bg-white px-3 py-2 rounded border">
                  {getCountryDisplayName(form.billingAddress?.country)}
                </div>
              </div>
            </div>
          )}
        </div>
      </fieldset>

      {/* Company Registration & Tax Details */}
      <fieldset className="border border-gray-200 p-4 rounded bg-gray-50">
        <legend className="font-medium text-gray-700 px-2">Company Registration & Tax Details</legend>
        <div className="space-y-4 mt-2">

          {/* Legal Entity Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Legal Entity Name</label>
              <div className="text-gray-900">{form.legalName || '<empty>'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Registered Country</label>
              <div className="text-gray-900">{form.billingAddress?.country || '<empty>'}</div>
            </div>
          </div>

          {/* Country-specific fields */}
          {form.billingAddress?.region === 'AU' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Australian Business Number (ABN)</label>
                  <div className="text-gray-900">{form.abn || '<empty>'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Australian Company Number (ACN)</label>
                  <div className="text-gray-900">{form.acn || '<empty>'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">GST Registered</label>
                  <div className="text-gray-900">{form.gstRegistered ? (form.gstRegistered === 'yes' ? 'Yes' : 'No') : '<empty>'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tax Invoice Required</label>
                  <div className="text-gray-900">{form.taxInvoiceRequired ? (form.taxInvoiceRequired === 'yes' ? 'Yes' : 'No') : '<empty>'}</div>
                </div>
              </div>
            </div>
          )}

          {form.billingAddress?.region === 'US' && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">United States 🇺🇸</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Employer Identification Number (EIN)</label>
                  <div className="text-gray-900">{form.ein || '<empty>'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">State Sales Tax Registration Number (if applicable)</label>
                  <div className="text-gray-900">{form.stateTaxId || '<empty>'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">SSN or ITIN</label>
                  <div className="text-gray-900">{form.ssnItin || '<empty>'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">W-9 on File</label>
                  <div className="text-gray-900">{form.w9OnFile ? (form.w9OnFile === 'yes' ? 'Yes' : 'No') : '<empty>'}</div>
                </div>
              </div>
            </div>
          )}

          {form.billingAddress?.region === 'NO' && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Norway 🇳🇴</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Organization Number (Org.nr)</label>
                  <div className="text-gray-900">{form.organizationNumber || '<empty>'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">VAT Registered</label>
                  <div className="text-gray-900">{form.vatRegistered ? (form.vatRegistered === 'yes' ? 'Yes' : 'No') : '<empty>'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">VAT Registration Number</label>
                  <div className="text-gray-900">{form.vatNumber || '<empty>'}</div>
                </div>
              </div>
            </div>
          )}

          {(!form.billingAddress?.region || !['AU', 'US', 'NO'].includes(form.billingAddress?.region)) && (
            <div className="text-gray-500 text-sm italic">
              No country-specific legal information available. Please update the billing address country.
            </div>
          )}

        </div>
      </fieldset>
    </div>
  );

  return (
    <div className={isEmbedded ? "" : "max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6"}>
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
          {showTitle && (
            <h2 className="text-xl font-semibold text-textBlack">
              Company Details
            </h2>
          )}
          {isAdmin && (
            <button
              onClick={() => {
                if (isEditing) {
                  // If currently editing and user clicks "Cancel", use custom handler
                  if (onCancel) {
                    onCancel();
                  } else {
                    setIsEditing(false);
                  }
                } else {
                  // If not editing and user clicks "Update Info", enter edit mode
                  if (onEnterEdit) {
                    onEnterEdit();
                  } else {
                    setIsEditing(true);
                  }
                }
              }}
              className="text-primary underline w-fit sm:w-auto text-sm"
            >
              {isEditing ? "Cancel" : "Update Info"}
            </button>
          )}
        </div>
      )}

      {isEditing ? renderEditingMode() : renderDisplayMode()}
    </div>
  );
}
