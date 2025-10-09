// src/pages/CompanyChoice.jsx
import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import Swal from '@/shared/swalConfig';
import axiosPublic from '@/hooks/AxiosPublic/useAxiosPublic';
import { AuthContext } from '../auth/AuthProvider';
import { showLoadingSpinner } from '@/shared/components/LoadingSpinner';

export default function CompanyChoice() {
  // Temporary state for linking code recovery email
  let linkingRecoveryEmail = '';

  // Helper to send linking code request to backend 
  const sendLinkingCodeRequest = async (email) => {
    const loadingSpinner = showLoadingSpinner('Searching for your company...', {
      subtitle: `Looking up: ${email}`,
      progressText: 'Checking database',
      showProgress: true,
      backgroundColor: 'rgba(0, 0, 0, 0.85)'
    });

    try {
      // Use the specific endpoint for linking code requests
      const response = await axiosPublic.post('/linking/request-linking-code', { email });
      
      // Complete the loading and show success
      loadingSpinner.complete();
      loadingSpinner.setTitle('Company found!');
      loadingSpinner.setSubtitle('Preparing your linking code...');
      
      // Small delay to show completion before destroying
      await new Promise(resolve => setTimeout(resolve, 800));
      loadingSpinner.destroy();
      
      return { success: true, data: response.data };
    } catch (err) {
      // Show error state briefly before destroying
      loadingSpinner.error('Company not found');
      await new Promise(resolve => setTimeout(resolve, 1000));
      loadingSpinner.destroy();
      
      // Check if the error is specifically about email not found
      if (err.response?.status === 404 || 
          err.response?.data?.message?.toLowerCase().includes('not found') || 
          err.response?.data?.message?.toLowerCase().includes('email not found') ||
          err.response?.data?.message?.toLowerCase().includes('no company found')) {
        return { success: false, emailNotFound: true, error: err };
      }
      return { success: false, emailNotFound: false, error: err };
    }
  };

  // Helper for the linking code recovery flow
  const handleLinkingCodeRecovery = async () => {
    // Step 1: Ask for email
    const { value: nextStep } = await Swal.fire({
      icon: 'info',
      title: 'Can’t find your linking code?',
      html: `If you have worked with All Roof Take-offs at any point in the past, great news!<br/><br/>
        Your previous estimates are saved to your company's history and ready for you.<br/><br/>
        Please enter the email you last received your estimate to below. If the email matches a company entry in our system, an email with your linking code will be sent right away.<br/><br/>
        If it is not found, you can request it on the next dialog via <a href=\"mailto:support@allrooftakeoffs.com.au\" class=\"text-blue-600 underline\">support@allrooftakeoffs.com.au</a> (up to 24 hours reply).`,
      input: 'email',
      inputLabel: 'Enter your company email (where you received your last estimate)',
      inputPlaceholder: 'your@email.com',
      inputValue: linkingRecoveryEmail,
      showCancelButton: true,
      confirmButtonText: 'Request Linking Code',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) return 'Please enter your email.';
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Please enter a valid email address.';
      },
      preConfirm: (value) => {
        linkingRecoveryEmail = value;
      }
    });

    if (linkingRecoveryEmail) {
      // Try to send linking code using backend (same as forgot password flow)
      const result = await sendLinkingCodeRequest(linkingRecoveryEmail);
      if (result.success) {
        // Check if linking code was returned directly
        if (result.data?.linkingCode) {
          const accessLevel = result.data?.accessLevel || 'user';
          const accessIcon = accessLevel === 'admin' ? '🔑' : '👤';
          const accessDescription = accessLevel === 'admin' 
            ? 'You have <strong>administrative access</strong> - you can manage your company account and other users.'
            : 'You have <strong>standard user access</strong> - your company already has administrators.';
          
          await Swal.fire({
            icon: 'success',
            title: 'Your Linking Code Found!',
            html: `
              <p>Your linking code for <b>${result.data.companyName}</b> is:</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; font-family: monospace;">
                <h2 style="font-size: 24px; letter-spacing: 3px; margin: 0; color: #1f2937;">${result.data.linkingCode}</h2>
              </div>
              <div style="background-color: ${accessLevel === 'admin' ? '#fef3c7' : '#ecfdf5'}; padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 4px solid ${accessLevel === 'admin' ? '#f59e0b' : '#10b981'};">
                <p style="margin: 0; color: ${accessLevel === 'admin' ? '#92400e' : '#047857'};">${accessIcon} ${accessDescription}</p>
              </div>
              <p><small>Email service was unavailable, but here's your code!</small></p>
            `,
            confirmButtonText: 'OK',
          });
        } else {
          // Email was sent successfully
          const accessLevel = result.data?.accessLevel || 'user';
          const accessText = accessLevel === 'admin' ? ' with administrative access' : ' with standard user access';
          
          await Swal.fire({
            icon: 'success',
            title: 'Success!',
            html: `An email has been sent to <b>${linkingRecoveryEmail}</b> with your linking code${accessText}.`,
            confirmButtonText: 'OK',
          });
        }
      } else {
        // Email not found or other error, offer to request via support
        const { isConfirmed } = await Swal.fire({
          icon: 'warning',
          title: 'No match found',
          html: `We couldn't find a company with that email.<br/><br/>Would you like to request your linking code via <a href=\"mailto:support@allrooftakeoffs.com.au\" class=\"text-blue-600 underline\">support@allrooftakeoffs.com.au</a>?`,
          showCancelButton: true,
          confirmButtonText: 'Yes',
          cancelButtonText: 'No',
        });
        if (isConfirmed) {
          // Show form for company name and email
          const { value: supportDetails } = await Swal.fire({
            title: 'Request Linking Code',
            html: `<input id=\"swal-company-name\" class=\"swal2-input\" placeholder=\"Company Name\" />
                   <input id=\"swal-company-email\" class=\"swal2-input\" placeholder=\"Company Email\" type=\"email\" value=\"${linkingRecoveryEmail}\" />`,
            focusConfirm: false,
            preConfirm: () => {
              const name = document.getElementById('swal-company-name').value;
              const email = document.getElementById('swal-company-email').value;
              if (!name || !email) {
                Swal.showValidationMessage('Please enter both company name and email.');
                return false;
              }
              if (!/^\S+@\S+\.\S+$/.test(email)) {
                Swal.showValidationMessage('Please enter a valid email address.');
                return false;
              }
              linkingRecoveryEmail = email;
              return { name, email };
            },
            showCancelButton: true,
            confirmButtonText: 'Send',
            cancelButtonText: 'Cancel',
          });
          if (supportDetails) {
            // Send the support request to backend
            const supportSpinner = showLoadingSpinner('Sending support request...', {
              subtitle: `Contacting: ${supportDetails.name}`,
              progressText: 'Sending email',
              showProgress: true,
              backgroundColor: 'rgba(0, 0, 0, 0.85)'
            });

            try {
              await axiosPublic.post('/linking/send-support-request', {
                companyName: supportDetails.name,
                companyEmail: supportDetails.email,
                userEmail: linkingRecoveryEmail // Include the original email they tried
              });
              
              // Complete the loading
              supportSpinner.complete();
              supportSpinner.setTitle('Request sent successfully!');
              supportSpinner.setSubtitle('Support team notified');
              
              // Small delay before destroying
              await new Promise(resolve => setTimeout(resolve, 800));
              supportSpinner.destroy();
              
              await Swal.fire({
                icon: 'success',
                title: 'Request Sent!',
                html: `Thank you! Your request has been sent to <a href=\"mailto:support@allrooftakeoffs.com.au\">support@allrooftakeoffs.com.au</a>.<br/>We'll get back to you within 24 hours.`,
                confirmButtonText: 'OK',
              });
            } catch (error) {
              // Show error state
              supportSpinner.error('Failed to send request');
              await new Promise(resolve => setTimeout(resolve, 1000));
              supportSpinner.destroy();
              
              console.error('Failed to send support request:', error);
              await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to send support request. Please email support@allrooftakeoffs.com.au directly.',
                confirmButtonText: 'OK',
              });
            }
          }
        }
      }
    }
  };
  // Handler for the visually disabled 'Create New Company' card
  const handleCreateNewCompanyClick = async () => {
    const { value: workedBefore } = await Swal.fire({
      title: 'Have you worked with All Roof Take-offs before?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      reverseButtons: true,
    });

    if (workedBefore) {
      // Friendlier info dialog
      const { value: nextStep } = await Swal.fire({
        icon: 'info',
        title: 'Connect to Your Company',
        html: `If you have worked with All Roof Take-offs at any point in the past, great news!<br/><br/>
        Your previous estimates are saved to your company's history and ready for you.<br/><br/>
        Please click <b>"Connect to Existing Company"</b> and use your 10-digit linking code, which will be found in a recent email of yours.<br/><br/>
        <b>Can't find your code?</b><br/>
        Please request one by entering the email you last received your estimate to below. If the email matches a company entry in our system, an email with your linking code will be sent right away.<br/><br/>
        If it is not found, you can request it on the next dialog via <a href="mailto:support@allrooftakeoffs.com.au" class="text-blue-600 underline">support@allrooftakeoffs.com.au</a> (up to 24 hours reply).`,
        input: 'email',
        inputLabel: 'Enter your company email (where you received your last estimate)',
        inputPlaceholder: 'your@email.com',
        showCancelButton: true,
        confirmButtonText: 'Request Linking Code',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
          if (!value) return 'Please enter your email.';
          // Simple email regex
          if (!/^\S+@\S+\.\S+$/.test(value)) return 'Please enter a valid email address.';
        },
      });

      if (nextStep) {
        // Set the email for persistence and use the same flow as "Connect to Existing"
        linkingRecoveryEmail = nextStep;
        
        // Use the same backend API call as the "Connect to Existing" flow
        const result = await sendLinkingCodeRequest(linkingRecoveryEmail);
        if (result.success) {
          // Check if linking code was returned directly
          if (result.data?.linkingCode) {
            await Swal.fire({
              icon: 'success',
              title: 'Your Linking Code Found!',
              html: `
                <p>Your linking code for <b>${result.data.companyName}</b> is:</p>
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; font-family: monospace;">
                  <h2 style="font-size: 24px; letter-spacing: 3px; margin: 0; color: #1f2937;">${result.data.linkingCode}</h2>
                </div>
                <p><small>Email service was unavailable, but here's your code!</small></p>
              `,
              confirmButtonText: 'OK',
            });
          } else {
            // Email was sent successfully
            await Swal.fire({
              icon: 'success',
              title: 'Success!',
              html: `An email has been sent to <b>${linkingRecoveryEmail}</b> with your linking code.`,
              confirmButtonText: 'OK',
            });
          }
        } else {
          // Email not found or other error, offer to request via support
          const { isConfirmed } = await Swal.fire({
            icon: 'warning',
            title: 'No match found',
            html: `We couldn't find a company with that email.<br/><br/>Would you like to request your linking code via <a href=\"mailto:support@allrooftakeoffs.com.au\" class=\"text-blue-600 underline\">support@allrooftakeoffs.com.au</a>?`,
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
          });
          if (isConfirmed) {
            // Show form for company name and email (with persisted email)
            const { value: supportDetails } = await Swal.fire({
              title: 'Request Linking Code',
              html: `<input id=\"swal-company-name\" class=\"swal2-input\" placeholder=\"Company Name\" />
                     <input id=\"swal-company-email\" class=\"swal2-input\" placeholder=\"Company Email\" type=\"email\" value=\"${linkingRecoveryEmail}\" />`,
              focusConfirm: false,
              preConfirm: () => {
                const name = document.getElementById('swal-company-name').value;
                const email = document.getElementById('swal-company-email').value;
                if (!name || !email) {
                  Swal.showValidationMessage('Please enter both company name and email.');
                  return false;
                }
                if (!/^\S+@\S+\.\S+$/.test(email)) {
                  Swal.showValidationMessage('Please enter a valid email address.');
                  return false;
                }
                linkingRecoveryEmail = email; // Update persistence
                return { name, email };
              },
              showCancelButton: true,
              confirmButtonText: 'Send',
              cancelButtonText: 'Cancel',
            });
            if (supportDetails) {
              // Send the support request to backend
              try {
                await axiosPublic.post('/linking/send-support-request', {
                  companyName: supportDetails.name,
                  companyEmail: supportDetails.email,
                  userEmail: linkingRecoveryEmail // Include the original email they tried
                });
                
                await Swal.fire({
                  icon: 'success',
                  title: 'Request Sent!',
                  html: `Thank you! Your request has been sent to <a href=\"mailto:support@allrooftakeoffs.com.au\">support@allrooftakeoffs.com.au</a>.<br/>We'll get back to you within 24 hours.`,
                  confirmButtonText: 'OK',
                });
              } catch (error) {
                console.error('Failed to send support request:', error);
                await Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'Failed to send support request. Please email support@allrooftakeoffs.com.au directly.',
                  confirmButtonText: 'OK',
                });
              }
            }
          }
        }
      }
      return;
    }

    // If No, ask if they want to set up a business
    const { value: setupBusiness } = await Swal.fire({
      title: 'Shall we set up your business to start working with All Roof Take-offs?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      reverseButtons: true,
    });

    if (setupBusiness) {
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Redirecting to Create a New Company...',
        showConfirmButton: false,
        timer: 2000,
      });
      navigate('/company-profile?mode=new');
    } else {
      await Swal.fire({
        icon: 'info',
        title: 'No problem!',
        html: `If you have any questions or queries, please send an email to <a href="mailto:requests@allrooftakeoffs.com.au" class="text-blue-600 underline">requests@allrooftakeoffs.com.au</a> and the team can help you with anything you need.`,
        confirmButtonText: 'OK',
      });
    }
  };
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure(); // <- call the hook properly

  // Redirect users who already have a linkedClient
  useEffect(() => {
    if (user && user.linkedClients && user.linkedClients.length > 0) {
      console.log("User already has linkedClients, checking for preserved URL");
      
      // Check if there's a stored redirect URL from a direct link access attempt
      const redirectUrl = localStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        localStorage.removeItem('redirectAfterLogin');
        console.log("Redirecting to preserved URL:", redirectUrl);
        navigate(redirectUrl);
      } else {
        console.log("No preserved URL, redirecting to projects");
        navigate('/projects');
      }
    }
  }, [user, navigate]);



