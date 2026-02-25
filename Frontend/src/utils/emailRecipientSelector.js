/**
 * Email Recipient Auto-Fill Utility
 * Automatically selects email recipients based on Rusty Agent email thread data
 */

/**
 * Gets preferred recipient based on email thread data and client matching
 * @param {Object} project - Project object with metadata
 * @param {Array} clients - Available client list for matching
 * @returns {Object} Recipient suggestion with confidence level
 */
export function getPreferredRecipient(project, clients = []) {
  try {
    console.log('[EMAIL AUTO-FILL] Starting recipient selection for project:', project?._id);
    console.log('[EMAIL AUTO-FILL] Project metadata:', project?.metadata);
    
    // Get email thread data from Rusty Agent metadata
    const emailThread = project?.metadata?.rustyAgent?.extractedData?.emailThread;
    
    if (!emailThread) {
      console.log('[EMAIL AUTO-FILL] No email thread data found, checking fallbacks');
      
      // Fallback 1: Check legacy contactEmail in rustyAgent metadata
      const fallbackEmail = project?.metadata?.rustyAgent?.contactEmail;
      if (isValidEmail(fallbackEmail)) {
        console.log('[EMAIL AUTO-FILL] Using fallback contactEmail:', fallbackEmail);
        return {
          email: fallbackEmail,
          name: project?.metadata?.rustyAgent?.contactName || '',
          confidence: 'low',
          source: 'legacy_metadata',
          allOptions: []
        };
      }
      
      // Fallback 2: Check project.contactEmail (legacy field)
      if (isValidEmail(project?.contactEmail)) {
        console.log('[EMAIL AUTO-FILL] Using project contactEmail:', project?.contactEmail);
        return {
          email: project.contactEmail,
          name: project?.contactName || '',
          confidence: 'low',
          source: 'project_field',
          allOptions: []
        };
      }
      
      console.log('[EMAIL AUTO-FILL] No email data available');
      return {
        email: '',
        name: '',
        confidence: 'low',
        source: 'none',
        allOptions: []
      };
    }

    const primaryEmail = emailThread.primaryRequester?.email;
    const primaryName = emailThread.primaryRequester?.name;
    const threadEmails = emailThread.threadEmails || [];
    
    console.log('[EMAIL AUTO-FILL] Email thread data found:', {
      primaryEmail,
      primaryName,
      threadEmails,
      hasThread: emailThread.hasThread
    });

    // Collect all possible recipients for dropdown
    const allOptions = [];

    // STEP 1: Check if primary requester matches linked client users
    if (project.linkedClients && project.linkedClients.length > 0) {
      console.log('[EMAIL AUTO-FILL] Checking linked clients for matches...');
      
      // Find the linked client from the clients array
      const linkedClient = clients.find(client => 
        project.linkedClients.includes(client._id)
      );
      
      if (linkedClient) {
        console.log('[EMAIL AUTO-FILL] Found linked client:', linkedClient.name);
        
        // Get client users (handle different data structures)
        const clientUsers = linkedClient.users || 
                           linkedClient.linkedUsers || 
                           linkedClient.contacts || 
                           [];
        
        console.log('[EMAIL AUTO-FILL] Client users found:', clientUsers.length);
        
        // Check primary requester against client users
        const primaryMatch = clientUsers.find(user => 
          user.email && primaryEmail && 
          user.email.toLowerCase() === primaryEmail.toLowerCase()
        );

        if (primaryMatch) {
          console.log('[EMAIL AUTO-FILL] HIGH CONFIDENCE: Primary requester matches client user:', primaryMatch.email);
          
          // Add all client users as options
          clientUsers.forEach(user => {
            if (user.email && isValidEmail(user.email)) {
              allOptions.push({
                email: user.email,
                name: user.name || user.firstName + ' ' + user.lastName || user.email,
                isClientUser: true,
                isMatch: user.email.toLowerCase() === primaryEmail.toLowerCase()
              });
            }
          });
          
          return {
            email: primaryMatch.email,
            name: primaryMatch.name || primaryName || primaryMatch.email,
            confidence: 'high',
            source: 'client_user_match',
            allOptions
          };
        }

        // STEP 2: Check thread emails for client matches (forwarding scenario)
        for (const threadEmail of threadEmails) {
          if (!isValidEmail(threadEmail)) continue;
          
          const threadMatch = clientUsers.find(user => 
            user.email && user.email.toLowerCase() === threadEmail.toLowerCase()
          );

          if (threadMatch) {
            console.log('[EMAIL AUTO-FILL] HIGH CONFIDENCE: Found client user in thread:', threadMatch.email);
            
            // Add all client users as options
            clientUsers.forEach(user => {
              if (user.email && isValidEmail(user.email)) {
                allOptions.push({
                  email: user.email,
                  name: user.name || user.firstName + ' ' + user.lastName || user.email,
                  isClientUser: true,
                  isMatch: user.email.toLowerCase() === threadEmail.toLowerCase()
                });
              }
            });
            
            return {
              email: threadMatch.email,
              name: threadMatch.name || threadEmail,
              confidence: 'high',
              source: 'thread_participant_client',
              allOptions
            };
          }
        }
        
        // Add all client users as options even if no match
        clientUsers.forEach(user => {
          if (user.email && isValidEmail(user.email)) {
            allOptions.push({
              email: user.email,
              name: user.name || user.firstName + ' ' + user.lastName || user.email,
              isClientUser: true,
              isMatch: false
            });
          }
        });
      }
    }

    // STEP 3: Add thread participants as additional options
    threadEmails.forEach(email => {
      if (isValidEmail(email) && !allOptions.some(opt => opt.email === email)) {
        allOptions.push({
          email,
          name: email, // No name available for thread participants
          isClientUser: false,
          isMatch: email.toLowerCase() === primaryEmail?.toLowerCase()
        });
      }
    });

    // FALLBACK: Use primary requester (medium confidence)
    if (isValidEmail(primaryEmail)) {
      console.log('[EMAIL AUTO-FILL] MEDIUM CONFIDENCE: Using primary requester:', primaryEmail);
      return {
        email: primaryEmail,
        name: primaryName || primaryEmail,
        confidence: 'medium',
        source: 'primary_requester',
        allOptions: allOptions.length > 0 ? allOptions : undefined
      };
    }

    console.log('[EMAIL AUTO-FILL] No valid email found in thread data');
    return {
      email: '',
      name: '',
      confidence: 'low',
      source: 'none',
      allOptions: allOptions.length > 0 ? allOptions : undefined
    };

  } catch (error) {
    console.error('[EMAIL AUTO-FILL] Error during recipient selection:', error);
    return {
      email: '',
      name: '',
      confidence: 'low',
      source: 'error',
      error: error.message,
      allOptions: []
    };
  }
}

