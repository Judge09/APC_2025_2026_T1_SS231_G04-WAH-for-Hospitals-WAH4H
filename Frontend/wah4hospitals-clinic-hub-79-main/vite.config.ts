import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
  },
  // Disable sourcemaps for dev and build to avoid "No sources are declared" errors
  build: {
    sourcemap: false,
  },
  optimizeDeps: {
    // Prevent esbuild from generating sourcemaps for dependency pre-bundling
    esbuildOptions: {
      sourcemap: false,
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  envPrefix: ['VITE_', 'LOCAL_', 'BACKEND_', 'STURDY_'],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
