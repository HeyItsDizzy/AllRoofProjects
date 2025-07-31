import React from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from '@/shared/swalConfig';

export default function CompanyChoice() {
  const navigate = useNavigate();

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
          onClick={() => navigate('/company-profile')}
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
