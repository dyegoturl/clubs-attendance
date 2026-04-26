/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['nodemailer', 'jspdf', 'jspdf-autotable'],
  },
}

export default nextConfig
