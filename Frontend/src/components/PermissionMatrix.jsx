// src/components/PermissionMatrix.jsx
import React, { useState, useEffect } from 'react';
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';

const PermissionMatrix = ({ isOpen, onClose, onPermissionsUpdate }) => {
  const axiosSecure = useAxiosSecure();
  
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Define available permissions and their descriptions
  const permissionCategories = {
    projects: {
      label: "Projects",
      permissions: {
        'projects.view': 'View Projects',
        'projects.create': 'Create Projects',
        'projects.edit': 'Edit Projects',
        'projects.delete': 'Delete Projects',
        'projects.assign': 'Assign Projects to Users',
        'projects.manage_status': 'Change Project Status',
      }
    },
    users: {
      label: "User Management",
      permissions: {
        'users.view': 'View Users',
        'users.create': 'Create/Invite Users',
        'users.edit': 'Edit User Profiles',
        'users.delete': 'Delete Users',
        'users.block': 'Block/Unblock Users',
        'users.promote': 'Promote Users to Admin',
      }
    },
    clients: {
      label: "Client Management",
      permissions: {
        'clients.view': 'View Clients',
        'clients.create': 'Create Clients',
        'clients.edit': 'Edit Client Details',
        'clients.delete': 'Delete Clients',
        'clients.link_users': 'Link Users to Clients',
      }
    },
    files: {
      label: "File Management",
      permissions: {
        'files.view': 'View Files',
        'files.upload': 'Upload Files',
        'files.download': 'Download Files',
        'files.delete': 'Delete Files',
        'files.create_folders': 'Create Folders',
        'files.manage_structure': 'Manage Folder Structure',
      }
    },
    system: {
      label: "System Administration",
      permissions: {
        'system.settings': 'Access System Settings',
        'system.logs': 'View System Logs',
        'system.backup': 'System Backup/Restore',
        'system.user_sessions': 'Manage User Sessions',
      }
    }
  };

  const roles = ['Admin', 'User', 'Estimator', 'Client'];

  // Fetch current permissions
  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await axiosSecure.get('/permissions/matrix');
      if (response.data.success) {
        setPermissions(response.data.permissions);
      } else {
        throw new Error(response.data.message || 'Failed to fetch permissions');
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load permissions. Please try again.',
      });
      // Set default permissions if API fails
      setPermissions(getDefaultPermissions());
    } finally {
      setLoading(false);
    }
  };

  // Default permission matrix
  const getDefaultPermissions = () => {
    const defaultPerms = {};
    
    Object.keys(permissionCategories).forEach(category => {
      Object.keys(permissionCategories[category].permissions).forEach(permission => {
        defaultPerms[permission] = {
          Admin: true,
          User: false,
          Estimator: false,
          Client: false,
        };
      });
    });

    // Set some default permissions for different roles
    // User permissions
    defaultPerms['projects.view'].User = true;
    defaultPerms['files.view'].User = true;
    defaultPerms['files.upload'].User = true;
    defaultPerms['files.download'].User = true;
    
    // Estimator permissions (includes User permissions plus more)
    Object.keys(defaultPerms).forEach(permission => {
      if (defaultPerms[permission].User) {
        defaultPerms[permission].Estimator = true;
      }
    });
    defaultPerms['projects.create'].Estimator = true;
    defaultPerms['projects.edit'].Estimator = true;
    defaultPerms['clients.view'].Estimator = true;
    
    // Client permissions (limited)
    defaultPerms['projects.view'].Client = true;
    defaultPerms['files.view'].Client = true;
    defaultPerms['files.download'].Client = true;

    return defaultPerms;
  };

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
    }
  }, [isOpen]);

  const handlePermissionChange = (permission, role, value) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: {
        ...prev[permission],
        [role]: value
      }
    }));
  };

  const handleSavePermissions = async () => {
    try {
      setSaving(true);
      
      const response = await axiosSecure.post('/permissions/matrix', {
        permissions
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Permissions Updated',
          text: 'Permission matrix has been saved successfully.',
          timer: 2000,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
        });
        
        onPermissionsUpdate?.();
        onClose();
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'Failed to save permissions. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = (role, enable) => {
    const updatedPermissions = { ...permissions };
    
    Object.keys(updatedPermissions).forEach(permission => {
      updatedPermissions[permission] = {
        ...updatedPermissions[permission],
        [role]: enable
      };
    });
    
    setPermissions(updatedPermissions);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold text-textBlack">Permission Matrix</h2>
            <p className="text-textGray mt-1">Configure role-based permissions for your system</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Role Controls */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-textBlack mb-3">Quick Role Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => (
                    <div key={role} className="flex gap-2">
                      <button
                        onClick={() => handleRoleToggle(role, true)}
                        className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded hover:bg-green-200 transition"
                      >
                        Enable All {role}
                      </button>
                      <button
                        onClick={() => handleRoleToggle(role, false)}
                        className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200 transition"
                      >
                        Disable All {role}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permission Matrix */}
              {Object.entries(permissionCategories).map(([categoryKey, category]) => (
                <div key={categoryKey} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-3 border-b">
                    <h3 className="font-medium text-textBlack">{category.label}</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-3 font-medium text-textBlack">Permission</th>
                          {roles.map(role => (
                            <th key={role} className="text-center p-3 font-medium text-textBlack min-w-[100px]">
                              {role}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(category.permissions).map(([permissionKey, permissionLabel]) => (
                          <tr key={permissionKey} className="border-t hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-medium text-textBlack">{permissionLabel}</div>
                              <div className="text-xs text-textGray">{permissionKey}</div>
                            </td>
                            {roles.map(role => (
                              <td key={role} className="p-3 text-center">
                                <label className="inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={permissions[permissionKey]?.[role] || false}
                                    onChange={(e) => handlePermissionChange(permissionKey, role, e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                                  />
                                </label>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={saving || loading}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionMatrix;
