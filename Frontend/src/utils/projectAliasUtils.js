// projectAliasUtils.js - Utilities for secure project URL aliasing

import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";

/**
 * Custom hook for managing project aliases
 * Provides functions to generate aliases and create secure navigation URLs
 */
export const useProjectAlias = () => {
  const axiosSecure = useAxiosSecure();

  /**
   * Get or create an alias for a project
   * @param {string} projectId - The project's database ID
   * @returns {Promise<string>} - The project alias
   */
  const getProjectAlias = async (projectId) => {
    try {
      const response = await axiosSecure.get(`/projects/get-alias/${projectId}`);
      return response.data.data.alias;
    } catch (error) {
      console.error("Error getting project alias:", error);
      throw error;
    }
  };

  /**
   * Generate a secure navigation URL for a project
   * @param {string} projectId - The project's database ID
   * @returns {Promise<string>} - The secure URL path
   */
  const getSecureProjectUrl = async (projectId) => {
    try {
      const alias = await getProjectAlias(projectId);
      return `/project/${alias}`;
    } catch (error) {
      console.error("Error generating secure project URL:", error);
      // Fallback to legacy URL format
      return `/project/${projectId}`;
    }
  };

  /**
   * Check if a string is a valid alias format
   * Supports both hybrid and legacy alias formats
   * @param {string} identifier - The identifier to check
   * @returns {boolean} - True if it's an alias format
   */
  const isAlias = (identifier) => {
    // Check for hybrid alias: projectNumber&obscureKey
    const isHybridAlias = identifier.includes('&');
    // Check for legacy random alias: 32 character hex
    const isLegacyRandomAlias = /^[a-f0-9]{32}$/.test(identifier);
    
    return isHybridAlias || isLegacyRandomAlias;
  };

  /**
   * Check if a string is a hybrid alias format
   * @param {string} identifier - The identifier to check
   * @returns {boolean} - True if it's a hybrid alias
   */
  const isHybridAlias = (identifier) => {
    return identifier.includes('&');
  };

  /**
   * Extract project number from hybrid alias
   * @param {string} hybridAlias - The hybrid alias (e.g., "AR2024-001ART&d0b76d33892783569144ead863d774b3")
   * @returns {string|null} - The project number (without ART) or null if not hybrid
   */
  const extractProjectNumber = (hybridAlias) => {
    if (!isHybridAlias(hybridAlias)) return null;
    const projectPart = hybridAlias.split('&')[0];
    // Remove 'ART' suffix if present
    return projectPart.endsWith('ART') ? projectPart.slice(0, -3) : projectPart;
  };

  /**
   * Check if a string is a valid ObjectId format
   * @param {string} identifier - The identifier to check
   * @returns {boolean} - True if it's an ObjectId format
   */
  const isObjectId = (identifier) => {
    return /^[a-f0-9]{24}$/.test(identifier);
  };

  return {
    getProjectAlias,
    getSecureProjectUrl,
    isAlias,
    isHybridAlias,
    extractProjectNumber,
    isObjectId
  };
};

/**
 * Utility function to create secure project navigation links
 * This should be used throughout the app instead of direct project ID links
 * @param {Object} project - Project object with _id
 * @param {Function} navigate - React Router navigate function
 * @param {Function} axiosSecure - Axios instance
 */
export const navigateToProject = async (project, navigate, axiosSecure) => {
  try {
    // If project already has a hybrid alias, use it
    if (project.alias && project.alias.includes('&')) {
      navigate(`/project/${project.alias}`);
      return;
    }

    // Otherwise, get or create a hybrid alias
    const response = await axiosSecure.get(`/projects/get-alias/${project._id}`);
    const hybridAlias = response.data.data.alias;
    navigate(`/project/${hybridAlias}`);
  } catch (error) {
    console.error("Error navigating to project:", error);
    // Fallback to legacy navigation
    navigate(`/project/${project._id}`);
  }
};

/**
 * Utility to update project table links to use hybrid aliases
 * This can be used to batch update navigation in project tables
 * @param {Array} projects - Array of project objects
 * @param {Function} axiosSecure - Axios instance
 * @returns {Promise<Array>} - Projects with secure URLs
 */
export const addSecureUrlsToProjects = async (projects, axiosSecure) => {
  try {
    const projectsWithUrls = await Promise.all(
      projects.map(async (project) => {
        try {
          // If project already has a hybrid alias, use it
          if (project.alias && project.alias.includes('&')) {
            return {
              ...project,
              secureUrl: `/project/${project.alias}`
            };
          }

          // Otherwise, get or create a hybrid alias
          const response = await axiosSecure.get(`/projects/get-alias/${project._id}`);
          const hybridAlias = response.data.data.alias;
          
          return {
            ...project,
            alias: hybridAlias,
            secureUrl: `/project/${hybridAlias}`
          };
        } catch (error) {
          console.warn(`Failed to get alias for project ${project._id}:`, error.message);
          return {
            ...project,
            secureUrl: `/project/${project._id}` // Fallback
          };
        }
      })
    );

    return projectsWithUrls;
  } catch (error) {
    console.error("Error adding secure URLs to projects:", error);
    return projects; // Return original projects on error
  }
};
