import axios from "axios";

console.log("Full environment:\n- API_URL:", import.meta.env.VITE_API_BASE_URL, import.meta.env);

const axiosSecure = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Using Vite's environment variable
  withCredentials: true,
});

axiosSecure.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers["Access-Control-Allow-Credentials"] = "true";

    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    if (!config.headers["Accept"]) {
      config.headers["Accept"] = "application/json, text/plain, */*";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const useAxiosSecure = () => {
  return axiosSecure;
};

export default useAxiosSecure;
