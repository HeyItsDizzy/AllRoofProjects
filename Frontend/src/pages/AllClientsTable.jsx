// src/pages/AllClientsTable.jsx
import React, { useEffect, useState } from "react";
import { IconSearch, IconSync, IconEdit } from "@/shared/IconSet.jsx";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import { Button, message, Input, Modal, Tag } from "antd";
import AssignUser from "../components/AssignUser";
import EditClientModal from "../components/EditClientModal";
import AddClientModal from "../components/AddClientModal";

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
  const [loading, setLoading]               = useState(false);
  const [clientCounts, setClientCounts]     = useState({ all: 0, recent: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Edit client modal state
  const [editClient, setEditClient] = useState(null);

  // store codes by clientId
  const [userCodes, setUserCodes]   = useState({});
  const [adminCodes, setAdminCodes] = useState({});

  // Add new client modal state
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  const axiosSecure = useAxiosSecure();

  // Fetch clients (debounced)
  useEffect(() => {
    const fetchClients = async () => {
      if (!search && activeButton === "All Clients") {
        setLoading(true);
      }
      
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
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(fetchClients, 500);
    return () => clearTimeout(t);
  }, [axiosSecure, search, activeButton, refreshTrigger]);

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

  // Handle client created callback
  const handleClientCreated = (newClient) => {
    // Add the new client to the local state
    setClients(prev => [newClient, ...prev]);
    setShowAddClientModal(false);
  };

  // Delete client function with confirmation
  const deleteClient = async (clientId, clientName) => {
    Modal.confirm({
      title: 'Delete Client - Permanent Action',
      content: (
        <div className="space-y-3">
          <p>Are you sure you want to <strong>permanently delete</strong> "{clientName}"?</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
            <p className="font-medium text-yellow-800 mb-2">⚠️ This will also:</p>
            <ul className="list-disc list-inside text-yellow-700 space-y-1">
              <li>Remove this client from all associated projects</li>
              <li>Unlink all users from this client</li>
              <li>Clear company assignments for affected users</li>
              <li>Delete all client data permanently</li>
            </ul>
          </div>
          <p className="text-red-600 font-medium">This action cannot be undone!</p>
        </div>
      ),
      okText: 'Yes, Delete Permanently',
      okType: 'danger',
      cancelText: 'Cancel',
      width: 500,
      onOk: async () => {
        try {
          const response = await axiosSecure.delete(`/clients/${clientId}`);
          
          // Show detailed success message with cleanup summary
          if (response.data.cleanupSummary) {
            const summary = response.data.cleanupSummary;
            message.success({
              content: (
                <div>
                  <div className="font-medium">Client deleted successfully!</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Cleaned up {summary.totalOperations} database operations affecting {summary.projectsAffected} projects and {summary.usersAffected} users.
                  </div>
                </div>
              ),
              duration: 6
            });
          } else {
            message.success("Client deleted successfully!");
          }
          
          // Remove client from local state
          setClients(prev => prev.filter(client => client._id !== clientId));
          
          // Clear editing state if this client was being edited
          if (editingClient === clientId) {
            setEditingClient(null);
            setEditValues({});
          }
          
          // Clear any cached codes for this client
          setUserCodes(prev => {
            const newCodes = { ...prev };
            delete newCodes[clientId];
            return newCodes;
          });
          setAdminCodes(prev => {
            const newCodes = { ...prev };
            delete newCodes[clientId];
            return newCodes;
          });
          
        } catch (err) {
          console.error("Failed to delete client:", err);
          const errorMessage = err.response?.data?.message || "Failed to delete client. Please try again.";
          message.error({
            content: errorMessage,
            duration: 8
          });
        }
      }
    });
  };



  return (
    <div className="min-h-screen">
      {/* Search & Tabs */}
      <div className="w-fit mx-auto gap-2 md:flex md:justify-between md:w-full lg:w-full my-6">
        <div className="relative w-fit my-2">
          <IconSearch className="absolute top-[11px] left-2" />
          <input
            type="text"
            className="pl-10 h-9 rounded-md placeholder:text-medium border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Search clients by name, address, phone, or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {clients.length > 0 && !loading && (
            <div className="text-xs text-gray-500 mt-1">
              {search ? `${clients.length} result${clients.length !== 1 ? 's' : ''}` : `${clients.length} client${clients.length !== 1 ? 's' : ''} total`}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2 py-1 px-2 text-sm font-medium text-textGray rounded-lg bg-gray-50 border w-fit">
            {[
              { key: "All Clients", label: "All Clients" },
              { key: "New Clients", label: "Recent Clients" }
            ].map(item => (
              <button
                key={item.key}
                className={`px-4 py-2 rounded-md transition-all duration-300 whitespace-nowrap ${
                  activeButton === item.key
                    ? "bg-primary text-white shadow-sm font-semibold"
                    : "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                }`}
                onClick={() => setActiveButton(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          
          <Button
            type="primary"
            onClick={() => setShowAddClientModal(true)}
            className="bg-primary hover:bg-primary-dark border-primary hover:border-primary-dark"
          >
            + Add New Client
          </Button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="overflow-x-auto bg-white p-4 rounded-md">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
              Loading clients...
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">No clients found</h3>
            <p className="text-sm">
              {search ? 
                `No clients match your search "${search}"` : 
                activeButton === "New Clients" ? 
                  "No recent clients to display" : 
                  "Get started by adding your first client"
              }
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1400px] table-fixed">
            <thead>
              <tr className="text-left h-10 bg-primary-10 text-medium">
                <td className="pl-2 w-[12%] overflow-hidden truncate">Client</td>
                <td className="w-[17%]">Address</td>
                <td className="w-[14%]">Contact</td>
                <td className="text-center w-[6%]">Projects</td>
                <td className="text-center w-[7%]">Status</td>
                <td className="text-center w-[8%]">Tier</td>
                <td className="text-center w-[10%]">User Code</td>
                <td className="text-center w-[10%]">Admin Code</td>
                <td className="text-center w-[16%]">Actions</td>
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

                {/* Address */}
                <td className="py-2">
                  <div className="w-full">
                    <span className="block line-clamp-2 text-sm leading-tight">
                      {client.billingAddress?.full_address || 
                       client.address?.full_address || 
                       (typeof client.address === "string" ? client.address : "—")}
                    </span>
                  </div>
                </td>

                {/* Contact (Name + Phone + Email) */}
                <td className="py-2">
                  <div className="w-full space-y-1">
                    {(client.mainContact?.name || client.name) && (
                      <div className="flex items-center gap-1 text-sm">
                        <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="truncate text-gray-700 font-medium">
                          {client.mainContact?.name || client.name || "—"}
                        </span>
                      </div>
                    )}
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
                </td>

                <td className="text-center">{(client.linkedProjects || []).length}</td>

                {/* Account Status column */}
                <td className="text-center py-2">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      client.accountStatus === "Hold"
                        ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                        : "bg-green-100 text-green-800 border border-green-300"
                    }`}
                  >
                    {client.accountStatus === "Hold" ? "🔒 Hold" : "✓ Active"}
                  </span>
                </td>

                {/* Loyalty Tier column */}
                <td className="py-2 text-center">
                  {client.loyaltyTier ? (
                    <Tag color={client.loyaltyTier.toLowerCase() === 'elite' ? 'gold' : client.loyaltyTier.toLowerCase() === 'premium' ? 'blue' : 'default'}>
                      {client.loyaltyTier.toUpperCase()}
                    </Tag>
                  ) : (
                    <span className="text-gray-400 text-xs">Standard</span>
                  )}
                </td>

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
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setEditClient(client)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit client details and manage tier"
                    >
                      <IconEdit className="w-4 h-4" />
                    </Button>
                    <button
                      onClick={() => setSelectedClient(client)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary hover:bg-primary-dark text-white text-xs font-medium rounded transition-colors duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
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
        )}
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

      {/* Add New Client Modal - Reusable Component */}
      <AddClientModal
        isVisible={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        onClientCreated={handleClientCreated}
      />

      {/* Edit Client Modal */}
      {editClient && (
        <EditClientModal
          client={editClient}
          isOpen={!!editClient}
          onClose={() => setEditClient(null)}
          onUpdate={() => {
            setRefreshTrigger(prev => prev + 1);
            setEditClient(null);
          }}
        />
      )}
    </div>
  );
}
