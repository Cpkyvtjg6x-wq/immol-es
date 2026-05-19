/** @type {import('next').NextConfig} */
const productionOrigin = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//, '')
  : null

const allowedOrigins = ['localhost:3000']
if (productionOrigin) allowedOrigins.push(productionOrigin)

const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins },
  },
}
module.exports = nextConfig
