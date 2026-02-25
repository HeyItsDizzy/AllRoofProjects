import React, { useState } from "react";
import Modal from "./AddressInputModal";

const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;

const AddressInput = ({ location, setLocation, disabled }) => {
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualAddress, setManualAddress] = useState({
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    zip: "",
    region: "AU",        // Default country code
    country: "Australia", // Default full country name
    full_address: "",
    streetNumber: "",
  });
  const [suggestions, setSuggestions] = useState([]);

  // Function to handle address input (Autocomplete)
  const handleAddressChange = async (e) => {
    const query = e.target.value;
  
    if (typeof setLocation === "function") {
      setLocation({ ...location, full_address: query });
    } else {
      console.error("setLocation is not defined or is not a function.");
    }
  
    if (query.length > 2) {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_API_KEY}&autocomplete=true&country=AU`
        );
        const data = await response.json();
        setSuggestions(data.features || []);
      } catch (error) {
        console.error("Error fetching address suggestions:", error);
      }
    } else {
      setSuggestions([]);
    }
  };
  

  // Function to handle selecting a suggestion
  const handleSelectSuggestion = (suggestion) => {
    // Parse the address to extract street number and street name
    const addressText = suggestion.text || '';
    const fullAddress = suggestion.place_name || '';
    const addressNumber = suggestion.properties?.address || '';
    
    // Try to extract street number from the address
    let streetNumber = '';
    let streetName = addressText;
    
    // If Mapbox provides the address number, use it
    if (addressNumber) {
      streetNumber = addressNumber;
    } else {
      // Try to parse street number from the full place_name first (more reliable)
      const fullAddressMatch = fullAddress.match(/^(\d+[A-Za-z]?)\s+(.+?)(?:,|$)/);
      if (fullAddressMatch) {
        streetNumber = fullAddressMatch[1];
        streetName = fullAddressMatch[2];
      } else {
        // Fallback: try to parse from the text field
        const textMatch = addressText.match(/^(\d+[A-Za-z]?)\s+(.+)$/);
        if (textMatch) {
          streetNumber = textMatch[1];
          streetName = textMatch[2];
        }
      }
    }

    // Get country info from Mapbox
    const mapboxCountry = suggestion.context?.find((c) => c.id.includes("country"))?.text || "Australia";
    
    // Map country names to codes (region field)
    const countryToCodeMapping = {
      'Australia': 'AU',
      'United States': 'US',
      'United States of America': 'US', 
      'USA': 'US',
      'Norway': 'NO',
      'Norge': 'NO'
    };
    
    const region = countryToCodeMapping[mapboxCountry] || 'AU';
    const country = mapboxCountry;

    const newLocationData = {
      full_address: suggestion.place_name,
      address_line_1: streetName,
      streetNumber: streetNumber,
      city: suggestion.context?.find((c) => c.id.includes("place"))?.text || "",
      state: suggestion.context?.find((c) => c.id.includes("region"))?.text || "",
      zip: suggestion.context?.find((c) => c.id.includes("postcode"))?.text || "",
      region: region,     // Country code (AU, US, NO)
      country: country,   // Full country name (Australia, United States, Norway)
    };
    
    setLocation(newLocationData);
    setSuggestions([]);
  };

  // Function to initialize manual entry with existing address data
  const initializeManualEntry = () => {
    setManualAddress({
      address_line_1: location?.address_line_1 || "",
      address_line_2: location?.address_line_2 || "",
      city: location?.city || "",
      state: location?.state || "",
      zip: location?.zip || "",
      region: location?.region || "AU",         // Default to AU if no region
      country: location?.country || "Australia", // Default to Australia if no country
      full_address: location?.full_address || "",
      streetNumber: location?.streetNumber || "",
    });
    setIsManualEntry(true);
  };

  // Function to handle manual entry submission
  const handleManualSubmit = () => {
    // Construct the full address from manual input
    const addressParts = [
      manualAddress.streetNumber,
      manualAddress.address_line_1,
      manualAddress.address_line_2,
      manualAddress.city,
      manualAddress.state,
      manualAddress.zip,
      manualAddress.country
    ].filter(part => part && part.trim() !== '');
    
    const fullAddress = addressParts.join(', ');
    
    // Create the complete address object with full_address field
    const completeAddress = {
      ...manualAddress,
      full_address: fullAddress
    };
    
    setLocation(completeAddress);
    setIsManualEntry(false);
  };

  return (
    <div>
      {!isManualEntry ? (
        <div className="relative">
          <input
            type="text"
            className="w-full border rounded-md p-2"
            placeholder="Search for address..."
            value={location?.full_address || ""}
            onChange={handleAddressChange}
            disabled={disabled}
          />
          {suggestions.length > 0 && (
            <ul className="absolute bg-white border rounded-md mt-1 w-full z-10">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="p-2 hover:bg-gray-200 cursor-pointer"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  {suggestion.place_name}
                </li>
              ))}
            </ul>
          )}
          {!disabled && (
            <span
              className="text-blue-500 underline mt-1 cursor-pointer inline-block"
              onClick={initializeManualEntry}
            >
              Can't find address?
            </span>
          )}
        </div>
      ) : (
        <Modal title="Enter Address Manually" onClose={() => setIsManualEntry(false)}>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Street/Unit Number (e.g., 248, Unit 5)"
              value={manualAddress.streetNumber}
              onChange={(e) => setManualAddress({ ...manualAddress, streetNumber: e.target.value })}
              className="border rounded-md p-2"
            />
            <input
              type="text"
              placeholder="Street Name (e.g., Postle Street)"
              value={manualAddress.address_line_1}
              onChange={(e) => setManualAddress({ ...manualAddress, address_line_1: e.target.value })}
              className="border rounded-md p-2"
            />
            <input
              type="text"
              placeholder="Address Line 2 (Optional)"
              value={manualAddress.address_line_2}
              onChange={(e) => setManualAddress({ ...manualAddress, address_line_2: e.target.value })}
              className="border rounded-md p-2"
            />
            <input
              type="text"
              placeholder="City"
              value={manualAddress.city}
              onChange={(e) => setManualAddress({ ...manualAddress, city: e.target.value })}
              className="border rounded-md p-2"
            />
            <input
              type="text"
              placeholder="State"
              value={manualAddress.state}
              onChange={(e) => setManualAddress({ ...manualAddress, state: e.target.value })}
              className="border rounded-md p-2"
            />
            <input
              type="text"
              placeholder="Zip Code"
              value={manualAddress.zip}
              onChange={(e) => setManualAddress({ ...manualAddress, zip: e.target.value })}
              className="border rounded-md p-2"
            />
            <select
              value={manualAddress.region}
              onChange={(e) => {
                const regionCode = e.target.value;
                const regionToCountryMapping = {
                  'AU': 'Australia',
                  'US': 'United States',
                  'NO': 'Norway'
                };
                const countryName = regionToCountryMapping[regionCode] || 'Australia';
                setManualAddress({ 
                  ...manualAddress, 
                  region: regionCode,
                  country: countryName
                });
              }}
              className="border rounded-md p-2"
            >
              <option value="">Select Region</option>
              <option value="AU">AU - Australia</option>
              <option value="US">US - United States</option>
              <option value="NO">NO - Norway</option>
            </select>
            <button className="bg-green-500 text-white px-4 py-2 rounded-md mt-2" onClick={handleManualSubmit}>
              Save Address
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AddressInput;
