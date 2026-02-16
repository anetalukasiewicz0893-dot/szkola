import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use '.' instead of process.cwd() to avoid type error 'Property cwd does not exist on type Process'
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    build: {
      target: 'esnext', // Required for pdfjs-dist top-level await support
    },
    define: {
      // Polyfill process.env.API_KEY specifically
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Prevent "process is not defined" error in browser
      'process.env': JSON.stringify({})
    }
  };
});