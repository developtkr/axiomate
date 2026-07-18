import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? "";
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "";

  return {
    plugins: [react()],
    base: "./",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
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
            if (id.includes("node_modules/@supabase")) return "cloud";
            if (id.includes("node_modules/pdfjs-dist")) return "pdf";
            if (id.includes("node_modules/react") || id.includes("node_modules/lucide-react")) return "react";
          },
        },
      },
    },
  };
});
