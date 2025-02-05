import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import restart from 'vite-plugin-restart'
import path from 'path'

export default defineConfig({
  root: 'src/',  // ソースファイルのルート
  publicDir: '../static/', // 静的ファイルの置き場
  server: {
    host: true,
    open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env),
    fs: {
      allow: ['works', 'works/img', 'works/css', 'works/js']
    }
  },
  build: {
    assetsDir: 'works/assets', // assets を /works/assets/ に配置
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/works/index.html'), // メインページ
        works: path.resolve(__dirname, 'src/works/skills-achievements.html') // 追加ページ
      }
    }
  },
  plugins: [
    tailwindcss(),  // Tailwind CSS プラグイン
    restart({ restart: [ '../static/**', ] })  // 静的ファイルの変更時に再起動
  ]
})