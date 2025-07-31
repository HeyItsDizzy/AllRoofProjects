// src/pages/AllClientsTable.jsx
import React, { useEffect, useState } from "react";
import { IconSearch, IconSync }                      from "../shared/IconSet.jsx";
import useAxiosSecure                      from "../hooks/AxiosSecure/useAxiosSecure";
import { Button, message }                 from "antd";
import AssignUser                          from "../components/AssignUser";
import { Link }                            from "react-router-dom";

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

  const axiosSecure = useAxiosSecure();

  // Fetch clients (debounced)
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axiosSecure.get("/clients", {
          params: { search, recent: activeButton === "New Clients" },
        });
       const clientList = res.data || [];
       setClients(clientList);

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

  return (
    <div className="min-h-screen">
      {/* Search & Tabs */}
      <div className="w-fit mx-auto gap-2 md:flex md:justify-between md:w-full lg:w-full my-6">
        <div className="relative w-fit my-2">
          <IconSearch className="absolute top-[11px] left-2" />
          <input
            type="text"
            className="pl-10 h-9 rounded-md placeholder:text-medium"
            placeholder="Search clients"
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
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="text-left h-10 bg-primary-10 text-medium">
              <td className="pl-2 w-[250px] overflow-hidden truncate">Client</td>
              <td>Address</td>
              <td>Phone</td>
              <td>Email</td>
              <td className="text-center">Assigned Projects</td>
              <td className="text-center w-[150px]">User Linking Code</td>       {/* new */}
              <td className="text-center w-[150px]">Admin Linking Code</td>      {/* new */}
              <td className="text-center">Action</td>
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

                <td>{client.address || "—"}</td>
                <td>{client.phone || "—"}</td>
                <td>{client.email || "—"}</td>
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

                {/* Manage Users */}
                <td className="text-center">
                  <Button
                    type="link"
                    onClick={() => setSelectedClient(client)}
                  >
                    Manage Users
                  </Button>
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
