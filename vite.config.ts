import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base works on GitHub project Pages and local preview.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/splash/")) return "splash";
          if (id.includes("/src/package3/")) return "package3";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }
        },
      },
    },
  },
});
