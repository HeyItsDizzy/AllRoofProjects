// Default role rules - matches backend FOLDER_ACCESS_RULES
const FOLDER_ACCESS_RULES = {
    Project: ["Admin", "User"],
    Admin: ["Admin"],
    Estimator: ["Estimator"]
  };
  
  export const canSeeFolder = (folderName, userRole = "User") => {
    if (!folderName) return false;
  
    const allowedRoles = FOLDER_ACCESS_RULES[folderName];
    if (!allowedRoles || allowedRoles.length === 0) return true; // if not defined, show it
  
    return allowedRoles.includes(userRole);
  };
  
  