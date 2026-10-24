import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Los tests usan bcrypt y SQLite temporal; 5s es demasiado ajustado en
    // runners compartidos y provoca falsos rojos por contención de CPU.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
