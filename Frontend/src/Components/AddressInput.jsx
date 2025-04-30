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
    country: "",
    full_address: "",
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
    setLocation({
      full_address: suggestion.place_name,
      address_line_1: suggestion.text,
      city: suggestion.context?.find((c) => c.id.includes("place"))?.text || "",
      state: suggestion.context?.find((c) => c.id.includes("region"))?.text || "",
      zip: suggestion.context?.find((c) => c.id.includes("postcode"))?.text || "",
      country: suggestion.context?.find((c) => c.id.includes("country"))?.text || "Australia",
    });
    setSuggestions([]);
  };

  // Function to handle manual entry submission
  const handleManualSubmit = () => {
    setLocation(manualAddress);
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
    onClick={() => setIsManualEntry(true)}
  >
    Can’t find address?
  </span>
)}

        </div>
      ) : (
        <Modal title="Enter Address Manually" onClose={() => setIsManualEntry(false)}>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Address Line 1"
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
            <input
              type="text"
              placeholder="Country"
              value={manualAddress.country}
              onChange={(e) => setManualAddress({ ...manualAddress, country: e.target.value })}
              className="border rounded-md p-2"
            />
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
