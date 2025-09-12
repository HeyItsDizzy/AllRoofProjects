// src/components/CompanyAutocomplete.jsx
import { useState, useEffect } from 'react';

// API Configuration
const ABR_BASE = 'https://abr.business.gov.au/json';
const ABR_GUID = import.meta.env.VITE_ABR_GUID; // Australian ABR GUID
const SAM_API_KEY = import.meta.env.VITE_SAM_API_KEY; // US SAM.gov API Key

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

export default function CompanyAutocomplete({ onSave, country = 'AU' }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debug: Log the GUID to verify it's loaded
  console.log('ABR GUID loaded:', ABR_GUID);

  // Get country-specific search function
  const getSearchFunction = () => {
    switch (country) {
      case 'AU':
        return searchAustralianCompanies;
      case 'US':
        return searchUSCompanies;
      case 'NO':
        return searchNorwayCompanies;
      default:
        return searchAustralianCompanies;
    }
  };

  // Australian company search
  const searchAustralianCompanies = async (name) => {
    if (!ABR_GUID) {
      console.error('ABR GUID not configured');
      return [];
    }

    let url;
    // detect ABN (11 digits) or ACN (9 digits)
    if (/^\d{11}$/.test(name)) {
      url = `${ABR_BASE}/AbnDetails.aspx?abn=${name}&guid=${ABR_GUID}`;
    } else if (/^\d{9}$/.test(name)) {
      url = `${ABR_BASE}/AcnDetails.aspx?acn=${name}&guid=${ABR_GUID}`;
    } else {
      url = `${ABR_BASE}/MatchingNames.aspx?name=${encodeURIComponent(name)}&maxResults=10&guid=${ABR_GUID}`;
    }
    
    console.log('ABR API URL:', url);
    
    try {
      // Use a JSONP approach or try to get raw JSON
      const response = await fetch(url + '&output=JSON');
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('ABR Raw response:', text);
      
      // Try to parse as JSON first
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        // If it's JSONP, extract the JSON part
        const match = text.match(/callback\((.*)\)/);
        if (match) {
          json = JSON.parse(match[1]);
        } else {
          throw new Error('Unable to parse ABR response');
        }
      }
      
      console.log('Parsed ABR data:', json);
      
      // Extract the data based on response type
      if (json.Names) {
        return json.Names;
      } else if (json.AbnDetails) {
        return [json.AbnDetails];
      } else if (json.AcnDetails) {
        return [json.AcnDetails];
      } else {
        return [];
      }
    } catch (error) {
      console.error('ABR API Error:', error);
      return [];
    }
  };

  // US company search
  const searchUSCompanies = async (name) => {
    const url = `https://api.sam.gov/entity-information/v2/entities?search=${encodeURIComponent(name)}&api_key=${SAM_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.entities || [];
  };

  // Norway company search
  const searchNorwayCompanies = async (name) => {
    const url = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(name)}&size=10`;
    const res = await fetch(url);
    const data = await res.json();
    return data._embedded?.enheter || [];
  };

  // 1) Fetch matches as user types
  useEffect(() => {
    if (query.length < 2) {
      setOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const searchFunction = getSearchFunction();
        const results = await searchFunction(query);
        setOptions(results);
      } catch (err) {
        console.error(`Error searching ${country} companies:`, err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, country]);

  // Country-specific detail fetchers
  const fetchAustralianDetails = async (item) => {
    if (item.AbnDetails || item.AcnDetails) {
      return item.AbnDetails || item.AcnDetails;
    } else if (item.Abn) {
      try {
        const url = `${ABR_BASE}/AbnDetails.aspx?abn=${item.Abn}&guid=${ABR_GUID}&output=JSON`;
        console.log('Fetching ABN details:', url);
        
        const response = await fetch(url);
        const text = await response.text();
        console.log('ABN details raw response:', text);
        
        // Parse JSONP response
        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          const match = text.match(/callback\((.*)\)/);
          if (match) {
            json = JSON.parse(match[1]);
          } else {
            throw new Error('Unable to parse ABN details response');
          }
        }
        
        console.log('Parsed ABN details:', json);
        return json;
      } catch (error) {
        console.error('Error fetching ABN details:', error);
        return item;
      }
    } else if (item.Acn) {
      try {
        const url = `${ABR_BASE}/AcnDetails.aspx?acn=${item.Acn}&guid=${ABR_GUID}&output=JSON`;
        console.log('Fetching ACN details:', url);
        
        const response = await fetch(url);
        const text = await response.text();
        console.log('ACN details raw response:', text);
        
        // Parse JSONP response
        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          const match = text.match(/callback\((.*)\)/);
          if (match) {
            json = JSON.parse(match[1]);
          } else {
            throw new Error('Unable to parse ACN details response');
          }
        }
        
        console.log('Parsed ACN details:', json);
        return json;
      } catch (error) {
        console.error('Error fetching ACN details:', error);
        return item;
      }
    }
    return item;
  };

  const fetchUSDetails = async (item) => {
    if (item.uei) {
      const res = await fetch(`https://api.sam.gov/entity-information/v2/entities/${item.uei}?api_key=${SAM_API_KEY}`);
      const detail = await res.json();
      return detail;
    }
    return item;
  };

  const fetchNorwayDetails = async (item) => {
    if (item.organisasjonsnummer) {
      const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${item.organisasjonsnummer}`);
      const detail = await res.json();
      return detail;
    }
    return item;
  };

  // 2) When user selects one result, fetch full details if needed
  const pick = async (item) => {
    try {
      let details;
      switch (country) {
        case 'AU':
          details = await fetchAustralianDetails(item);
          break;
        case 'US':
          details = await fetchUSDetails(item);
          break;
        case 'NO':
          details = await fetchNorwayDetails(item);
          break;
        default:
          details = item;
      }
      
      setSelected(details);
      setOptions([]);
      
      // Set query based on country-specific name field
      const displayName = getDisplayName(item);
      setQuery(displayName);
    } catch (err) {
      console.error(`Error fetching ${country} company details:`, err);
      setSelected(item);
    }
  };

  // Get display name based on country
  const getDisplayName = (item) => {
    switch (country) {
      case 'AU':
        return item.MainName || item.Name || '';
      case 'US':
        return item.legalBusinessName || item.entityName || '';
      case 'NO':
        return item.navn || '';
      default:
        return item.MainName || item.Name || '';
    }
  };

  // Get search placeholder based on country
  const getSearchPlaceholder = () => {
    switch (country) {
      case 'AU':
        return 'Search by ABN, ACN, or Company Name';
      case 'US':
        return 'Search by EIN or Company Name';
      case 'NO':
        return 'Search by Org.nr or Company Name';
      default:
        return 'Search companies';
    }
  };

  // Get option display for dropdown
  const getOptionDisplay = (item) => {
    switch (country) {
      case 'AU':
        return (
          <>
            {item.MainName || item.Name}
            {item.Abn && ` (ABN: ${item.Abn})`}
            {item.Acn && ` (ACN: ${item.Acn})`}
          </>
        );
      case 'US':
        return (
          <>
            {item.legalBusinessName || item.entityName}
            {item.uei && ` (UEI: ${item.uei})`}
          </>
        );
      case 'NO':
        return (
          <>
            {item.navn}
            {item.organisasjonsnummer && ` (Org.nr: ${item.organisasjonsnummer})`}
          </>
        );
      default:
        return item.MainName || item.Name || 'Unknown';
    }
  };

  // Get unique key for list items
  const getItemKey = (item) => {
    switch (country) {
      case 'AU':
        return item.Abn || item.Acn || item.Name;
      case 'US':
        return item.uei || item.entityName;
      case 'NO':
        return item.organisasjonsnummer || item.navn;
      default:
        return item.Abn || item.Acn || item.Name;
    }
  };

  // 3) Render
  return (
    <div className="max-w-md mx-auto space-y-4">
      <label className="block font-medium">
        {country === 'AU' && 'ABN / ACN / Legal Name'}
        {country === 'US' && 'EIN / Legal Name'}
        {country === 'NO' && 'Org.nr / Legal Name'}
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null); }}
          placeholder={getSearchPlaceholder()}
          className="mt-1 block w-full border rounded p-2"
        />
      </label>

      {loading && <div className="text-sm text-gray-500">Searching {country} companies…</div>}

      {options.length > 0 && (
        <ul className="border rounded max-h-48 overflow-auto">
          {options.map((item, index) => (
            <li
              key={`${getItemKey(item)}-${index}`}
              onClick={() => pick(item)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {getOptionDisplay(item)}
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="grid grid-cols-2 gap-4">
          {/* Country-specific fields */}
          {country === 'AU' && (
            <>
              {/* ABN Status with colored indicator */}
              <div className="col-span-2 flex items-center gap-2">
                <label className="block text-sm font-medium">ABN Status:</label>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    selected.AbnStatus === 'Active' || selected.AbnStatus === '0000000001' 
                      ? 'bg-green-500' 
                      : 'bg-amber-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    selected.AbnStatus === 'Active' || selected.AbnStatus === '0000000001'
                      ? 'text-green-700'
                      : 'text-amber-700'
                  }`}>
                    {selected.AbnStatus === '0000000001' ? 'Active' : selected.AbnStatus}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm">ABN</label>
                <input
                  readOnly
                  value={selected.Abn || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm">ACN</label>
                <input
                  readOnly
                  value={selected.Acn || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>

              {/* Entity Name (Legal Name) */}
              <div className="col-span-2">
                <label className="block text-sm">Entity Name (Legal Name)</label>
                <input
                  readOnly
                  value={selected.EntityName || selected.MainName || selected.LegalName || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>

              {/* Business Names or Normalized Entity Name */}
              <div className="col-span-2">
                {selected.BusinessName && selected.BusinessName.length > 0 ? (
                  // Show business names if available
                  <>
                    <label className="block text-sm">Business Name(s)</label>
                    {selected.BusinessName.length === 1 ? (
                      <input
                        readOnly
                        value={selected.BusinessName[0]}
                        className="mt-1 block w-full border rounded p-2 bg-gray-50"
                      />
                    ) : (
                      <select className="mt-1 block w-full border rounded p-2 bg-gray-50">
                        {selected.BusinessName.map((name, index) => (
                          <option key={index} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    )}
                    {selected.BusinessName.length > 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        This business has {selected.BusinessName.length} registered names
                      </p>
                    )}
                  </>
                ) : (
                  // Show normalized entity name when no business names
                  <>
                    <label className="block text-sm">Company/Trading Name</label>
                    <input
                      readOnly
                      value={normalizeCompanyName(selected.EntityName)}
                      className="mt-1 block w-full border rounded p-2 bg-blue-50"
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      ℹ️ Normalized from legal entity name (legal titles removed)
                    </p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm">State</label>
                <input
                  readOnly
                  value={selected.AddressState || selected.State || selected.StateCode || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm">Postcode</label>
                <input
                  readOnly
                  value={selected.AddressPostcode || selected.Postcode || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
            </>
          )}

          {country === 'US' && (
            <>
              <div>
                <label className="block text-sm">EIN</label>
                <input
                  readOnly
                  value={selected.taxIdentificationNumber || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm">UEI</label>
                <input
                  readOnly
                  value={selected.uei || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm">Legal Name</label>
                <input
                  readOnly
                  value={selected.legalBusinessName || selected.entityName || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm">State</label>
                <input
                  readOnly
                  value={selected.physicalAddress?.stateOrProvinceCode || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm">ZIP Code</label>
                <input
                  readOnly
                  value={selected.physicalAddress?.zipCode || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
            </>
          )}

          {country === 'NO' && (
            <>
              <div>
                <label className="block text-sm">Org.nr</label>
                <input
                  readOnly
                  value={selected.organisasjonsnummer || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm">VAT Number</label>
                <input
                  readOnly
                  value={selected.organisasjonsnummer ? `NO${selected.organisasjonsnummer}MVA` : ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm">Legal Name</label>
                <input
                  readOnly
                  value={selected.navn || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm">Municipality</label>
                <input
                  readOnly
                  value={selected.forretningsadresse?.kommune || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm">Postal Code</label>
                <input
                  readOnly
                  value={selected.forretningsadresse?.postnummer || ''}
                  className="mt-1 block w-full border rounded p-2 bg-gray-50"
                />
              </div>
            </>
          )}
        </div>
      )}

      {selected && (
        <button
          onClick={() => {
            // Send all ABR data to form for population
            const fullCompanyData = {
              ...selected,
              abrSource: 'detailed', // Mark as detailed ABR data
              capturedAt: new Date().toISOString(),
              // Include all original ABR fields for backend storage
              abrRawData: selected
            };
            onSave(fullCompanyData);
            
            // Reset the autocomplete container after form population
            setSelected(null);
            setOptions([]);
            setQuery('');
            setLoading(false);
          }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Fill Out Form
        </button>
      )}
    </div>
  );
}
