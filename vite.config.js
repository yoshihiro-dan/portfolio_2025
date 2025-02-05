import restart from 'vite-plugin-restart'
import { resolve } from 'path';

export default {
    root: 'src/',  // ソースファイルのルート
    publicDir: '../static/', // 静的ファイルの置き場
    server:
    {
        host: true,
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env)
    },
    build:
    {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html'),
                skills: resolve(__dirname, 'src/skills-achievements.html') // 追加する HTML ファイル
            }
        }
    },
    plugins:
    [
        restart({ restart: [ '../static/**', ] }) // 静的ファイルの変更時に再起動
    ],
}