import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
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