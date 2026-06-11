import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ["src"], rollupTypes: true }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MermaidReactflowRender",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "@xyflow/react"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "@xyflow/react": "XYFlowReact",
        },
        assetFileNames: (assetInfo) =>
          assetInfo.name === "style.css" ? "styles.css" : assetInfo.name ?? "asset",
      },
    },
    sourcemap: true,
  },
});
