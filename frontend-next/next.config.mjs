import path from "node:path"
import { fileURLToPath } from "node:url"

const configDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(configDir)
const workspaceRoot = path.resolve(configDir, "..")

const watchIgnored = [
  "**/node_modules/**",
  path.join(workspaceRoot, "Bomi-Slot-document-automatation"),
  path.join(workspaceRoot, "Bomi-Slot-document-automation"),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "http://10.50.209.5:9000",
    "10.50.209.5:9000",
    "http://localhost:9000",
    "localhost:9000",
  ],

  outputFileTracingRoot: workspaceRoot,

  experimental: {
    proxyClientMaxBodySize: "50mb",
  },

  turbopack: {
    root: projectRoot,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },

  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: watchIgnored,
      }
    }
    return config
  },
}

export default nextConfig