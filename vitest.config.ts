import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vitest harness (Phase 6). Sirf pure logic tests yahan chalte hain: koi DB, koi
// network. React plugin is liye ke kuch helpers .tsx module se aate hain (JSX
// transform chahiye). "@/..." alias src par point karta hai taake test wahi
// module import karein jo app import karti hai.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    reporters: "default",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
