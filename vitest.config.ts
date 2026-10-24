import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vitest harness. Unit logic aur isolated in-memory PostgreSQL migration tests;
// koi live DB/network nahi. React plugin kuch helpers .tsx se aate hain (JSX
// transform chahiye). "@/..." alias src par point karta hai taake test wahi
// module import karein jo app import karti hai.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    reporters: "default",
    // PostgreSQL workers aur active dev server ek saath local memory exhaust na karein.
    maxWorkers: 2,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next ka server-only marker unit harness me inert rahe, app build me gate qaim hai.
      "server-only": path.resolve(
        __dirname,
        "./node_modules/next/dist/compiled/server-only/empty.js",
      ),
    },
  },
});