/**
 * Validates if email is suitable for auto-fill
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid and suitable
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  const emailLower = email.toLowerCase();
  
  // Basic email format check
  if (!email.includes('@')) return false;
  
  // Filter out system emails
  const systemDomains = [
    'noreply',
    'no-reply',
    'donotreply',
    'do-not-reply',
    'mailer-daemon',
    'allroofs.com.au', // Our own domain
    'allrooftakeoffs.com.au' // Our own domain
  ];
  
  return !systemDomains.some(domain => emailLower.includes(domain));
}

/**
 * Gets confidence badge info for UI display
 * @param {string} confidence - Confidence level (high/medium/low)
 * @param {string} source - Source of the email
 * @returns {Object} Badge configuration
 */
export function getConfidenceBadge(confidence, source) {
  const badges = {
    high: { 
      color: 'success', 
      icon: '✅', 
      text: 'Matched Client User',
      description: 'Email matches a client user account'
    },
    medium: { 
      color: 'processing', 
      icon: '📧', 
      text: 'Email Requester',
      description: 'Using the email requester address'
    },
    low: { 
      color: 'default', 
      icon: '⚠️', 
      text: 'No Auto-Fill',
      description: 'No email data available'
    }
  };

  return badges[confidence] || badges.low;
}

/**
 * Formats display name for recipient options
 * @param {Object} option - Recipient option
 * @returns {string} Formatted display name
 */
export function formatRecipientOption(option) {
  if (option.name && option.name !== option.email) {
    return `${option.name} <${option.email}>${option.isClientUser ? ' ✅' : ''}`;
  }
  return `${option.email}${option.isClientUser ? ' ✅' : ''}`;
}