import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const clerkPublishableKey = env.VITE_CLERK_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  return {
  plugins: [react()],
  base: "./",
  define: {
    "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify(clerkPublishableKey),
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/@codemirror")
            || id.includes("node_modules/y-codemirror")
            || id.includes("node_modules/yjs")
            || id.includes("node_modules/y-webrtc")
            || id.includes("node_modules/y-indexeddb")
          ) return "editor";
          if (id.includes("node_modules/katex")) return "math";
          if (id.includes("node_modules/@clerk")) return "auth";
          if (id.includes("node_modules/pdfjs-dist")) return "pdf";
          if (id.includes("node_modules/react") || id.includes("node_modules/lucide-react")) return "react";
        },
      },
    },
  },
  };
});
