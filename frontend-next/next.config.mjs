import path from "node:path"
import { fileURLToPath } from "node:url"

const configDir = path.dirname(fileURLToPath(import.meta.url))
/** Next 앱 루트 (frontend-next) — turbopack/webpack 이 여기만 기준으로 동작 */
const projectRoot = path.resolve(configDir)
/** Git 저장소 루트 (Bomi-Slot 등 형제 폴더는 감시·추적 제외) */
const workspaceRoot = path.resolve(configDir, "..")

const watchIgnored = [
  "**/node_modules/**",
  path.join(workspaceRoot, "Bomi-Slot-document-automatation"),
  path.join(workspaceRoot, "Bomi-Slot-document-automation"),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: workspaceRoot,
  experimental: {
    // .hwp/.hwpx 업로드 — proxy 기본 10MB 초과 시 본문 잘림 → 프록시 502
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
