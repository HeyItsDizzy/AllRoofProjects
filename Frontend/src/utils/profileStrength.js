// Profile Strength Calculator
// Calculates profile completion percentage for users and companies

/**
 * Calculate user profile strength based on completed fields
 * @param {Object} user - User object
 * @returns {Object} - { percentage, completedFields, totalFields, suggestions }
 */
export const calculateUserProfileStrength = (user) => {
  const fields = [
    { key: 'firstName', label: 'First Name', weight: 20 },
    { key: 'lastName', label: 'Last Name', weight: 20 },
    { key: 'email', label: 'Email', weight: 25 },
    { key: 'phone', label: 'Phone Number', weight: 20 },
    { key: 'phoneVerified', label: 'Phone Verification', weight: 10 },
    { key: 'avatar', label: 'Profile Picture', weight: 5 }
  ];

  let completedWeight = 0;
  let totalWeight = 0;
  const suggestions = [];
  const completedFields = [];

  fields.forEach(field => {
    totalWeight += field.weight;
    
    let isCompleted = false;
    
    switch (field.key) {
      case 'firstName':
      case 'lastName':
      case 'email':
      case 'phone':
        isCompleted = user[field.key] && user[field.key].trim().length > 0;
        break;
      case 'phoneVerified':
        isCompleted = user.phoneVerified === true;
        break;
      case 'avatar':
        // Only count as completed if user has actually uploaded an avatar
        // Don't count default UI placeholder avatars or empty values
        isCompleted = user.avatar && 
                     user.avatar.length > 0 && 
                     !user.avatar.includes('ui-avatars.com') && // Exclude UI placeholder avatars
                     !user.avatar.includes('placeholder') &&   // Exclude any placeholder images
                     user.avatar !== 'default-avatar.png';     // Exclude default avatar files
        break;
      default:
        isCompleted = false;
    }

    if (isCompleted) {
      completedWeight += field.weight;
      completedFields.push(field.label);
    } else {
      suggestions.push(field.label);
    }
  });

  const percentage = Math.round((completedWeight / totalWeight) * 100);

  return {
    percentage,
    completedFields,
    totalFields: fields.length,
    suggestions,
    strength: getStrengthLevel(percentage)
  };
};

/**
 * Calculate company profile strength
 * @param {Object} company - Company object
 * @returns {Object} - { percentage, completedFields, totalFields, suggestions }
 */
export const calculateCompanyProfileStrength = (company) => {
  const fields = [
    // BARE MINIMUM (75 points) - Required to work with them
    { key: 'mainContact.email', label: 'Contact Email', weight: 30, category: 'essential' },
    { key: 'mainContact.name', label: 'Contact Name', weight: 25, category: 'essential' },
    { key: 'name', label: 'Company Name', weight: 20, category: 'essential' },
    
    // TRUST & SPECIAL TREATMENT (50 points) - For special billing and trust
    { key: 'legalName', label: 'Legal Entity Name', weight: 20, category: 'trust' },
    { key: 'abn', label: 'ABN', weight: 20, category: 'trust' },
    { key: 'billingAddress', label: 'Billing Address', weight: 15, category: 'trust' },
    
    // NICE TO HAVE (20 points) - Professional polish
    { key: 'logoUrl', label: 'Company Logo', weight: 10, category: 'polish' },
    { key: 'mainContact.phone', label: 'Contact Phone', weight: 10, category: 'polish' }
  ];

  let completedWeight = 0;
  let totalWeight = 0;
  const suggestions = [];
  const completedFields = [];

  fields.forEach(field => {
    totalWeight += field.weight;
    
    let isCompleted = false;
    
    // Handle nested properties
    if (field.key.includes('.')) {
      const keys = field.key.split('.');
      let value = company;
      for (const key of keys) {
        value = value?.[key];
      }
      isCompleted = value && value.toString().trim().length > 0;
    } else {
      switch (field.key) {
        case 'logoUrl':
          isCompleted = company.logoUrl && company.logoUrl.length > 0;
          break;
        case 'billingAddress':
          // Check for required address fields (line2 is optional and doesn't count)
          isCompleted = company.billingAddress && (
            (company.billingAddress.line1 && company.billingAddress.line1.trim().length > 0) ||
            (company.billingAddress.streetNumber && company.billingAddress.streetNumber.trim().length > 0) ||
            (company.billingAddress.full_address && company.billingAddress.full_address.trim().length > 0)
          ) && 
          company.billingAddress.city && company.billingAddress.city.trim().length > 0 &&
          company.billingAddress.state && company.billingAddress.state.trim().length > 0 &&
          company.billingAddress.postalCode && company.billingAddress.postalCode.trim().length > 0;
          break;
        default:
          isCompleted = company[field.key] && company[field.key].toString().trim().length > 0;
      }
    }

    if (isCompleted) {
      completedWeight += field.weight;
      completedFields.push(field.label);
    } else {
      suggestions.push(field.label);
    }
  });

  const percentage = completedWeight; // Raw score out of 150

  return {
    percentage,
    completedFields,
    totalFields: fields.length,
    suggestions, // Now includes suggestions for incomplete fields
    strength: getCompanyStrengthLevel(percentage)
  };
};

/**
 * Get strength level based on percentage
 * @param {number} percentage - Completion percentage
 * @returns {Object} - { level, color, icon }
 */
export const getStrengthLevel = (percentage) => {
  if (percentage >= 90) {
    return { level: 'Excellent', color: 'green', icon: '💚' };
  } else if (percentage >= 75) {
    return { level: 'Good', color: 'blue', icon: '💙' };
  } else if (percentage >= 50) {
    return { level: 'Fair', color: 'yellow', icon: '💛' };
  } else if (percentage >= 25) {
    return { level: 'Poor', color: 'orange', icon: '🧡' };
  } else {
    return { level: 'Very Poor', color: 'red', icon: '❤️' };
  }
};

/**
 * Get company strength level based on 150-point system
 * @param {number} score - Raw score out of 150
 * @returns {Object} - { level, color, icon, description }
 */
const getCompanyStrengthLevel = (score) => {
  if (score >= 150) {
    return { level: 'Complete', color: 'green', icon: '💚', description: 'Full professional profile' };
  } else if (score >= 120) {
    return { level: 'Trusted', color: 'blue', icon: '💙', description: 'Ready for special billing & trust' };
  } else if (score >= 75) {
    return { level: 'Workable', color: 'yellow', icon: '💛', description: 'Minimum to work with' };
  } else {
    return { level: 'Incomplete', color: 'red', icon: '❤️', description: 'Cannot work with this client' };
  }
};

/**
 * Get color classes for Tailwind CSS based on strength level
 * @param {string} color - Color from getStrengthLevel
 * @returns {Object} - { bg, text, border }
 */
export const getStrengthColors = (color) => {
  const colorMap = {
    green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
  };
  
  return colorMap[color] || colorMap.red;
};
