import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // ✅ Required for path.resolve

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };

  console.log("✅ Vite Loaded ENV Variables:", process.env); // Debugging
  console.log("✅ Mapbox API Key from Vite:", process.env.VITE_MAPBOX_API_KEY);

  return {
    plugins: [react()],
    define: {
      "process.env": process.env, // ✅ Ensure .env variables are available globally
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"), // ✅ Enables "@/..." paths
      },
    },
  };
});
