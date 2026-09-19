import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite's preview server rejects requests whose Host header it doesn't
// recognise (a DNS-rebinding guard), which behind any hosting platform means
// a blanket 403 — the app is running, every request just gets turned away.
// PREVIEW_ALLOWED_HOSTS names the hostnames it's served under; a leading dot
// covers subdomains.
const allowedHosts = (
  process.env.PREVIEW_ALLOWED_HOSTS ?? '.railway.app,localhost'
)
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  preview: { allowedHosts },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
