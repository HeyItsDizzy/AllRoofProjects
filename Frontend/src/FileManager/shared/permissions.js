// permissions.js

// Fallback permission rules for known folders if meta is missing
const DEFAULT_FOLDER_PERMISSIONS = {
  "Project Root": {
    Permissions: {
      Read: ["Admin", "User", "Estimator"],
      Write: ["Admin", "User"],
      Delete: ["Admin", "Owner"]
    }
  },
  BOQ: {
    Permissions: {
      Read: ["Admin", "User"],
      Write: ["Admin", "User"],
      Delete: ["Admin", "Owner"]
    }
  },
  Admin: {
    Permissions: {
      Read: ["Admin"],
      Write: ["Admin"],
      Delete: ["Admin"]
    }
  },
  Estimator: {
    Permissions: {
      Read: ["Admin", "Estimator"],
      Write: ["Admin", "Estimator"],
      Delete: ["Admin", "Owner"]
    }
  },
  Unassigned: {
    Permissions: {
      Read: ["Admin", "User"],
      Write: ["Admin", "User"],
      Delete: ["Admin", "Owner"]
    }
  }
};

// 🔐 Helper to normalize role comparison
const isRoleAllowed = (list = [], role) => {
  return list.some(r => r.toLowerCase() === role.toLowerCase());
};

// 🎯 Main Permission Checker
const isAllowed = (folderName, action, userRole, userId = null, meta = {}) => {
  if (!folderName || !action || !userRole) return false;

  const normalizedPath = folderName === "." ? "./" : folderName;
  if (typeof meta?.Permissions !== "object") {
    console.warn("🚨 Meta.Permissions is missing or not an object:", meta);
  }
  

  // ✅ Root handling for both "." and "./"
  if (normalizedPath === "./") {
    if (action === "Read") return true;
    if (action === "Write") return ["Admin", "User"].includes(userRole);
    if (action === "Delete") return userRole === "Admin";
    console.warn("⛔ isAllowed failed:", {
      normalizedPath,
      action,
      userRole,
      permissions: meta?.Permissions?.[normalizedPath],
    });
    
    return false;
  }

  const permissionsFromMeta =
    meta?.Permissions?.[normalizedPath] || DEFAULT_FOLDER_PERMISSIONS[folderName]?.Permissions;

  if (!permissionsFromMeta) return false;

  const allowedRoles = permissionsFromMeta[action] || [];

  if (allowedRoles.includes("Owner") && meta?.Owner && userId && meta.Owner === userId) {
    return true;
  }

  return isRoleAllowed(allowedRoles, userRole);
};




const isAllowedWrapper = Object.assign(isAllowed, {
  Read: (...args) => isAllowed(...args, "Read"),
  Write: (...args) => isAllowed(...args, "Write"),
  Delete: (...args) => isAllowed(...args, "Delete"),
  Rename: (...args) => isAllowed(...args, "Rename"),
});

export { isAllowedWrapper as isAllowed };