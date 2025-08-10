// src/pages/CompanyChoice.jsx
import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAxiosSecure from '../hooks/AxiosSecure/useAxiosSecure';
import Swal from '@/shared/swalConfig';
import { AuthContext } from '../auth/AuthProvider';

export default function CompanyChoice() {
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure(); // <- call the hook properly

  // Redirect users who already have a linkedClient
  useEffect(() => {
    if (user && user.linkedClients && user.linkedClients.length > 0) {
      console.log("User already has linkedClients, redirecting to MyProjects");
      navigate('/MyProjects');
    }
  }, [user, navigate]);



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
      text: `Your code “${code}” has linked you to your company.`,
      confirmButtonText: 'Go to Dashboard'
    });

    navigate('/MyProjects');
  }
};


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-8">Welcome! Let’s get started</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Create New Company */}
        <div
          onClick={() => navigate('/company-profile?mode=new')}
          className="cursor-pointer border rounded-lg bg-white p-6 flex flex-col items-center hover:shadow-lg transition"
        >
          <img
            src="/images/CompanyCreateNew.svg"
            alt="Create New Company"
            className="w-48 h-48 mb-4"
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
