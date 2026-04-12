import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { displayDevSpacesLink, importNavbar, setDevCookies } from '@amzn/harmony-build-tools/vite-plugins';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), displayDevSpacesLink(), importNavbar(), setDevCookies()],
  server: {
    port: 3000,
    // uncomment this line to use the below host when running locally
    // you will need to configure your hosts file first: https://console.harmony.a2z.com/docs/application-development.html#Mimicking%20a%20Deployed%20App%20during%20Development
    // host: "dev.harmony.a2z.com" 
  },
  build: {
    outDir: process.env.BUILD_PATH || "build",
  },
  test: {
    environment: "jsdom",
    setupFiles: ['./tests/setup.ts'],
    globals: true // disable to explicitly import vitest exports in test files
  }
});
