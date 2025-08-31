// src/pages/AllClientsTable.jsx
import React, { useEffect, useState } from "react";
import { IconSearch, IconSync, IconEdit, IconSave } from "@/shared/IconSet.jsx";
import { MdClose as IconClose } from "react-icons/md";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import { Button, message, Input } from "antd";
import AssignUser from "../components/AssignUser";
import AddressInput from "../components/AddressInput";
import { Link } from "react-router-dom";

export default function AllClientsTable() {
// helper to copy to clipboard with feedback
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => message.success("Linking code copied!"))
      .catch(() => message.error("Copy failed"));
  };

  const [activeButton, setActiveButton]     = useState("All Clients");
  const [search, setSearch]                 = useState("");
  const [clients, setClients]               = useState([]);
  const [users, setUsers]                   = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  // store codes by clientId
  const [userCodes, setUserCodes]   = useState({});
  const [adminCodes, setAdminCodes] = useState({});

  // Editing states
  const [editingClient, setEditingClient] = useState(null);
  const [editValues, setEditValues] = useState({});

  const axiosSecure = useAxiosSecure();

  // Fetch clients (debounced)
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axiosSecure.get("/clients", {
          params: { search, recent: activeButton === "New Clients" },
        });
       const clientList = res.data || [];
       
       // Filter clients based on search term (search in name, address, phone, email)
       const filteredClients = search 
         ? clientList.filter(client => {
             const searchLower = search.toLowerCase();
             // Use billingAddress for address search
             const addressText = client.billingAddress?.full_address || 
                               client.address?.full_address || 
                               (typeof client.address === "string" ? client.address : "");
             // Use mainContact for phone and email
             const phoneText = client.mainContact?.phone || client.phone || "";
             const emailText = client.mainContact?.email || client.email || "";
             
             return (
               (client.name || "").toLowerCase().includes(searchLower) ||
               (client.username || "").toLowerCase().includes(searchLower) ||
               addressText.toLowerCase().includes(searchLower) ||
               phoneText.toLowerCase().includes(searchLower) ||
               emailText.toLowerCase().includes(searchLower)
             );
           })
         : clientList;
       
       setClients(filteredClients);

       // ── Hydrate existing linking codes from the DB ──────────────────
       const initialUserCodes  = {};
       const initialAdminCodes = {};
       clientList.forEach(c => {
         if (c.userLinkingCode)  initialUserCodes[c._id]  = c.userLinkingCode;
         if (c.adminLinkingCode) initialAdminCodes[c._id] = c.adminLinkingCode;
       });
       setUserCodes(initialUserCodes);
       setAdminCodes(initialAdminCodes);
       // ────────────────────────────────────────────────────────────────
      } catch {
        setClients([]);
      }
    };
    const t = setTimeout(fetchClients, 500);
    return () => clearTimeout(t);
  }, [axiosSecure, search, activeButton]);

  // Fetch all users once (for AssignUser modal)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axiosSecure.get("/users/get-users");
        const userList = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.data)
            ? res.data.data
            : [];
        setUsers(userList);
      } catch {
        setUsers([]);
      }
    };
    fetchUsers();
  }, [axiosSecure]);


  // Update linked users in table row
  const updateClientUsers = (clientId, newLinked) => {
    setClients(prev =>
      prev.map(c =>
        c._id === clientId ? { ...c, linkedUsers: newLinked } : c
      )
    );
  };

  // Generate a linking code for user or admin
  const generateCode = async (clientId, type) => {
    try {
     const endpoint =
       type === "user"
         ? `/clients/linkCompanyUser/${clientId}`
         : `/clients/linkCompanyAdmin/${clientId}`;
      const res = await axiosSecure.patch(endpoint);
      const code = res.data.code || "";
      if (type === "user") {
        setUserCodes(prev => ({ ...prev, [clientId]: code }));
      } else {
        setAdminCodes(prev => ({ ...prev, [clientId]: code }));
      }
    } catch (err) {
      console.error(`Failed to generate ${type} code:`, err);
    }
  };

  // Start editing a client
  const startEditing = (client) => {
    setEditingClient(client._id);
    setEditValues({
      // Use billingAddress for address, fallback to address field
      // Only set address if it has meaningful data
      address: (client.billingAddress && Object.keys(client.billingAddress).length > 0) 
        ? client.billingAddress 
        : (client.address && Object.keys(client.address).length > 0) 
          ? client.address 
          : null,
      // Use mainContact for phone and email, fallback to direct fields
      phone: client.mainContact?.phone || client.phone || "",
      email: client.mainContact?.email || client.email || "",
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingClient(null);
    setEditValues({});
  };

  // Save client changes
  const saveClientChanges = async (clientId) => {
    try {
      const updateData = {
        // Update mainContact for phone and email
        mainContact: {
          phone: editValues.phone,
          email: editValues.email,
          // Preserve existing mainContact fields
          name: clients.find(c => c._id === clientId)?.mainContact?.name || "",
          accountsEmail: editValues.email, // Usually same as email
        }
      };

      // Only include billingAddress if it has meaningful data (not empty)
      if (editValues.address && Object.keys(editValues.address).length > 0) {
        // Check if address has required fields for validation
        if (editValues.address.region && editValues.address.country) {
          updateData.billingAddress = editValues.address;
        } else if (editValues.address.full_address || editValues.address.line1) {
          // If we have address data but missing required fields, set defaults
          updateData.billingAddress = {
            ...editValues.address,
            region: editValues.address.region || "Unknown",
            country: editValues.address.country || "Unknown"
          };
        }
      }

      await axiosSecure.patch(`/clients/${clientId}`, updateData);
      
      // Update local state
      setClients(prev => 
        prev.map(client => 
          client._id === clientId 
            ? { 
                ...client, 
                // Only update billingAddress if it was included in the update
                ...(updateData.billingAddress && { billingAddress: updateData.billingAddress }),
                mainContact: {
                  ...client.mainContact,
                  phone: editValues.phone,
                  email: editValues.email,
                  accountsEmail: editValues.email,
                }
              }
            : client
        )
      );
      
      setEditingClient(null);
      setEditValues({});
      message.success("Client updated successfully!");
    } catch (err) {
      console.error("Failed to update client:", err);
      message.error("Failed to update client. Please try again.");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Search & Tabs */}
      <div className="w-fit mx-auto gap-2 md:flex md:justify-between md:w-full lg:w-full my-6">
        <div className="relative w-fit my-2">
          <IconSearch className="absolute top-[11px] left-2" />
          <input
            type="text"
            className="pl-10 h-9 rounded-md placeholder:text-medium"
            placeholder="Search clients by name, address, phone, or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4 py-1 px-1 text-medium text-textGray rounded-full bg-white w-fit">
          {["All Clients", "New Clients"].map(label => (
            <button
              key={label}
              className={`px-4 py-1 rounded-full transition-colors duration-300 ${
                activeButton === label
                  ? "bg-secondary text-white"
                  : "bg-transparent text-textGray"
              }`}
              onClick={() => setActiveButton(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div className="overflow-x-auto bg-white p-4 rounded-md">
        <table className="w-full min-w-[1200px] table-fixed">
          <thead>
            <tr className="text-left h-10 bg-primary-10 text-medium">
              <td className="pl-2 w-[16%] overflow-hidden truncate">Client</td>
              <td className="w-[23%]">Address</td>
              <td className="w-[18%]">Contact</td>
              <td className="text-center w-[8%]">Assigned Projects</td>
              <td className="text-center w-[12%]">User Linking Code</td>
              <td className="text-center w-[12%]">Admin Linking Code</td>
              <td className="text-center w-[11%]">Actions</td>
            </tr>
          </thead>
          <tbody>{clients.map(client => {
            const name = client.name || client.username || "";
            const initials = name
              .split(" ")
              .map(w => w.charAt(0))
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const isEditing = editingClient === client._id;

            return (
              <tr key={client._id} className="border-t text-semiBold">
                {/* Avatar + Name */}
                <td className="py-2">
                  <div className="inline-flex items-center bg-gray-100 rounded-lg px-2 py-1 max-w-xs">
                    <div className="flex-shrink-0 rounded-full bg-blue-500 w-6 h-6 flex items-center justify-center text-white text-xs font-medium">
                      {initials}
                    </div>
                    <span className="ml-2 truncate">{name || "—"}</span>
                  </div>
                </td>

                {/* Address - Editable with 2-line limit */}
                <td className="py-2">
                  {isEditing ? (
                    <div className="w-full">
                      <AddressInput
                        location={editValues.address}
                        setLocation={(newAddress) => setEditValues(prev => ({ ...prev, address: newAddress }))}
                        disabled={false}
                      />
                    </div>
                  ) : (
                    <div className="w-full">
                      <span className="block line-clamp-2 text-sm leading-tight">
                        {client.billingAddress?.full_address || 
                         client.address?.full_address || 
                         (typeof client.address === "string" ? client.address : "—")}
                      </span>
                    </div>
                  )}
                </td>

                {/* Contact (Phone + Email) - Editable, stacked */}
                <td className="py-2">
                  {isEditing ? (
                    <div className="w-full space-y-2">
                      <Input
                        value={editValues.phone}
                        onChange={(e) => setEditValues(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone number"
                        size="small"
                      />
                      <Input
                        value={editValues.email}
                        onChange={(e) => setEditValues(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email address"
                        size="small"
                        type="email"
                      />
                    </div>
                  ) : (
                    <div className="w-full space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="truncate text-gray-700">
                          {client.mainContact?.phone || client.phone || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate text-gray-700">
                          {client.mainContact?.email || client.email || "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </td>

                <td className="text-center">{(client.linkedProjects || []).length}</td>

                {/* User Code column */}
                <td className="text-center">
                  {userCodes[client._id] ? (
                    <div className="inline-flex items-center gap-1">
                      <span
                        className="font-mono text-md cursor-pointer text-blue-600 border border-blue-600 rounded px-2 h-[24px] w-[95px]"
                        onClick={() => handleCopy(userCodes[client._id])}
                        title="Click to copy"
                      >
                        {userCodes[client._id]}
                   </span>
                   <Button
                     size="small"
                     onClick={() => generateCode(client._id, "user")}
                     className="text-blue-600 border border-blue-600 rounded"
                     type="default"
                   >
                     <IconSync className="text-blue-600" />
                   </Button>
                    </div>
                  ) : (
                    <Button
                      size="small"
                      onClick={() => generateCode(client._id, "user")}
                    >
                      Generate
                    </Button>
                  )}
                </td>

                {/* Admin Code column */}
                <td className="text-center">
                  {adminCodes[client._id] ? (
                    <div className="inline-flex items-center gap-1">
                   <span
                     className="font-mono text-md cursor-pointer text-blue-600 border border-blue-600 rounded px-2 h-[24px] w-[95px]"
                     onClick={() => handleCopy(adminCodes[client._id])}
                     title="Click to copy"
                   >
                     {adminCodes[client._id]}
                   </span>
                   <Button
                     size="small"
                     onClick={() => generateCode(client._id, "admin")}
                     className="text-blue-600 border border-blue-600 rounded"
                     type="default"
                   >
                     <IconSync className="text-blue-600" />
                   </Button>
                    </div>
                  ) : (
                    <Button
                      size="small"
                      onClick={() => generateCode(client._id, "admin")}
                    >
                      Generate
                    </Button>
                  )}
                </td>

                {/* Actions */}
                <td className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="link"
                          size="small"
                          onClick={() => saveClientChanges(client._id)}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Save changes"
                        >
                          <IconSave className="w-4 h-4" />
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          onClick={cancelEditing}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Cancel editing"
                        >
                          <IconClose className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => startEditing(client)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit client details"
                      >
                        <IconEdit className="w-4 h-4" />
                      </Button>
                    )}
                    <button
                      onClick={() => setSelectedClient(client)}
                      disabled={isEditing}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary hover:bg-primary-dark disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                      title="Manage company users"
                    >
                      Users ({(client.linkedUsers || []).length})
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AssignUser Modal */}
      {selectedClient && (
        <AssignUser
          users={users}
          clientId={selectedClient._id}
          client={selectedClient}
          closeModal={() => setSelectedClient(null)}
          updateClientUsers={updateClientUsers}
        />
      )}
    </div>
  );
}
