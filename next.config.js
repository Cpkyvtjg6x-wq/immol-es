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
  // Empeche la BFCache Safari de servir une version cachee de la landing
  // apres back-navigation depuis Stripe Checkout (le user voyait une vieille
  // version de la page d'accueil).
  async headers() {
    return [
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
      {
        source: '/checkout/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
