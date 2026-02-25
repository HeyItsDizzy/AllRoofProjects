import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // ✅ Required for path.resolve
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };

  console.log("✅ Vite Loaded ENV Variables:", process.env); // Debugging
  console.log("✅ Mapbox API Key from Vite:", process.env.VITE_MAPBOX_API_KEY);

  return {
    plugins: [
      react(),
      // Bundle analyzer - only run in build mode
      visualizer({
        filename: 'dist/stats.html',
        open: false, // Don't auto-open
        gzipSize: true,
        brotliSize: true
      })
    ],
    define: {
      "process.env": process.env, // ✅ Ensure .env variables are available globally
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"), // ✅ Enables "@/..." paths
      },
    },
    optimizeDeps: {
      include: [
        'antd/es/message',
        'antd/es/modal', 
        'antd/es/button',
        'antd/es/form',
        'antd/es/input',
        'antd/es/select',
        'antd/es/checkbox',
        'antd/es/input-number',
        'antd/es/grid',
        'antd/es/locale/en_US',
        '@ant-design/icons/es/icons/MailOutlined',
        '@ant-design/icons/es/icons/UserOutlined',
        '@ant-design/icons/es/icons/HomeOutlined',
        '@ant-design/icons/es/icons/DollarOutlined',
        '@ant-design/icons/es/icons/ReloadOutlined'
      ]
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // React ecosystem
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            
            // Ant Design - highly optimized granular chunking
            'antd-core': [
              'antd/es/message',
              'antd/es/modal', 
              'antd/es/button',
              'antd/es/form'
            ],
            'antd-inputs': [
              'antd/es/input',
              'antd/es/select',
              'antd/es/checkbox',
              'antd/es/input-number'
            ],
            'antd-layout': [
              'antd/es/grid',
              'antd/es/locale/en_US'
            ],
            
            // Material UI
            'mui-vendor': ['@mui/material', '@emotion/react', '@emotion/styled'],
            
            // Phone number library optimization
            'phone-vendor': ['libphonenumber-js'],
            
            // Utilities
            'utils-vendor': ['axios', 'dayjs', 'date-fns'],
            
            // Icons and Graphics
            'icons-vendor': ['react-icons'],
            
            // Large/Heavy libraries  
            'heavy-vendor': ['html2canvas', 'jspdf', 'xlsx'],
            
            // Mapping and specialized libraries
            'map-vendor': ['@mapbox/mapbox-gl-geocoder'],
            
            // Tables and data manipulation
            'table-vendor': ['@tanstack/react-table'],
            
            // Socket and real-time
            'socket-vendor': ['socket.io-client'],
            
            // DnD and interactions
            'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            
            // Alerts and notifications
            'alert-vendor': ['sweetalert2']
          }
        }
      },
      chunkSizeWarningLimit: 300, // Reduce warning limit to be more strict
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // Remove console.logs in production
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.warn'], // Remove specific console methods
        },
        mangle: {
          safari10: true
        },
        format: {
          comments: false // Remove comments
        }
      },
      sourcemap: false, // Disable sourcemaps for smaller build
      cssMinify: true
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5002',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🔴 Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('🟡 Sending Request to Target:', req.method, req.url);
              proxyReq.setHeader('Origin', 'http://localhost:5002');
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('🟢 Received Response from Target:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/socket.io': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
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