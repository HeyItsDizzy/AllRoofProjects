// Temporary development tool for testing different roles
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../auth/AuthProvider';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';

const RoleSwitcher = () => {
  const { user, setUser } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  const [estimators, setEstimators] = useState([]);
  const [clients, setClients] = useState([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 }); // top-4 right-4 equivalent
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Show for all roles in development - check if user has dev override OR is original admin
  const hasDevAccess = localStorage.getItem('devRoleOverride') || 
                      localStorage.getItem('originalUser') || 
                      user?.role === 'Admin';
  
  if (!hasDevAccess) {
    return null;
  }

  // Fetch estimators for impersonation
  useEffect(() => {
    // Only fetch if user has admin privileges (original or current)
    const originalUser = localStorage.getItem('originalUser');
    const isOriginalAdmin = originalUser ? JSON.parse(originalUser).role === 'Admin' : false;
    const canFetchUsers = user?.role === 'Admin' || isOriginalAdmin;
    
    if (canFetchUsers) {
      // Fetch estimators
      axiosSecure
        .get("/users/get-users")
        .then(res => {
          const estimatorUsers = (res.data.data || []).filter(user => user.role === "Estimator");
          setEstimators(estimatorUsers);
        })
        .catch(err => console.error("Failed to fetch estimators:", err));
      
      // Fetch clients
      axiosSecure
        .get("/clients")
        .then(res => {
          setClients(Array.isArray(res.data) ? res.data : []);
        })
        .catch(err => console.error("Failed to fetch clients:", err));
    }
  }, [axiosSecure, user?.role]);

  // Drag functionality
  const handleMouseDown = (e) => {
    if (e.target.closest('.role-switcher-content')) return; // Don't drag if clicking on content
    
    setIsDragging(true);
    const rect = dragRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - 320; // Subtract width of component
    const maxY = window.innerHeight - 200; // Subtract approximate height
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const switchRole = (newRole) => {
    // Store the original user data for restoration (only if not already stored)
    // This prevents overwriting the original if switching multiple times
    if (!localStorage.getItem('originalUser') && !localStorage.getItem('devRoleOverride')) {
      localStorage.setItem('originalUser', JSON.stringify(user));
    }
    
    // Create updated user with new role
    const updatedUser = { ...user, role: newRole };
    
    // Set dev overrides FIRST before updating state
    localStorage.setItem('devRoleOverride', newRole);
    
    // Update user state
    setUser(updatedUser);
    
    // Update localStorage with new user data (both keys for compatibility)
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('authUser', JSON.stringify(updatedUser));
    
    // Refresh page to update navigation and clear any cached state
    window.location.reload();
  };

  const impersonateUser = (targetUser) => {
    // Store the original user data for restoration (only if not already stored)
    // This prevents overwriting the original if switching multiple times
    if (!localStorage.getItem('originalUser') && !localStorage.getItem('devRoleOverride')) {
      localStorage.setItem('originalUser', JSON.stringify(user));
    }
    
    // Set dev overrides FIRST before updating state
    localStorage.setItem('devRoleOverride', targetUser.role);
    localStorage.setItem('devUserOverride', JSON.stringify(targetUser));
    
    // Completely replace user data with target user
    setUser(targetUser);
    
    // Update both possible localStorage keys for compatibility
    localStorage.setItem('user', JSON.stringify(targetUser));
    localStorage.setItem('authUser', JSON.stringify(targetUser));
    
    setShowUserPicker(false);
    // Refresh page to update navigation and clear any cached state
    window.location.reload();
  };

  const impersonateCompanyUser = (client) => {
    // Store the original user data for restoration (only if not already stored)
    if (!localStorage.getItem('originalUser') && !localStorage.getItem('devRoleOverride')) {
      localStorage.setItem('originalUser', JSON.stringify(user));
    }
    
    // Create a mock user for the selected company
    const mockCompanyUser = {
      _id: `mock_user_${client._id}`,
      firstName: "Test",
      lastName: "User",
      name: `Test User (${client.company || client.name})`,
      email: `testuser@${(client.company || client.name).toLowerCase().replace(/\s+/g, '')}.com`,
      role: "User",
      company: client.company || client.name,
      companyId: client._id,
      linkedClients: [client._id],
      avatar: null,
      // Add any other user properties that might be needed
      isDevMockUser: true // Flag to identify this as a dev mock user
    };
    
    // Set dev overrides
    localStorage.setItem('devRoleOverride', 'User');
    localStorage.setItem('devUserOverride', JSON.stringify(mockCompanyUser));
    localStorage.setItem('devCompanyOverride', client._id);
    
    // Update user state
    setUser(mockCompanyUser);
    
    // Update localStorage with mock user data
    localStorage.setItem('user', JSON.stringify(mockCompanyUser));
    localStorage.setItem('authUser', JSON.stringify(mockCompanyUser));
    
    setShowClientPicker(false);
    // Refresh page to update navigation and clear any cached state
    window.location.reload();
  };

  const restoreOriginalUser = () => {
    const originalUser = localStorage.getItem('originalUser');
    if (originalUser) {
      const parsedUser = JSON.parse(originalUser);
      
      // Clear dev overrides FIRST
      localStorage.removeItem('devRoleOverride');
      localStorage.removeItem('devUserOverride');
      localStorage.removeItem('devCompanyOverride');
      localStorage.removeItem('originalUser');
      
      // Update user state
      setUser(parsedUser);
      
      // Update localStorage with original user data (both keys for compatibility)
      localStorage.setItem('user', JSON.stringify(parsedUser));
      localStorage.setItem('authUser', JSON.stringify(parsedUser));
      
      // Refresh page to update navigation and clear any cached state
      window.location.reload();
    }
  };

  return (
    <div 
      ref={dragRef}
      className={`fixed bg-yellow-100 border-2 border-yellow-500 rounded-lg shadow-lg z-50 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-yellow-200"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="text-xs font-bold text-yellow-800">
          🔧 DEV ROLE SWITCHER
        </div>
        <div className="text-yellow-800">
          {isCollapsed ? '▼' : '▲'}
        </div>
      </div>
      
      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="role-switcher-content p-3 pt-0 w-80">
          {/* Show if there's an active override */}
          {localStorage.getItem('devRoleOverride') && (
            <div className="text-xs bg-orange-200 border border-orange-400 rounded p-1 mb-2">
              <div className="flex items-center justify-between">
                <strong>🎭 OVERRIDE ACTIVE</strong>
                <button
                  onClick={restoreOriginalUser}
                  className="px-1 bg-orange-400 text-white rounded text-xs hover:bg-orange-500"
                >
                  Restore
                </button>
              </div>
              <div className="text-xs mt-1">
                Role: {localStorage.getItem('devRoleOverride')}
                {localStorage.getItem('devUserOverride') && <div>User: Full Impersonation</div>}
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-600 mb-2">
            Current: <span className="font-semibold">{user?.firstName} {user?.lastName}</span> ({user?.role})
          </div>
          
          {/* Role Switcher Buttons */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => switchRole('Admin')}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            >
              Admin
            </button>
            <button
              onClick={() => switchRole('Estimator')}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Estimator
            </button>
            <button
              onClick={() => switchRole('User')}
              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            >
              User
            </button>
          </div>

          {/* Impersonate Estimator - Only for Admin users */}
          {(user?.role === 'Admin' || (localStorage.getItem('originalUser') && JSON.parse(localStorage.getItem('originalUser')).role === 'Admin')) && (
            <div className="border-t border-yellow-400 pt-2">
              <button
                onClick={() => setShowUserPicker(!showUserPicker)}
                className="text-xs text-yellow-800 hover:text-yellow-900 underline"
              >
                🎭 Impersonate Estimator
              </button>
              
              {showUserPicker && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {estimators.map(est => (
                    <button
                      key={est._id}
                      onClick={() => impersonateUser(est)}
                      className="block w-full text-left px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded mb-1"
                    >
                      {est.firstName} {est.lastName}
                      <div className="text-gray-500">{est.email}</div>
                    </button>
                  ))}
                  {estimators.length === 0 && (
                    <div className="text-xs text-gray-500 italic">No estimators found</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Impersonate Company User - Only for Admin users */}
          {(user?.role === 'Admin' || (localStorage.getItem('originalUser') && JSON.parse(localStorage.getItem('originalUser')).role === 'Admin')) && (
            <div className="border-t border-yellow-400 pt-2">
              <button
                onClick={() => setShowClientPicker(!showClientPicker)}
                className="text-xs text-yellow-800 hover:text-yellow-900 underline"
              >
                🏢 Test Company User
              </button>
              
              {showClientPicker && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {clients.map(client => (
                    <button
                      key={client._id}
                      onClick={() => impersonateCompanyUser(client)}
                      className="block w-full text-left px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded mb-1"
                    >
                      {client.company || client.name}
                      <div className="text-gray-500">{client.email}</div>
                    </button>
                  ))}
                  {clients.length === 0 && (
                    <div className="text-xs text-gray-500 italic">No clients found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;
