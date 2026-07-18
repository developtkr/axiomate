import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
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
          if (id.includes("node_modules/react") || id.includes("node_modules/lucide-react")) return "react";
        },
      },
    },
  },
});
