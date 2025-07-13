// jobApi.js
const BASE_URL = '/projects'; // already prefixed with /api in your backend config

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
