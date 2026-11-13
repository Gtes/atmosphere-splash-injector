import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const PRODUCTION_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

/** Inject CSP only for production builds so Vite HMR keeps working in dev. */
function productionCsp(): Plugin {
  return {
    name: "production-csp",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (ctx.server) return html;
        const tag = `<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}" />`;
        return html.replace(/<head>/i, `<head>\n    ${tag}`);
      },
    },
  };
}

// Relative base works on GitHub project Pages and local preview.
export default defineConfig({
  base: "./",
  plugins: [react(), productionCsp()],
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
