import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY specifically for the Google GenAI SDK usage
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Polyfill empty process.env object to prevent "process is not defined" errors
      'process.env': {}
    }
  };
});