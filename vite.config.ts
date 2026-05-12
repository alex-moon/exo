import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({command}) => {
    if (command !== 'serve') {
        return {};
    }
    return {
        plugins: [
            viteStaticCopy({
                targets: [
                    {
                        src: 'data/*.json',
                        dest: ''
                    }
                ]
            })
        ]
    };
});
