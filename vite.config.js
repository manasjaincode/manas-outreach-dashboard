import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Google Maps
      '/maps-api': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maps-api/, ''),
      },
      // Google News RSS — fixes CORS for fetchFundingNews
      '/gnews-api': {
        target: 'https://news.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gnews-api/, '/rss/search'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      },
      // Jina AI — website crawling (bypasses CORS + bot blocks)
      '/jina-api': {
        target: 'https://r.jina.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jina-api/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/plain',
          'X-Return-Format': 'text',
          'X-Timeout': '15',
        },
      },
      // Remotive — remote tech jobs
      '/remotive-api': {
        target: 'https://remotive.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/remotive-api/, '/api/remote-jobs'),
      },
      // Arbeitnow — free open job board
      '/arbeitnow-api': {
        target: 'https://www.arbeitnow.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/arbeitnow-api/, '/api/job-board-api'),
      },
      // Himalayas — remote jobs
      '/himalayas-api': {
        target: 'https://himalayas.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/himalayas-api/, '/jobs/api'),
      },
    },
  },
})