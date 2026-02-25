// EstimateCompleteModal.jsx - Modal for sending estimate complete emails
import { useState, useEffect, useRef } from "react";
import { Modal, Form, Input, Button, message, Select, InputNumber, Checkbox, Tag, Tooltip } from "antd";
import { MailOutlined, UserOutlined, HomeOutlined, FileTextOutlined, MessageOutlined, PlusOutlined, InfoCircleOutlined } from "@ant-design/icons";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import { basePlanTypes } from "@/shared/planTypes";
import Avatar from "@/shared/Avatar";
import EstimateCompleteTemplate from "../../templates/jobboard/EstimateComplete.js";
import { showLoadingSpinner } from "@/shared/components/LoadingSpinner";
import AddClientModal from "@/components/AddClientModal";
import { getPreferredRecipient, getConfidenceBadge, formatRecipientOption } from "@/utils/emailRecipientSelector";

const { Option } = Select;
const { TextArea } = Input;

/**
 * EstimateCompleteModal Component - Modal for sending estimate complete emails with read-only links
 * @param {boolean} isVisible - Modal visibility state
 * @param {function} onClose - Function to close modal
 * @param {object} project - Project data
 * @param {function} updateRow - Function to update table row instantly
 * @param {boolean} previewMode - If true, renders without Modal wrapper for preview
 * @param {function} onFormChange - Callback for form changes in preview mode
 * @param {array} mockClients - Mock client data for preview mode
 * @param {array} mockUsers - Mock user data for preview mode
 * @param {function} onSuccess - Callback function to trigger after successful email send
 */
