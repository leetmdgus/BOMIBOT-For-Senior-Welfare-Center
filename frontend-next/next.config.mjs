import path from "node:path"
import { fileURLToPath } from "node:url"

const configDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(configDir)
const workspaceRoot = path.resolve(configDir, "..")

// Docker 빌드(NEXT_STANDALONE=true): self-contained standalone 서버 출력.
// 트레이싱 루트도 앱 폴더로 한정해 .next/standalone/server.js 가 최상위에 생성되게 함.
// 기본/Vercel 빌드(env 미설정)는 기존 동작 그대로 유지.
const standalone = process.env.NEXT_STANDALONE === "true"

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

  output: standalone ? "standalone" : undefined,
  outputFileTracingRoot: standalone ? projectRoot : workspaceRoot,

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