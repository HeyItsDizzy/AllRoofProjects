import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";

dotenv.config(); // Explicitly load .env

console.log("VITE_API_BASE_URL from dotenv:", process.env.VITE_API_BASE_URL);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  //base: './', // Use relative paths for assets
});