const EstimateCompleteModal = ({ 
  isVisible, 
  onClose, 
  project, 
  updateRow,
  previewMode = false, 
  onFormChange,
  mockClients = [],
  mockUsers = [],
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [linkedUsers, setLinkedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [textColor, setTextColor] = useState('#374151'); // Default color
  const [attachPDFs, setAttachPDFs] = useState(false);
  const [availablePDFs, setAvailablePDFs] = useState([]);
  const [selectedPDFs, setSelectedPDFs] = useState([]);
  const [loadingPDFs, setLoadingPDFs] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  
  // Email auto-fill state
  const [autoFillData, setAutoFillData] = useState(null);
  const [autoFillConfidence, setAutoFillConfidence] = useState('low');
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [autoFillError, setAutoFillError] = useState(null);
  
  const axiosSecure = useAxiosSecure();
  const initialValuesSet = useRef(false); // Track if initial values have been set

  // Color options for text styling
  const colorOptions = [
    { name: 'Black/Default', color: '#374151', bgColor: '#374151' },
    { name: 'Red', color: '#DC2626', bgColor: '#DC2626' },
    { name: 'ART Green', color: '#009245', bgColor: '#009245' },
    { name: 'Blue', color: '#2563EB', bgColor: '#2563EB' }
  ];

  // Debug log when modal opens
  useEffect(() => {
    if (isVisible) {
      console.log('[EstimateCompleteModal] is open');
      console.log('[DEBUG] Project ID being used:', project?._id);
      console.log('[DEBUG] Full project object:', project);
    }
  }, [isVisible, project]);

  // Load PDFs from BOQ folder
  const loadPDFsFromBOQ = async () => {
    if (!project?._id) return;
    
    setLoadingPDFs(true);
    try {
      // Get folder tree to find PDFs in BOQ folder
      const response = await axiosSecure.get(`/files/${project._id}/folder-tree`);
      
      console.log('[DEBUG] Folder tree response:', response.data);
      
      // Recursive function to extract PDFs from folder and all subfolders
      const extractPDFsFromFolder = (folderObj, basePath = 'BOQ') => {
        const pdfs = [];
        
        // Get PDFs from current folder's __files array
        if (folderObj.__files && Array.isArray(folderObj.__files)) {
          const pdfFiles = folderObj.__files.filter(fileName => 
            typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf')
          );
          // Add each PDF with its full folder path
          pdfFiles.forEach(fileName => {
            pdfs.push({
              name: fileName,
              folderPath: basePath
            });
          });
        }
        
        // Recursively search subfolders (any property that's not __files)
        Object.keys(folderObj).forEach(key => {
          if (key !== '__files' && typeof folderObj[key] === 'object') {
            const subFolderPath = `${basePath}/${key}`;
            const subPdfs = extractPDFsFromFolder(folderObj[key], subFolderPath);
            pdfs.push(...subPdfs);
          }
        });
        
        return pdfs;
      };
      
      // Response structure is {Admin: {...}, BOQ: {...}, etc}, not {folders: [...]}
      if (response.data && response.data.BOQ) {
        const allPDFs = extractPDFsFromFolder(response.data.BOQ);
        console.log('[DEBUG] All PDFs found (including subfolders):', allPDFs);
        setAvailablePDFs(allPDFs);
      } else {
        console.log('[DEBUG] BOQ folder not found in response');
        setAvailablePDFs([]);
      }
    } catch (error) {
      console.error('Error loading PDFs from BOQ:', error);
      message.error('Failed to load PDF files from BOQ folder');
      setAvailablePDFs([]);
    } finally {
      setLoadingPDFs(false);
    }
  };

  // Load PDFs when attach checkbox is enabled
  useEffect(() => {
    if (attachPDFs && project?._id) {
      loadPDFsFromBOQ();
    }
  }, [attachPDFs, project?._id]);

  // Load linked clients when modal opens
  useEffect(() => {
    if (isVisible && project) {
      console.log('[DEBUG] Project data for modal initialization:', project);
      console.log('[DEBUG] project.Qty:', project.Qty);
      console.log('[DEBUG] project.qty:', project.qty);
      console.log('[DEBUG] project.PlanType:', project.PlanType);
      console.log('[DEBUG] All project keys:', Object.keys(project));
      console.log('[DEBUG] previewMode:', previewMode);
      
      loadLinkedClients();
      
      // In preview mode, always update form values when project changes
      // In live mode, only set initial form values once to prevent resetting user input
      if (previewMode || !initialValuesSet.current) {
        // Get the plan type UOM and transform it for UI display
        const planType = basePlanTypes.find(type => type.label === project.PlanType);
        const planTypeUOM = planType ? planType.uom : '';
        
        // Check if this is a manual price entry
        const isManualPrice = project.PlanType === 'Manual Price' || planTypeUOM === '';
        
        let estimateDescription;
        if (isManualPrice) {
          // For manual price, show "1x $[amount] Manual Price" format
          const amount = project.Qty || 0; // Use Qty as the dollar amount for Manual Price
          estimateDescription = `1x $${amount} Manual Price`;
        } else if (project.Qty) { // Check chargeable qty instead of estimator qty
          // Transform UOM for UI display
          const getDisplayUOM = (uom, quantity) => {
            if (uom === 'ea') return 'x';
            if (uom === 'hr') {
              const qty = parseFloat(quantity) || 0;
              return qty === 1 ? 'Hr' : 'Hrs';
            }
            return uom; // Return as-is for other UOMs
          };
          
          const displayUOM = getDisplayUOM(planTypeUOM, project.Qty);
          estimateDescription = `${project.Qty || ''} ${displayUOM} - roof estimate with material quantities and measurements`.trim();
        }
        
        // Pre-fill form with project data
        const formData = {
          projectAddress: project.location?.address || project.name || '', // Convert object to string
          estimateDescription: estimateDescription,
          qty: project.Qty || 1, // Use chargeable Qty (capital Q), not estimator qty
          planType: project.PlanType || 'Standard'
        };
        
        console.log('[DEBUG] Setting form values (previewMode=' + previewMode + '):', formData);
        form.setFieldsValue(formData);
        
        // Only set the flag in live mode to prevent resetting user input
        if (!previewMode) {
          initialValuesSet.current = true;
        }
      }
    }
  }, [isVisible, project, form, previewMode]);

  const loadLinkedClients = async () => {
    try {
      if (previewMode && mockClients.length > 0) {
        // Use mock clients in preview mode
        setClients(mockClients);
        return;
      }

      if (project.linkedClients && project.linkedClients.length > 0) {
        // Load client details for linked clients in live mode
        const clientPromises = project.linkedClients.map(clientId =>
          axiosSecure.get(`/clients/${clientId}`)
        );
        const clientResponses = await Promise.all(clientPromises);
        const clientData = clientResponses.map(response => response.data.client);
        setClients(clientData);
      } else {
        // Fallback: Load all clients when no linkedClients exist
        console.log('[DEBUG] No linked clients found, loading all clients as fallback');
        const response = await axiosSecure.get('/clients');
        
        // Handle different response formats
        let clientsData = [];
        if (Array.isArray(response.data)) {
          // Direct array response
          clientsData = response.data;
        } else if (response.data && response.data.clients && Array.isArray(response.data.clients)) {
          // Nested object response
          clientsData = response.data.clients;
        }
        
        if (clientsData.length > 0) {
          setClients(clientsData);
          console.log(`[DEBUG] Loaded ${clientsData.length} clients as fallback`);
        } else {
          console.log('[DEBUG] No clients found in response');
        }
      }
      
      // EMAIL AUTO-FILL: Apply after clients are loaded
      performEmailAutoFill();
      
    } catch (error) {
      console.error("Error loading clients:", error);
      message.error("Failed to load client information");
    }
  };

  // EMAIL AUTO-FILL FUNCTION
  const performEmailAutoFill = async () => {
    try {
      console.log('[EMAIL AUTO-FILL] Starting email auto-fill process');
      setAutoFillError(null);
      
      if (!project) {
        console.log('[EMAIL AUTO-FILL] No project data available');
        return;
      }

      // Get auto-fill suggestion (pass current clients for matching)
      const suggestion = getPreferredRecipient(project, clients);
      
      console.log('[EMAIL AUTO-FILL] Auto-fill suggestion received:', suggestion);
      
      setAutoFillData(suggestion);
      setAutoFillConfidence(suggestion.confidence);
      setRecipientOptions(suggestion.allOptions || []);
      
      // Only auto-fill if we have a valid email and haven't set initial values yet
      if (suggestion.email && (!initialValuesSet.current || previewMode)) {
        console.log('[EMAIL AUTO-FILL] Applying auto-fill to form fields');
        
        // Get current form values to avoid overwriting user input
        const currentValues = form.getFieldsValue();
        
        // Only set email/name if they're currently empty
        const updatedFields = {};
        
        if (!currentValues.clientEmail) {
          updatedFields.clientEmail = suggestion.email;
        }
        
        if (!currentValues.clientName && suggestion.name) {
          updatedFields.clientName = suggestion.name;
        }
        
        if (Object.keys(updatedFields).length > 0) {
          form.setFieldsValue(updatedFields);
          console.log('[EMAIL AUTO-FILL] Form updated with:', updatedFields);
          
          // Show success notification based on confidence
          if (suggestion.confidence === 'high') {
            message.success({
              content: '✅ Email auto-filled from client user match',
              duration: 3
            });
          } else if (suggestion.confidence === 'medium') {
            message.info({
              content: '📧 Email auto-filled from project requester',
              duration: 3
            });
          }
        }
        
        // Manually trigger form change for preview mode
        if (previewMode && onFormChange) {
          const allValues = form.getFieldsValue();
          onFormChange(allValues);
        }
      } else {
        console.log('[EMAIL AUTO-FILL] Skipping auto-fill:', {
          hasEmail: !!suggestion.email,
          initialValuesSet: initialValuesSet.current,
          previewMode
        });
      }
      
    } catch (error) {
      console.error('[EMAIL AUTO-FILL] Error during auto-fill process:', error);
      setAutoFillError(error.message);
      
      // Log error for debugging but don't break user experience
      console.error('[EMAIL AUTO-FILL] Full error details:', {
        error: error.message,
        stack: error.stack,
        project: project?._id,
        metadata: project?.metadata?.rustyAgent
      });
    }
  };

  const handleClientSelect = async (clientId) => {
    try {
      console.log('[DEBUG] handleClientSelect called with clientId:', clientId);
      
      if (!clientId) {
        setSelectedClient(null);
        setLinkedUsers([]);
        setSelectedUser(null);
        // Clear form fields
        form.setFieldsValue({
          selectedClientId: null,
          selectedUserId: null,
          clientEmail: ''
        });
        return;
      }

      const client = clients.find(c => c._id === clientId);
      const previousClient = selectedClient;
      setSelectedClient(client);

      // Update form with selected client ID
      form.setFieldsValue({
        selectedClientId: clientId,
        selectedUserId: null  // Clear user selection when changing client
      });

      // Always clear selected user when switching clients
      console.log('Clearing selected user - previous:', selectedUser);
      setSelectedUser(null);
      console.log('Selected client changed to:', client?.company || client?.name);

      // Only auto-populate CLIENT EMAIL and NAME if this is a NEW client selection
      const isNewClientSelection = !previousClient || previousClient._id !== client._id;
      if (isNewClientSelection && client.mainContact && client.mainContact.email) {
        form.setFieldsValue({
          clientEmail: client.mainContact.email,
          clientName: client.mainContact.name || client.company || client.name  // Use contact name or company name
        });
        
        // Manually trigger form change for preview mode
        if (previewMode && onFormChange) {
          const allValues = form.getFieldsValue();
          console.log('[DEBUG] Manual trigger after client select:', allValues);
          onFormChange(allValues);
        }
      }

      // Load linked users for this client
      let availableUsers = [];
      
      // Always add main contact as first option if available
      if (client.mainContact && client.mainContact.email) {
        const isSender = project.contactEmail && client.mainContact.email.toLowerCase() === project.contactEmail.toLowerCase();
        availableUsers.push({
          _id: 'main-contact',
          name: client.mainContact.name || client.company || client.name,
          email: client.mainContact.email,
          isMainContact: true,
          isSender: isSender
        });
      }

      if (client.linkedUsers && client.linkedUsers.length > 0) {
        if (previewMode && mockUsers.length > 0) {
          // Use mock users in preview mode
          const userData = mockUsers.filter(user => client.linkedUsers.includes(user._id));
          availableUsers = [...availableUsers, ...userData];
        } else {
          // Load users from API in live mode with error handling for individual users
          const userPromises = client.linkedUsers.map(async (userId) => {
            try {
              const response = await axiosSecure.get(`/users/get-user/${userId}`);
              if (response.data?.success && response.data?.data) {
                const userData = response.data.data;
                // Mark if this user is the sender (who originally requested the quote)
                const isSender = project.contactEmail && userData.email && userData.email.toLowerCase() === project.contactEmail.toLowerCase();
                return {
                  ...userData,
                  isSender: isSender
                };
              }
              return null;
            } catch (error) {
              console.warn(`Failed to load user ${userId}:`, error.message);
              return null; // Return null for failed requests
            }
          });
          
          const userResponses = await Promise.all(userPromises);
          // Filter out null responses (failed requests)
          const validUsers = userResponses.filter(user => user !== null);
          availableUsers = [...availableUsers, ...validUsers];
        }
      }
      
      setLinkedUsers(availableUsers);
      
      if (availableUsers.length === 0) {
        console.warn('No valid users found for this client');
      } else {
        console.log(`Found ${availableUsers.length} available contacts for client:`, availableUsers.map(u => u.name || u.email));
        
        // Auto-select the sender if found
        const senderUser = availableUsers.find(u => u.isSender);
        if (senderUser && isNewClientSelection) {
          console.log('Auto-selecting sender:', senderUser.email);
          setSelectedUser(senderUser);
          form.setFieldsValue({
            selectedUserId: senderUser._id,
            clientEmail: senderUser.email,
            clientName: senderUser.name || (senderUser.firstName && senderUser.lastName ? `${senderUser.firstName} ${senderUser.lastName}` : senderUser.email)
          });
          
          // Manually trigger form change for preview mode
          if (previewMode && onFormChange) {
            const allValues = form.getFieldsValue();
            onFormChange(allValues);
          }
        }
      }
    } catch (error) {
      console.error("Error loading client contacts:", error);
      // Don't show error message for 404s as they're common when users are deleted
      if (error.response?.status !== 404) {
        message.error("Failed to load client information");
      }
    }
  };

  const handleUserSelect = (userId, userList = linkedUsers) => {
    console.log('handleUserSelect called with userId:', userId);
    console.log('userList:', userList);
    console.log('linkedUsers:', linkedUsers);
    
    if (!userId) {
      setSelectedUser(null);
      // Update form field
      form.setFieldsValue({
        selectedUserId: null
      });
      return;
    }

    // Ensure we have a valid array to work with
    const usersArray = Array.isArray(userList) ? userList : linkedUsers;
    if (!Array.isArray(usersArray)) {
      console.error('No valid user array found');
      return;
    }

    const user = usersArray.find(u => u._id === userId);
    console.log('Selected user:', user);
    setSelectedUser(user);

    // Update form field
    form.setFieldsValue({
      selectedUserId: userId
    });

    // Update CLIENT EMAIL and CLIENT NAME fields when selecting a user contact
    if (user) {
      const displayName = user.isMainContact 
        ? user.name 
        : (user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.name);
          
      console.log('Updating form with user data:', displayName, user.email);
      form.setFieldsValue({
        clientEmail: user.email,
        clientName: displayName
      });
      
      // Manually trigger form change for preview mode
      if (previewMode && onFormChange) {
        const allValues = form.getFieldsValue();
        console.log('[DEBUG] Manual trigger after user select:', allValues);
        onFormChange(allValues);
      }
    }
  };

  const handleClientCreated = (newClient) => {
    // Add new client to the list
    setClients(prev => [...prev, newClient]);
    
    // Directly set the selected client (don't wait for state update)
    setSelectedClient(newClient);
    
    // Update form with client data
    form.setFieldsValue({
      selectedClientId: newClient._id,
      selectedUserId: null,
      clientEmail: newClient.mainContact?.email || '',
      clientName: newClient.mainContact?.name || newClient.name || ''
    });
    
    // Clear user selection
    setSelectedUser(null);
    setLinkedUsers([]);
    
    // Load linked users for this client
    if (newClient.linkedUsers && newClient.linkedUsers.length > 0) {
      const fetchLinkedUsers = async () => {
        try {
          const userPromises = newClient.linkedUsers.map(userId =>
            axiosSecure.get(`/users/${userId}`)
          );
          const userResponses = await Promise.all(userPromises);
          const users = userResponses.map(res => res.data);
          setLinkedUsers(users);
        } catch (error) {
          console.error('Error loading linked users for new client:', error);
        }
      };
      fetchLinkedUsers();
    }
    
    // Close modal
    setShowAddClientModal(false);
  };

  const handleSendEmail = async (values) => {
    // Create loading spinner for email sending
    const emailSpinner = showLoadingSpinner('Sending estimate email...', {
      subtitle: `To: ${values.clientEmail}`,
      progressText: 'Preparing email',
      showProgress: true,
      backgroundColor: 'rgba(0, 0, 0, 0.85)'
    });

    try {
      setLoading(true);

      // Generate dynamic estimate text based on UOM
      const selectedPlanType = basePlanTypes.find(type => type.label === values.planType);
      let estimateDescription = 'estimate';
      
      if (selectedPlanType) {
        const { label, uom } = selectedPlanType;
        
        // Check if this is Manual Price (no UOM or Manual Price label)
        if (label === 'Manual Price' || !uom) {
          // For Manual Price: "1x $[amount] Manual Price"
          const amount = values.qty || project.Qty || 0;
          estimateDescription = `1x $${amount} Manual Price`;
        } else if (values.qty) {
          if (uom === 'ea') {
            // For "ea" UOM: "[QTY]x [label]"
            estimateDescription = `${values.qty}x ${label}`;
          } else if (uom === 'hr') {
            // For "hr" UOM: "[QTY] hr [label]"
            const hourText = values.qty === 1 ? 'hr' : 'hrs';
            estimateDescription = `${values.qty} ${hourText} ${label}`;
          } else {
            // Fallback for other UOMs
            estimateDescription = `${values.qty}x ${label}`;
          }
        }
      }

      // Update spinner progress
      emailSpinner.setProgress(25);
      emailSpinner.setTitle('Generating email template...');

      const emailData = {
        contactEmail: values.clientEmail,  // Backend expects contactEmail
        contactName: values.clientName,    // Backend expects contactName
        projectAddress: values.projectAddress,
        estimateDescription: estimateDescription,
        qty: values.qty,
        planType: values.planType,
        optionalBody: values.optionalBody,
        memo: values.memo,
        textColor: textColor, // Add text color for email styling
        companyLogoUrl: null // TODO: Add company logo support
      };

      // Generate the complete email template HTML and subject
      const templateData = {
        contactName: values.clientName, // Backend template expects contactName, form provides clientName
        projectAddress: values.projectAddress,
        projectNumber: project.projectNumber,
        estimateDescription: estimateDescription,
        optionalBody: values.optionalBody,
        memo: values.memo,
        textColor: textColor, // Add text color for template rendering
        companyLogoUrl: null,
        // Use alias for direct project URL if available, otherwise fall back to project ID
        projectViewUrl: project.alias 
          ? `${import.meta.env.VITE_FRONTEND_URL || 'https://projects.allrooftakeoffs.com.au'}/project/${project.alias}`
          : `${import.meta.env.VITE_FRONTEND_URL || 'https://projects.allrooftakeoffs.com.au'}/project/${project._id}`
      };

      const emailTemplate = EstimateCompleteTemplate(templateData);
      
      // Update spinner progress
      emailSpinner.setProgress(50);
      emailSpinner.setTitle('Sending email...');
      emailSpinner.setSubtitle('Delivering to client');

      // Send complete template to backend
      const emailPayload = {
        ...emailData,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        projectId: project._id,
        // Add PDF attachments if selected - selectedPDFs is array of {name, folderPath} objects
        ...(selectedPDFs.length > 0 && {
          attachments: selectedPDFs.map(pdf => ({
            folderPath: pdf.folderPath,
            fileName: pdf.name
          }))
        })
      };

      console.log('[DEBUG] Email payload being sent:', {
        ...emailPayload,
        html: emailPayload.html.substring(0, 100) + '...' // Truncate HTML for readability
      });
      console.log('[DEBUG] Selected PDFs:', selectedPDFs);
      console.log('[DEBUG] Attachments in payload:', emailPayload.attachments);

      console.log('[DEBUG] Sending email data:', emailPayload);
      console.log('[DEBUG] All form values:', values);

      const response = await axiosSecure.post(`/projects/send-estimate/${project._id}`, emailPayload);

      if (response.data.success) {
        // Update spinner progress
        emailSpinner.setProgress(80);
        emailSpinner.setTitle('Email sent successfully!');
        emailSpinner.setSubtitle(`Delivered to ${values.clientEmail}`);
        
        // Backend automatically updates Status to "Sent" and syncs loyalty units
        // Complete the loading
        emailSpinner.complete();
        
        // Small delay before destroying
        await new Promise(resolve => setTimeout(resolve, 1200));
        emailSpinner.destroy();

        message.success("Estimate complete email sent successfully!");
        form.resetFields();
        initialValuesSet.current = false; // Reset flag so values can be set again next time
        
        // Trigger JobBoard refresh if callback provided
        if (onSuccess) {
          onSuccess();
        }
        
        onClose();
      } else {
        // Show error
        emailSpinner.error('Failed to send email');
        await new Promise(resolve => setTimeout(resolve, 1000));
        emailSpinner.destroy();
        
        message.error(response.data.message || "Failed to send email");
      }
    } catch (error) {
      // Show error state
      emailSpinner.error('Email sending failed');
      await new Promise(resolve => setTimeout(resolve, 1000));
      emailSpinner.destroy();
      
      console.error("Error sending estimate email:", error);
      console.error("Error response data:", error.response?.data);
      
      // Show more specific error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          `Failed to send estimate email (${error.response?.status})`;
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedClient(null);
    setLinkedUsers([]);
    setSelectedUser(null);
    initialValuesSet.current = false; // Reset flag so values can be set again next time
    onClose();
  };

  // Get plan type UOM for placeholder and transform for UI display
  const planType = basePlanTypes.find(type => type.label === project?.PlanType);
  const planTypeUOM = planType ? planType.uom : '';
  
  // Check if this is a manual price entry
  const isManualPrice = project?.PlanType === 'Manual Price' || planTypeUOM === '';
  
  let placeholderText;
  if (isManualPrice) {
    // For manual price, show example custom description
    placeholderText = "e.g. Roof and colorblocking for $100 - custom estimate description";
  } else {
    // Transform UOM for UI display
    const getDisplayUOM = (uom, quantity) => {
      if (uom === 'ea') return 'x';
      if (uom === 'hr') {
        const qty = parseFloat(quantity) || 0;
        return qty === 1 ? 'Hr' : 'Hrs';
      }
      return uom; // Return as-is for other UOMs
    };
    
    const displayUOM = getDisplayUOM(planTypeUOM, project?.Qty);
    placeholderText = `${project?.Qty || ''} ${displayUOM} - roof takeoff estimate with material quantities`.trim();
  }

  // Add form change handler for preview mode with debouncing for text inputs
  const handleFormValuesChange = (changedValues, allValues) => {
    // Only log for dropdown changes or in preview mode
    const immediateUpdateFields = ['selectedClientId', 'selectedUserId', 'planType'];
    const hasImmediateUpdate = Object.keys(changedValues).some(field => 
      immediateUpdateFields.includes(field)
    );
    
    if (hasImmediateUpdate || previewMode) {
      console.log('[DEBUG] Form values changed:', { changedValues, allValues });
    }
    
    if (previewMode && onFormChange) {
      
      if (hasImmediateUpdate) {
        // Immediate update for dropdown selections
        console.log('[DEBUG] Immediate update for selection field');
        onFormChange(allValues);
      } else {
        // Debounced update for text inputs to prevent racing
        clearTimeout(window.templateFormDebounce);
        window.templateFormDebounce = setTimeout(() => {
          onFormChange(allValues);
        }, 500); // 500ms delay for text inputs
      }
    }
  };

  // The modal content (form)
  const modalContent = (
    <>
      {/* Project Info Banner */}
      <div className="mb-5 p-3 bg-green-50 rounded-md border border-green-200">
        <p className="mb-0 text-green-900 text-sm">
          <strong>Project:</strong> {project?.name || 'Project Name'} (#{project?.projectNumber || 'N/A'})
        </p>
        <p className="mb-0 text-gray-600 text-xs mt-1">
          This will send a professional email with a secure link for the client to view estimate details.
        </p>
      </div>

      <Form
        form={form}
        layout="vertical"
        size="large"
        onFinish={handleSendEmail}
        onValuesChange={handleFormValuesChange}
        autoComplete="off"
      >
        {/* Client Selection with Avatars */}
        <Form.Item 
          label={
            <div className="flex items-center justify-between w-full">
              <span>Select Linked Client (Optional)</span>
              <Button 
                type="link" 
                size="small" 
                icon={<PlusOutlined />}
                onClick={() => setShowAddClientModal(true)}
                className="text-green-600 hover:text-green-700"
              >
                Add New Client
              </Button>
            </div>
          }
          name="selectedClientId"
        >
          <Select
            placeholder="Choose from linked clients..."
            allowClear
            onChange={handleClientSelect}
            className="w-full"
            showSearch={false}
            optionLabelProp="label"
            filterOption={false}
            mode={undefined}
          >
            {clients.map(client => (
              <Option 
                key={client._id} 
                value={client._id}
                label={client.company || client.name}
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    name={client.company || client.name}
                    avatarUrl={client.avatar}
                    size="sm"
                  />
                  <span>{client.company || client.name}</span>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* User Selection within Client */}
        {selectedClient && linkedUsers.length > 0 && (
          <Form.Item 
            label="Select Contact Person"
            name="selectedUserId"
          >
            <Select
              placeholder="Choose contact person..."
              allowClear
              onChange={handleUserSelect}
              className="w-full"
              value={selectedUser?._id}
              showSearch={false}
              optionLabelProp="label"
              filterOption={false}
              mode={undefined}
            >
              {linkedUsers.map(user => (
                <Option 
                  key={user._id} 
                  value={user._id}
                  label={user.isMainContact 
                    ? `${user.name} (Main Contact)${user.isSender ? ' • Sender' : ''}`
                    : user.isSender
                      ? `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || user.email} (Sender)`
                      : (user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.name || user.email)
                  }
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={user.isMainContact 
                        ? user.name
                        : (user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.name || user.email)
                      }
                      avatarUrl={user.avatar}
                      size="sm"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {user.isMainContact 
                            ? user.name
                            : (user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.name || user.email)
                          }
                        </span>
                        {user.isMainContact && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Main Contact
                          </span>
                        )}
                        {user.isSender && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Sender
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Client Email with Auto-Fill */}
        <Form.Item
          label={
            <div className="flex items-center gap-2">
              <span>Client Email(s)</span>
              {autoFillData && autoFillConfidence !== 'low' && (
                <Tooltip title={getConfidenceBadge(autoFillConfidence, autoFillData.source).description}>
                  <Tag 
                    color={getConfidenceBadge(autoFillConfidence, autoFillData.source).color}
                    className="text-xs"
                  >
                    {getConfidenceBadge(autoFillConfidence, autoFillData.source).icon} 
                    {getConfidenceBadge(autoFillConfidence, autoFillData.source).text}
                  </Tag>
                </Tooltip>
              )}
              {autoFillError && (
                <Tooltip title={`Auto-fill error: ${autoFillError}`}>
                  <Tag color="error" className="text-xs">
                    ⚠️ Auto-fill Failed
                  </Tag>
                </Tooltip>
              )}
            </div>
          }
          name="clientEmail"
          rules={[
            { required: true, message: "Client email is required" },
            { 
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                
                // Split by comma and validate each email
                const emails = value.split(',').map(email => email.trim()).filter(email => email);
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                
                for (const email of emails) {
                  if (!emailRegex.test(email)) {
                    return Promise.reject(new Error(`"${email}" is not a valid email address`));
                  }
                }
                
                return Promise.resolve();
              }
            }
          ]}
          help="Use commas to separate multiple emails: email1@domain.com, email2@domain.com"
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="client@example.com, sales@company.com"
            size="large"
            suffix={
              recipientOptions.length > 0 && (
                <Tooltip title="Select from email thread participants">
                  <InfoCircleOutlined 
                    style={{ color: '#1890ff', cursor: 'pointer' }}
                    onClick={() => {
                      // Show recipient options modal/dropdown
                      // For simplicity, we'll show in a message for now
                      const optionsList = recipientOptions.map((opt, idx) => 
                        `${idx + 1}. ${formatRecipientOption(opt)}`
                      ).join('\n');
                      
                      Modal.info({
                        title: 'Available Email Recipients',
                        content: (
                          <div>
                            <p>Select from email thread participants:</p>
                            <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-line', marginTop: 8 }}>
                              {optionsList}
                            </div>
                          </div>
                        ),
                        okText: 'Close'
                      });
                    }}
                  />
                </Tooltip>
              )
            }
          />
        </Form.Item>

        {/* Quick select buttons for recipient options */}
        {recipientOptions.length > 1 && (
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Quick Select Recipients:</div>
            <div className="flex flex-wrap gap-2">
              {recipientOptions.slice(0, 3).map((option, index) => (
                <Button
                  key={index}
                  size="small"
                  type={option.isMatch ? "primary" : "default"}
                  onClick={() => {
                    form.setFieldsValue({
                      clientEmail: option.email,
                      clientName: option.name || option.email
                    });
                    if (previewMode && onFormChange) {
                      const allValues = form.getFieldsValue();
                      onFormChange(allValues);
                    }
                  }}
                  className="text-xs"
                >
                  {option.isClientUser && '✅ '}{option.name || option.email}
                </Button>
              ))}
              {recipientOptions.length > 3 && (
                <Button size="small" type="link" className="text-xs p-0">
                  +{recipientOptions.length - 3} more
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Client Name */}
        <Form.Item
          label="Client Name"
          name="clientName"
          rules={[{ required: true, message: "Client name is required" }]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Contact person name"
            size="large"
          />
        </Form.Item>

        {/* Debug Info: Email Thread Data (development mode) */}
        {process.env.NODE_ENV === 'development' && autoFillData && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
            <div className="text-sm font-medium text-gray-700 mb-2">
              📧 Email Auto-Fill Debug Info
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Source:</strong> {autoFillData.source}</div>
              <div><strong>Confidence:</strong> {autoFillData.confidence}</div>
              <div><strong>Email Thread Data:</strong></div>
              {project?.metadata?.rustyAgent?.extractedData?.emailThread ? (
                <div className="ml-4 space-y-1">
                  <div><strong>Primary Requester:</strong> {project.metadata.rustyAgent.extractedData.emailThread.primaryRequester?.raw}</div>
                  <div><strong>Thread Emails:</strong> {project.metadata.rustyAgent.extractedData.emailThread.threadEmails?.join(', ')}</div>
                  <div><strong>Subject:</strong> {project.metadata.rustyAgent.extractedData.emailThread.subject}</div>
                  <div><strong>Has Thread:</strong> {project.metadata.rustyAgent.extractedData.emailThread.hasThread ? 'Yes' : 'No'}</div>
                </div>
              ) : (
                <div className="ml-4 text-gray-500">No email thread data found</div>
              )}
              {autoFillError && (
                <div className="text-red-600"><strong>Error:</strong> {autoFillError}</div>
              )}
            </div>
          </div>
        )}

        {/* Project Address */}
        <Form.Item
          label="Project Address/Description"
          name="projectAddress"
          rules={[{ required: true, message: "Project address is required" }]}
        >
          <Input
            prefix={<HomeOutlined />}
            placeholder="123 Main Street, Suburb, State"
            size="large"
          />
        </Form.Item>

        {/* QTY and Plan Type - Same Row */}
        <div className="flex gap-4 items-start">
          {/* QTY - 1/6 width */}
          <Form.Item
            label="QTY"
            name="qty"
            rules={[{ required: true, message: "Quantity is required" }]}
            help="Supports decimals (1.5)"
            className="flex-none w-1/6 min-w-[70px]"
          >
            <InputNumber
              min={0.5}
              max={100}
              step={0.5}
              placeholder="1"
              size="large"
              style={{ width: '100%' }}
            />
          </Form.Item>

          {/* Plan Type - Remaining width */}
          <Form.Item
            label="Plan Type"
            name="planType"
            rules={[{ required: true, message: "Plan type is required" }]}
            help="Select the type of plan/service"
            className="flex-1"
          >
            <Select
              placeholder="Select plan type"
              size="large"
            >
            {basePlanTypes.map((planType) => (
              <Option key={planType.label} value={planType.label}>
                {planType.label} - ${planType.AUD} {planType.uom}
              </Option>
            ))}
          </Select>
        </Form.Item>
        </div>

        {/* Estimate Notes Field with Color Selector */}
        <Form.Item
          label={
            <div className="flex items-center gap-2">
              <span>Estimate Notes: (optional)</span>
            </div>
          }
          name="memo"
          help="Add special notes, add-ins, or additional details (HTML compatible)"
        >
          {/* Color Selector */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">Text Color:</span>
            {colorOptions.map((option) => (
              <button
                key={option.name}
                type="button"
                onClick={() => setTextColor(option.color)}
                className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                  textColor === option.color 
                    ? 'border-gray-800 shadow-md' 
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                style={{ backgroundColor: option.bgColor }}
                title={option.name}
              />
            ))}
            
            {/* Reset/Clear Color Button */}
            <button
              type="button"
              onClick={() => setTextColor('#374151')} // Reset to default
              className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-gray-500 transition-all hover:scale-110 flex items-center justify-center bg-white"
              title="Reset to Default Color"
            >
              <span className="text-xs text-gray-500">✕</span>
            </button>
          </div>
          
          <TextArea
            placeholder="Additional items, special requests, or notes..."
            rows={3}
            maxLength={1000}
            showCount
            style={{ color: textColor }}
            onChange={(e) => {
              // Ensure the form field is updated
              form.setFieldsValue({ memo: e.target.value });
              // Trigger form change handler manually
              handleFormValuesChange({ memo: e.target.value }, { ...form.getFieldsValue(), memo: e.target.value });
            }}
          />
        </Form.Item>

        {/* PDF Attachments */}
        <Form.Item>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <Checkbox
              checked={attachPDFs}
              onChange={(e) => {
                setAttachPDFs(e.target.checked);
                if (!e.target.checked) {
                  setSelectedPDFs([]);
                }
              }}
              className="font-medium"
            >
              Attach PDF files from BOQ folder
            </Checkbox>
            
            {attachPDFs && (
              <div className="mt-3">
                {loadingPDFs ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                    <p className="text-sm text-gray-600 mt-2">Loading PDFs...</p>
                  </div>
                ) : availablePDFs.length === 0 ? (
                  <div className="text-sm text-gray-500 italic py-2">
                    No PDF files found in BOQ folder
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Select PDFs to attach ({selectedPDFs.length} selected)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedPDFs.length === availablePDFs.length) {
                            setSelectedPDFs([]);
                          } else {
                            setSelectedPDFs([...availablePDFs]);
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {selectedPDFs.length === availablePDFs.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded bg-white">
                      {availablePDFs.map((pdf, index) => (
                        <div
                          key={index}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <Checkbox
                            checked={selectedPDFs.some(p => p.name === pdf.name && p.folderPath === pdf.folderPath)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPDFs([...selectedPDFs, pdf]);
                              } else {
                                setSelectedPDFs(selectedPDFs.filter(p => !(p.name === pdf.name && p.folderPath === pdf.folderPath)));
                              }
                            }}
                          />
                          <div className="ml-2 flex-1 truncate">
                            <span className="text-sm text-gray-700" title={pdf.name}>
                              {pdf.name}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({pdf.folderPath})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Form.Item>

        {/* Reply to Original Email Field - TODO: Key will be updated to 'emailReply' in future */}
        <Form.Item
          label="Reply to original email: (Optional)"
          name="optionalBody"
          help="Add a personal message, special notes, or reply to client conversation (optional)"
        >
          <TextArea
            placeholder="Hi John, as discussed, here's your roof estimate. Please note the premium materials as requested..."
            rows={4}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        {/* Form Actions */}
        <Form.Item className="mb-0 mt-6">
          <div className="flex justify-end gap-3">
            <Button onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="bg-green-600 border-green-600 min-w-[120px]"
            >
              Send Estimate
            </Button>
          </div>
        </Form.Item>
      </Form>
    </>
  );

  // Conditional rendering based on preview mode
  if (previewMode) {
    return modalContent;
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MailOutlined style={{ color: '#009245' }} />
          <span>Send Estimate Complete</span>
        </div>
      }
      open={isVisible}
      onCancel={handleCancel}
      width={900}
      footer={null}
      destroyOnClose
    >
      {modalContent}
      
      {/* Add New Client Modal - Reusable Component */}
      <AddClientModal
        isVisible={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        onClientCreated={handleClientCreated}
      />
    </Modal>
  );
};

export default EstimateCompleteModal;
