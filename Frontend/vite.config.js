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
    server: {
      proxy: {
        '/api': {
          target: 'https://projects.allrooftakeoffs.com.au',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🔴 Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('🟡 Sending Request to Target:', req.method, req.url);
              proxyReq.setHeader('Origin', 'https://projects.allrooftakeoffs.com.au');
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('🟢 Received Response from Target:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/socket.io': {
          target: 'http://projects.allrooftakeoffs.com.au:5001',
          changeOrigin: true,
          secure: false,  // Change to false since we're using HTTP
          ws: true, // Enable WebSocket proxying
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🔴 Socket Proxy error:', err);
            });
            proxy.on('proxyReqWs', (proxyReq, req, socket) => {
              console.log('🟡 WebSocket Request to Target:', req.url);
            });
          },
        }
      }
    },
    preview: {
      proxy: {
        '/api': {
          target: 'https://projects.allrooftakeoffs.com.au',
          changeOrigin: true,
          secure: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('preview proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Preview: Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Preview: Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        }
      }
    },
  };
});