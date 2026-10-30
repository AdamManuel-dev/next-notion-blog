// const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = withBundleAnalyzer({
  output: 'export',
  transpilePackages: ['react-tweet'],
  images: {
    unoptimized: true,
    domains: ['pbs.twimg.com']
  }
})
