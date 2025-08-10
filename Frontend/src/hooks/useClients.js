import { useEffect, useState } from "react";
import useAxiosSecure from "./AxiosSecure/useAxiosSecure";

export default function useClients(enabled = true) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const axiosSecure = useAxiosSecure();

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    axiosSecure.get("/clients")
      .then((res) => {
        console.log("🔍 useClients - API response:", res.data);
        // Backend returns clients directly as an array, not wrapped in {clients: [...]}
        setClients(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching clients:", err);
        setError(err);
        setClients([]);
        setLoading(false);
      });
  }, [enabled, axiosSecure]);

  return { clients, loading, error };
}
