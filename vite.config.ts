import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// Mirrors customer-app's vite.config.ts. Ops dev server uses a different
// port (5175 vs the app's 5174) so both can run side-by-side locally.
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
  ],
  server: { port: 5175 },
})
