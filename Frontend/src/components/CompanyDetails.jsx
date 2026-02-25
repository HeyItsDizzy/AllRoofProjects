import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../auth/AuthProvider";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import CompanyForm from "./CompanyForm";
import { calculateCompanyProfileStrength } from "../utils/profileStrength";

const CompanyDetails = ({ isNewMode = false }) => {
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const { user, refreshUser } = useContext(AuthContext);
  const [isEditingCompany, setIsEditingCompany] = useState(isNewMode); // Start in edit mode if creating new
  
  // Store original form state for cancel functionality
  const [originalCompanyForm, setOriginalCompanyForm] = useState(null);
  
  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: "", 
    legalName: "", 
    registrationNumber: "",
    logoUrl: "",
    // Australia fields
    abn: "", 
    acn: "", 
    gstRegistered: "",
    taxInvoiceRequired: "",
    // US fields
    ein: "", 
    stateTaxId: "",
    ssnItin: "",
    w9OnFile: "",
    // Norway fields
    organizationNumber: "",
    vatNumber: "",
    vatRegistered: "",
    billingAddress: {
      line1: "", 
      line2: "", 
      city: "",
      state: "", 
      postalCode: "", 
      country: "Australia",  // Full country name
      region: "AU",          // Country code
      full_address: "",
      streetNumber: ""
    },
    mainContact: { 
      name: "", 
      email: "", 
      phone: "",
      accountsEmail: ""
    },
    sameAsMainContact: false
  });
  const [companyLoading, setCompanyLoading] = useState(true);
  
  // Profile strength state
  const [showCompanyStrengthDetails, setShowCompanyStrengthDetails] = useState(false);
  const [companyStrength, setCompanyStrength] = useState({ percentage: 0, completedFields: 0, totalFields: 0 });

  // Calculate company profile strength whenever form data changes
  useEffect(() => {
    const strength = calculateCompanyProfileStrength(companyForm);
    setCompanyStrength(strength);
  }, [companyForm]);

  // Fetch company data
  const fetchCompanyData = async () => {
    // Get client ID from linkedClients array (first client if multiple)
    const clientId = user?.linkedClients?.[0];
    if (!clientId) {
      console.log("❌ [fetchCompanyData] No client ID found in user.linkedClients");
      setCompanyLoading(false);
      return;
    }
    
    setCompanyLoading(true);
    try {
      console.log("🔍 [fetchCompanyData] Fetching company data for ID:", clientId);
      const res = await axiosSecure.get(`/clients/${clientId}`);
      const data = res.data.client || res.data;
      console.log("✅ [fetchCompanyData] Company data received:", data);
      setCompanyForm((f) => ({
        ...f,
        name: data.name || "",
        legalName: data.legalName || "",
        registrationNumber: data.registrationNumber || "",
        logoUrl: data.logoUrl || "",
        
        // Australia fields
        abn: data.abn || "",
        acn: data.acn || "",
        gstRegistered: data.gstRegistered || "",
        taxInvoiceRequired: data.taxInvoiceRequired || "",
        
        // US fields
        ein: data.ein || "",
        stateTaxId: data.stateTaxId || "",
        ssnItin: data.ssnItin || "",
        w9OnFile: data.w9OnFile || "",
        
        // Norway fields
        organizationNumber: data.organizationNumber || "",
        vatNumber: data.vatNumber || "",
        vatRegistered: data.vatRegistered || "",
        
        billingAddress: {
          ...f.billingAddress,
          ...(data.billingAddress || {}),
          streetNumber: data.billingAddress?.streetNumber || ""
        },
        mainContact: {
          ...f.mainContact,
          ...(data.mainContact || {}),
          accountsEmail: data.mainContact?.accountsEmail || ""
        },
        sameAsMainContact: data.sameAsMainContact || false,
      }));

      // Also save as original state for cancel functionality
      const originalData = {
        name: data.name || "",
        legalName: data.legalName || "",
        registrationNumber: data.registrationNumber || "",
        logoUrl: data.logoUrl || "",
        
        // Australia fields
        abn: data.abn || "",
        acn: data.acn || "",
        gstRegistered: data.gstRegistered || "",
        taxInvoiceRequired: data.taxInvoiceRequired || "",
        
        // US fields
        ein: data.ein || "",
        stateTaxId: data.stateTaxId || "",
        ssnItin: data.ssnItin || "",
        w9OnFile: data.w9OnFile || "",
        
        // Norway fields
        organizationNumber: data.organizationNumber || "",
        vatNumber: data.vatNumber || "",
        vatRegistered: data.vatRegistered || "",
        
        billingAddress: {
          line1: data.billingAddress?.line1 || "", 
          line2: data.billingAddress?.line2 || "", 
          city: data.billingAddress?.city || "",
          state: data.billingAddress?.state || "", 
          postalCode: data.billingAddress?.postalCode || "", 
          country: data.billingAddress?.country || "Australia",
          region: data.billingAddress?.region || "AU",
          full_address: data.billingAddress?.full_address || "",
          streetNumber: data.billingAddress?.streetNumber || ""
        },
        mainContact: {
          name: data.mainContact?.name || "", 
          email: data.mainContact?.email || "", 
          phone: data.mainContact?.phone || "",
          accountsEmail: data.mainContact?.accountsEmail || ""
        },
        sameAsMainContact: data.sameAsMainContact || false,
      };
      setOriginalCompanyForm(originalData);
    } catch (err) {
      console.error("❌ [fetchCompanyData] Error fetching company:", err);
      if (err.response?.status === 404) {
        console.log("🔍 [fetchCompanyData] Company not found, user may need to be linked");
      }
      Swal.fire("Error", "Could not load company data.", "error");
    } finally {
      setCompanyLoading(false);
    }
  };

  // Handle linking to existing company
  const handleConnectToCompany = async () => {
    const { value: code } = await Swal.fire({
      title: 'Link to Existing Company',
      showLoaderOnConfirm: true,
      input: 'text',
      inputLabel: 'Enter your 10-character linking code',
      inputPlaceholder: 'A1B2C3D4E5',
      inputAttributes: {
        maxlength: 10,
        autocapitalize: 'characters',
        autocorrect: 'off',
        style: 'text-align: center'
      },
      showCancelButton: true,
      confirmButtonText: 'Link Company',
      preConfirm: async (inputCode) => {
        const trimmed = inputCode?.trim().toUpperCase();
        if (!trimmed) {
          return Promise.reject(new Error('Please enter a linking code.'));
        }

        try {
          // first try the standard‐user endpoint
          let res;
          try {
            res = await axiosSecure.post("/users/link-company-user", { code: trimmed });
          } catch (err) {
            // if it's not a valid user‐link code, try the admin endpoint
            if (err.response?.data?.message === "Invalid user linking code.") {
              res = await axiosSecure.post("/users/link-company-admin", { code: trimmed });
            } else {
              throw err;
            }
          }

          if (!res.data.success) {
            throw new Error(res.data.message || "Linking failed");
          }

          // return the company name for your final welcome message
          return res.data.clientName;
        } catch (err) {
          return Promise.reject(
            new Error(err.response?.data?.message || err.message)
          );
        }
      }
    });

    if (code) {
      await refreshUser();

      await Swal.fire({
        icon: 'success',
        title: 'Welcome!',
        text: `Your code "${code}" has linked you to your company.`,
        confirmButtonText: 'Continue'
      });

      // Refresh company data after linking
      fetchCompanyData();
    }
  };

  // Load company data on mount
  useEffect(() => {
    fetchCompanyData();
  }, []);

  // Handle company form changes
  const handleCompanyChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setCompanyForm(f => ({
        ...f,
        [name]: checked
      }));
    } else if (name === "mainContact.name") {
      setCompanyForm(f => ({
        ...f,
        mainContact: {
          ...f.mainContact,
          name: value
        }
      }));
    } else if (name === "mainContact.email") {
      setCompanyForm(f => ({
        ...f,
        mainContact: {
          ...f.mainContact,
          email: value
        }
      }));
    } else if (name === "mainContact.phone") {
      setCompanyForm(f => ({
        ...f,
        mainContact: {
          ...f.mainContact,
          phone: value
        }
      }));
    } else if (name === "mainContact.accountsEmail") {
      setCompanyForm(f => ({
        ...f,
        mainContact: {
          ...f.mainContact,
          accountsEmail: value
        }
      }));
    } else if (name === "mainContact") {
      setCompanyForm(f => {
        return {
          ...f,
          mainContact: {
            ...f.mainContact,
            ...value
          }
        };
      });
    } else if (name === "billingAddress") {
      setCompanyForm(f => {
        return {
          ...f,
          billingAddress: {
            ...f.billingAddress,
            ...value
          }
        };
      });
    } else {
      setCompanyForm(f => ({ ...f, [name]: value }));
    }
  };

  // Handle address changes
  const handleCompanyAddressChange = (addressData) => {
    const updatedAddress = {
      line1: addressData.address_line_1 || '',
      line2: addressData.address_line_2 || '',
      city: addressData.city || '',
      state: addressData.state || '',
      postalCode: addressData.zip || '',
      country: addressData.country || 'Australia',  // Full country name
      region: addressData.region || 'AU',           // Country code
      full_address: addressData.full_address || '',
      streetNumber: addressData.streetNumber || '',
    };

    setCompanyForm(f => ({
      ...f,
      billingAddress: {
        ...f.billingAddress,
        ...updatedAddress
      }
    }));
  };

  // Handle cancel action - restore original form state
  const handleCancelEdit = () => {
    if (originalCompanyForm) {
      setCompanyForm(originalCompanyForm);
    }
    setIsEditingCompany(false);
  };

  // Handle entering edit mode - save current state as backup
  const handleEnterEditMode = () => {
    // Save current form state as backup when entering edit mode
    setOriginalCompanyForm({ ...companyForm });
    setIsEditingCompany(true);
  };

  // Handle company form submission
  const handleSubmitCompany = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...companyForm };
      
      // If "same as primary contact" is checked, ensure accountsEmail matches the primary email
      if (submitData.sameAsMainContact && submitData.mainContact.email) {
        submitData.mainContact.accountsEmail = submitData.mainContact.email;
      }
      
      if (isNewMode) {
        // Create new company
        console.log("🔍 [Frontend] Creating new company:", JSON.stringify(submitData, null, 2));
        const response = await axiosSecure.post("/clients", submitData);
        
        if (response.data && response.data._id) {
          const newClientId = response.data._id;
          
          // Link the current user to the new company as admin
          await axiosSecure.patch(`/clients/assignUser/${newClientId}`, {
            userId: user._id,
            multiAssign: false
          });
          
          // Refresh user data to get the updated linkedClients
          await refreshUser();
          
          Swal.fire({ 
            icon: "success", 
            title: "Company created successfully", 
            text: "You are now linked as the company administrator.",
            timer: 3000, 
            toast: true, 
            position: "top-end",
            showConfirmButton: false 
          });
          
          // Redirect to normal company profile after creation
          navigate('/company-profile');
        }
      } else {
        // Update existing company
        const clientId = user?.linkedClients?.[0];
        if (!clientId) {
          console.error("❌ No client ID found in user.linkedClients");
          return;
        }
        
        console.log("🔍 [Frontend] Updating company data:", JSON.stringify(submitData, null, 2));
        await axiosSecure.patch(`/clients/${clientId}`, submitData);
        
        Swal.fire({ 
          icon: "success", 
          title: "Company updated successfully", 
          timer: 2500, 
          toast: true, 
          position: "top-end",
          showConfirmButton: false 
        });
        setIsEditingCompany(false);
        await fetchCompanyData(); // Refresh the company data
      }
    } catch (err) {
      console.error("Error saving company:", err);
      console.error("❌ [Frontend] Full error details:", err.response?.data);
      const action = isNewMode ? "create" : "update";
      Swal.fire("Error", `Failed to ${action} company data.`, "error");
    }
  };

  // Check if user has no linked clients (but skip this check if we're in new mode)
  const hasNoLinkedClients = !isNewMode && (!user?.linkedClients || user.linkedClients.length === 0);

  if (companyLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Show company choice options if user has no linked clients
  if (hasNoLinkedClients) {
    return (
      <div className="border rounded-lg bg-white p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Company Data Not Found</h2>
          <p className="text-gray-600 mb-8">
            You're not currently linked to any company. Choose an option below to get started.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Create New Company */}
            <div
              onClick={() => navigate('/company-profile?mode=new')}
              className="cursor-pointer border rounded-lg bg-gray-50 p-4 flex flex-col items-center hover:shadow-md hover:bg-gray-100 transition"
            >
              <img
                src="/images/CompanyCreateNew.svg"
                alt="Create New Company"
                className="w-24 h-24 mb-3"
              />
              <h3 className="text-md font-medium mb-2">Create New Company</h3>
              <p className="text-sm text-gray-600 text-center">
                Set up your company's profile and become the account owner.
              </p>
            </div>

            {/* Connect to Existing Company */}
            <div
              onClick={handleConnectToCompany}
              className="cursor-pointer border rounded-lg bg-gray-50 p-4 flex flex-col items-center hover:shadow-md hover:bg-gray-100 transition"
            >
              <img
                src="/images/CompanyLinkExisting.svg"
                alt="Connect to Existing Company"
                className="w-24 h-24 mb-3"
              />
              <h3 className="text-md font-medium mb-2">Connect to Existing Company</h3>
              <p className="text-sm text-gray-600 text-center">
                Link your user account to your company's existing profile.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Company Profile Strength */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-textBlack">Company Details</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Company Strength:</span>
              <button
                onClick={() => setShowCompanyStrengthDetails(!showCompanyStrengthDetails)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all hover:shadow-md ${
                  companyStrength.percentage >= 150 ? 'bg-green-100 text-green-800 border-green-300' :
                  companyStrength.percentage >= 120 ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  companyStrength.percentage >= 75 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                  'bg-red-100 text-red-800 border-red-300'
                }`}
                title="Click to see detailed breakdown"
              >
                {companyStrength.percentage >= 150 ? '💚' :
                 companyStrength.percentage >= 120 ? '�' :
                 companyStrength.percentage >= 75 ? '💛' :
                 '❤️'} {companyStrength.percentage}/150 {
                  companyStrength.percentage >= 150 ? 'Complete' :
                  companyStrength.percentage >= 120 ? 'Trusted' :
                  companyStrength.percentage >= 75 ? 'Workable' :
                  'Incomplete'}
                <svg className={`w-3 h-3 ml-1 inline transition-transform ${showCompanyStrengthDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Company Profile Strength Details */}
        {showCompanyStrengthDetails && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-medium text-gray-800 mb-3">🏢 Company Completion Breakdown (150 Points Max)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'mainContact.email', label: 'Contact Email', weight: 30 },
                { key: 'mainContact.name', label: 'Contact Name', weight: 25 },
                { key: 'name', label: 'Company Name', weight: 20 },
                { key: 'legalName', label: 'Legal Entity Name', weight: 20 },
                { key: 'abn', label: 'ABN', weight: 20 },
                { key: 'billingAddress', label: 'Billing Address', weight: 15 },
                { key: 'logoUrl', label: 'Company Logo', weight: 15 },
                { key: 'mainContact.phone', label: 'Contact Phone', weight: 10 }
              ].map(field => {
                let isCompleted = false;
                
                if (field.key.includes('.')) {
                  const keys = field.key.split('.');
                  let value = companyForm;
                  for (const key of keys) {
                    value = value?.[key];
                  }
                  isCompleted = value && value.toString().trim().length > 0;
                } else {
                  switch (field.key) {
                    case 'logoUrl':
                      isCompleted = companyForm.logoUrl && companyForm.logoUrl.length > 0;
                      break;
                    case 'billingAddress':
                      isCompleted = companyForm.billingAddress && (
                        (companyForm.billingAddress.line1 && companyForm.billingAddress.line1.trim().length > 0) ||
                        (companyForm.billingAddress.streetNumber && companyForm.billingAddress.streetNumber.trim().length > 0) ||
                        (companyForm.billingAddress.full_address && companyForm.billingAddress.full_address.trim().length > 0)
                      ) && 
                      companyForm.billingAddress.city && companyForm.billingAddress.city.trim().length > 0 &&
                      companyForm.billingAddress.state && companyForm.billingAddress.state.trim().length > 0 &&
                      companyForm.billingAddress.postalCode && companyForm.billingAddress.postalCode.trim().length > 0;
                      break;
                    default:
                      isCompleted = companyForm[field.key] && companyForm[field.key].toString().trim().length > 0;
                  }
                }
                
                return (
                  <div key={field.key} className="flex items-center justify-between p-2 rounded border border-gray-200 bg-white">
                    <span className="text-sm text-gray-700">{field.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{field.weight} pts</span>
                      <span className={`w-4 h-4 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {isCompleted && <span className="text-white text-xs flex items-center justify-center">✓</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-300">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Total Score:</span>
                <span className="text-primary">{companyStrength.percentage}/150 points</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <CompanyForm
        isEmbedded={true}
        showHeader={false}
        form={companyForm}
        handleChange={handleCompanyChange}
        onAddressChange={handleCompanyAddressChange}
        handleSubmit={handleSubmitCompany}
        isEditing={isEditingCompany}
        setIsEditing={setIsEditingCompany}
        isAdmin={user?.companyAdmin}
        submitButtonText={isNewMode ? "Create Company" : "Save Changes"}
        onCancel={handleCancelEdit}
        onEnterEdit={handleEnterEditMode}
      />
    </div>
  );
};

export default CompanyDetails;