const handleConnectToCompany = async () => {
  let code = null;
  await Swal.fire({
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
    footer: `<a href="#cant-find-linking-code" id="cant-find-linking-code-link" style="color:#2563eb; text-decoration:underline; cursor:pointer;">Can't find your linking code?</a>`,
    didOpen: () => {
      const link = document.getElementById('cant-find-linking-code-link');
      if (link) {
        link.onclick = async (e) => {
          e.preventDefault();
          Swal.close();
          setTimeout(() => handleLinkingCodeRecovery(), 300);
        };
      }
    },
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
        code = trimmed;
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
      text: `Your code “${code}” has linked you to your company.`,
      confirmButtonText: 'Go to Dashboard'
    });

    navigate('/projects');
  }
};


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-8">Welcome! Let’s get started</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Create New Company (visually disabled, but clickable for info) */}
        <div
          className="border rounded-lg bg-gray-200 p-6 flex flex-col items-center opacity-60 select-none cursor-not-allowed"
          aria-disabled="true"
          onClick={handleCreateNewCompanyClick}
          style={{ pointerEvents: 'auto' }}
        >
          <img
            src="/images/CompanyCreateNew.svg"
            alt="Create New Company"
            className="w-48 h-48 mb-4 grayscale"
          />
          <h2 className="text-lg font-medium">Create New Company</h2>
          <p className="mt-2 text-sm text-gray-600 text-center">
            Set up your company’s profile and become the account owner.
          </p>
        </div>

        {/* Connect to Existing Company */}
        <div
          onClick={handleConnectToCompany}
          className="cursor-pointer border rounded-lg bg-white p-6 flex flex-col items-center hover:shadow-lg transition"
        >
          <img
            src="/images/CompanyLinkExisting.svg"
            alt="Connect to Existing Company"
            className="w-48 h-48 mb-4"
          />
          <h2 className="text-lg font-medium">Connect to Existing Company</h2>
          <p className="mt-2 text-sm text-gray-600 text-center">
            Link your user account to your company’s existing profile.
          </p>
        </div>
      </div>
    </div>
  );
}
