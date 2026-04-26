import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['nodemailer', 'jspdf', 'jspdf-autotable'],
  },
}

export default nextConfig
