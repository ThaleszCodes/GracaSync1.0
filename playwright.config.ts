import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 90000 },
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:5173",
    headless: true,
    proxy: process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" }
      : undefined,
    launchOptions: {
      ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
        : {}),
      args: ["--no-sandbox", "--no-zygote"],
    },
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npx vite --host 127.0.0.1 --port 5173",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
      },
  reporter: "list",
});
