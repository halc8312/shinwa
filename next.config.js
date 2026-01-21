/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_ACTIONS === 'true' || process.env.GITHUB_PAGES === 'true'
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
const basePath = isGithubPages && repository ? `/${repository}` : ''

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  output: isGithubPages ? 'export' : undefined,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: isGithubPages,
  images: {
    unoptimized: isGithubPages,
  },
}

module.exports = nextConfig
