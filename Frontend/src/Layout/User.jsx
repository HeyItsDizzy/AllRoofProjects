// src/Layout/User.jsx
import NavBar from "@/shared/NavBar";
import { Outlet } from "react-router-dom";
import useRouteTitle from "@/hooks/useRouteTitle";
import RoleSwitcher from "../components/RoleSwitcher";
import SystemNotice from "@/shared/components/SystemNotice";
import { useClientAccountStatus } from "@/hooks/useClientAccountStatus";
import { useContext } from "react";
import { AuthContext } from "@/auth/AuthProvider";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from "@/shared/swalConfig";
import "../styles/cls-fix.css";

const User = () => {
  // ← this will pick up your routes' handle.title metadata
  useRouteTitle();
  
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  
  // Check client account status for system notices
  const { isOnHold, clientInfo, loading } = useClientAccountStatus();

  const handleViewInvoice = () => {
    // Navigate to invoices or open invoice modal
    window.location.href = '/invoices';
  };

  const handleContactSupport = () => {
    // Open support modal or navigate to contact page
    window.open('mailto:support@allrooftakeoffs.com.au', '_blank');
  };

  const handlePaidInvoice = async () => {
    // First confirmation - Have you paid?
    const firstConfirm = await Swal.fire({
      title: 'Have you already paid your outstanding invoices?',
      text: 'Only click confirm if payment has already been made. A staff member will check the account before manually activating access.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
    });

    if (!firstConfirm.isConfirmed) {
      return;
    }

    // Second prompt - Enter invoice numbers
    const invoiceInput = await Swal.fire({
      title: 'What invoice number(s) have been paid?',
      html: `
        <p class="text-sm text-gray-600 mb-4">Please enter the invoice number(s) you have paid.</p>
        <p class="text-xs text-gray-500 mb-2">Separate multiple invoices with commas (e.g., INV-001, INV-002)</p>
      `,
      input: 'text',
      inputPlaceholder: 'e.g., INV-001 or INV-001, INV-002',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter at least one invoice number';
        }
      }
    });

    if (!invoiceInput.isConfirmed || !invoiceInput.value) {
      return;
    }

    // Send notification to accounts
    try {
      const response = await axiosSecure.post('/clients/notify-payment', {
        invoiceNumbers: invoiceInput.value,
        clientId: clientInfo?._id,
        userId: user?._id
      });

      if (response.data.success) {
        Swal.fire({
          title: 'Payment Notification Sent!',
          html: `
            <p class="text-gray-600 mb-4">Your payment notification has been sent to our accounts team.</p>
            <p class="text-sm text-gray-500">They will verify the payment and activate your account access shortly.</p>
          `,
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }
    } catch (error) {
      console.error('❌ Error sending payment notification:', error);
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'Failed to send payment notification. Please contact support.',
        icon: 'error'
      });
    }
  };

  return (
    <div className="bg-bgGray min-h-screen">
      <RoleSwitcher />
      
      <div className="border-b-[1px] border-textGray border-opacity-50 stable-padding sticky top-0 z-20 bg-bgGray navbar-container">
        <NavBar />
      </div>
      
      {/* System-wide notices - Below navbar */}
      {/* 
        NOTE: Account hold restrictions apply to our download buttons and upload controls.
        Browser-native PDF viewer download buttons (shown when previewing PDFs) cannot be 
        disabled via JavaScript. Backend should implement additional server-side checks 
        for downloads if strict enforcement is required.
      */}
      {!loading && isOnHold && (
        <SystemNotice
          show={true}
          type="error"
          message="⚠️ Account on Hold - Payment Required"
          details="File downloads and uploads are disabled (read-only access maintained). New estimates will be created on hold and require payment before work begins."
          actionLabel="I Have Paid"
          onActionClick={handlePaidInvoice}
          secondaryActionLabel="Contact Support"
          onSecondaryActionClick={handleContactSupport}
          dismissible={false}
          sticky={true}
        />
      )}
      <div className="stable-padding">
        <Outlet />
      </div>
    </div>
  );
};

export default User;
