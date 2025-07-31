// src/pages/CompanyProfile.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { AuthContext } from '@/auth/AuthProvider';

export default function CompanyProfile() {
  const { user, refreshUser } = useContext(AuthContext);
  const axios = useAxiosSecure();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('mode') === 'new';

  // form state
  const [form, setForm] = useState({
    name: '',
    legalName: '',
    registrationNumber: '',
    abn: '',
    acn: '',
    ein: '',
    stateTaxId: '',
    organizationNumber: '',
    vatNumber: '',
    billingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'AU',
    },
    mainContact: { name: '', email: '', phone: '' },
  });

  // load existing company when editing
  useEffect(() => {
    if (!isNew && user.company) {
      axios
        .get(`/api/clients/${user.company}`)
        .then((res) => setForm(res.data))
        .catch((err) => console.error(err));
    }
  }, [isNew, user.company, axios]);

  // handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    // nested billingAddress.*
    if (name.startsWith('billingAddress.')) {
      const key = name.split('.')[1];
      setForm((f) => ({
        ...f,
        billingAddress: { ...f.billingAddress, [key]: value },
      }));
    }
    // nested mainContact.*
    else if (name.startsWith('mainContact.')) {
      const key = name.split('.')[1];
      setForm((f) => ({
        ...f,
        mainContact: { ...f.mainContact, [key]: value },
      }));
    }
    // top-level fields
    else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  // submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isNew) {
        const { data } = await axios.post('/api/clients', form);
        // link user to the new company
        await axios.patch('/api/users/link-company', { companyId: data._id });
      } else {
        await axios.patch(`/api/clients/${user.company}`, form);
      }
      await refreshUser();         // reload user + company in context
      navigate('/');               // go home or dashboard
    } catch (err) {
      console.error(err);
      alert('Failed to save company. See console for details.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">
        {isNew ? 'Create Your Company' : 'Edit Company Profile'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium">Company Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Legal Name */}
        <div>
          <label className="block text-sm font-medium">Legal Name</label>
          <input
            name="legalName"
            value={form.legalName}
            onChange={handleChange}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Registration # */}
        <div>
          <label className="block text-sm font-medium">Registration #</label>
          <input
            name="registrationNumber"
            value={form.registrationNumber}
            onChange={handleChange}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </div>

        {/* ABN / ACN */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">ABN</label>
            <input
              name="abn"
              value={form.abn}
              onChange={handleChange}
              className="mt-1 block w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">ACN</label>
            <input
              name="acn"
              value={form.acn}
              onChange={handleChange}
              className="mt-1 block w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        {/* US / NO tax */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">EIN (US)</label>
            <input
              name="ein"
              value={form.ein}
              onChange={handleChange}
              className="mt-1 block w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">State Tax ID (US)</label>
            <input
              name="stateTaxId"
              value={form.stateTaxId}
              onChange={handleChange}
              className="mt-1 block w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        {/* Billing Address */}
        <fieldset className="border p-4 rounded">
          <legend className="font-medium">Billing Address</legend>
          <div className="space-y-3 mt-2">
            {['line1','line2','city','state','postalCode'].map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium">
                  {key === 'line1' ? 'Address Line 1' : key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
                <input
                  name={`billingAddress.${key}`}
                  value={form.billingAddress[key]}
                  onChange={handleChange}
                  className="mt-1 block w-full border px-3 py-2 rounded"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium">Country</label>
              <select
                name="billingAddress.country"
                value={form.billingAddress.country}
                onChange={handleChange}
                className="mt-1 block w-full border px-3 py-2 rounded"
              >
                <option value="AU">Australia</option>
                <option value="US">United States</option>
                <option value="NO">Norway</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Main Contact */}
        <fieldset className="border p-4 rounded">
          <legend className="font-medium">Primary Contact</legend>
          {['name','email','phone'].map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
              <input
                name={`mainContact.${key}`}
                value={form.mainContact[key]}
                onChange={handleChange}
                className="mt-1 block w-full border px-3 py-2 rounded"
              />
            </div>
          ))}
        </fieldset>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
          >
            {isNew ? 'Create Company' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
