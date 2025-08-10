import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../auth/AuthProvider";
import InviteUserModal from "./InviteUserModal";
import useClients from "../hooks/useClients";

const CompanyUserManager = ({ companyId }) => {
  const { user: currentUser } = useContext(AuthContext);
  const { clients: clientList, loading: clientsLoading } = useClients(currentUser?.role === "Admin");
  const [users, setUsers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    // Fetch users linked to this company
    fetch(`/api/companies/${companyId}/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []));
  }, [companyId]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg">Company Users</h3>
        <button
          onClick={() => setShowInvite(true)}
          className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark transition"
        >
          Invite User
        </button>
      </div>
      <ul className="divide-y divide-gray-200">
        {users.length === 0 && <li className="py-2 text-gray-400">No users linked</li>}
        {users.map((u) => (
          <li key={u._id} className="py-2 flex items-center gap-2">
            <span className="font-medium">{u.name || u.email}</span>
            <span className="text-xs text-gray-500">{u.email}</span>
          </li>
        ))}
      </ul>
      {showInvite && (
        <InviteUserModal
          isOpen={showInvite}
          onClose={() => setShowInvite(false)}
          onInviteSuccess={() => {
            // Refresh users list
            fetch(`/api/companies/${companyId}/users`)
              .then((res) => res.json())
              .then((data) => setUsers(data.users || []));
          }}
        />
      )}
    </div>
  );
};

export default CompanyUserManager;
