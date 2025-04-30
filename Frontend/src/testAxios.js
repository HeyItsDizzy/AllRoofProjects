import axiosPublic from "../hooks/AxiosPublic/useAxiosPublic.js";



  console.log("Running testAxios.js...");
axiosPublic
  .get("/test")
  .then((res) => console.log("Test Response:", res.data))
  .catch((err) => console.error("Test Error:", err));
