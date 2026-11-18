import { readFile } from 'node:fs/promises'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const siteFiles = ['CNAME', 'googlea581463e157279ca.html', 'robots.txt', 'sitemap.xml']

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'copy-site-files',
      async generateBundle() {
        await Promise.all(siteFiles.map(async fileName => {
          const source = await readFile(new URL(fileName, import.meta.url))
          this.emitFile({ type: 'asset', fileName, source })
        }))
      },
    },
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        rollupFormat: 'iife',
        globPatterns: ['**/*.{js,css,html,json,png,ico}'],
        globIgnores: ['**/og-cover.png', '**/googlea581463e157279ca.html'],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      input: {
        app: 'index.html',
        notFound: '404.html',
      },
    },
  },
})
