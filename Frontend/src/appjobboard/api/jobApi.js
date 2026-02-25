// jobApi.js
const BASE_URL = '/projects'; // already prefixed with /api in backend config
//import axios from "axios";


 /*// Fetch projects
export const fetchAllJobs = async () => {
  try {
    const res = await axios.get("/get-projects");
    return Array.isArray(res.data) ? res.data : res.data.projects || [];
  } catch (err) {
    console.error("Failed to fetch jobs:", err);
    return [];
  }
};

*/ // possibly bad function and need to be deleted



/**
 * Save a new job to backend API
 * @param {Object} jobRow - The job object to save
 * @param {AxiosInstance} axiosSecure - Axios instance with token
 */
export async function createJob(jobRow, axiosSecure) {
  try {
    const response = await axiosSecure.post(BASE_URL, jobRow);
    return response.data;
  } catch (err) {
    console.error('Error saving job:', err);
    throw err;
  }
}

/**
 * Update an existing job
 * @param {string} jobId
 * @param {Object} updates
 * @param {AxiosInstance} axiosSecure
 */
export async function updateJob(jobId, updates, axiosSecure) {
  try {
    const response = await axiosSecure.put(`${BASE_URL}/${jobId}`, updates);
    return response.data;
  } catch (err) {
    console.error('Error updating job:', err);
    throw err;
  }
}

export async function saveJobBoardData(projectId, updates) {
  try {
    // Get the auth token from localStorage (same as axiosSecure)
    const token = localStorage.getItem("authToken");
    
    // Use the environment variable for the API base URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    
    console.log("💾 Saving job board data:", { projectId, updates });
    
    // Use the correct project update endpoint
    const response = await fetch(`${apiBaseUrl}/projects/update/${projectId}`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` // Add authentication header
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    
    console.log("✅ Job board data saved successfully:", data);
    return data;
  } catch (err) {
    console.error("❌ Failed to save job board data:", err.message);
    throw err; // Re-throw to let auto-save handle errors properly
  }
}
