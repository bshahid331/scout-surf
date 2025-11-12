import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import stdLibBrowser from 'vite-plugin-node-stdlib-browser';

// NOTE: We don't need the `vite-plugin-commonjs` import anymore.
// Vite has a built-in, configurable CommonJS plugin.

// Get port number from directory name as fallback
const dirName = __dirname.split(path.sep).pop() || '';
const portMatch = dirName.match(/server-(\d+)/);
const fallbackPort = portMatch ? parseInt(portMatch[1]) : 3001;

// https://vite.dev/config/
export default defineConfig(
  ({ command, mode, ssrBuild }: { command: string; mode: string; ssrBuild: boolean }) => {
    // Get port from CLI args if provided
    const cliPort = process.env.PORT ? parseInt(process.env.PORT) : undefined;

    return {
      // SOLUTION PART 1: Force Vite to pre-bundle the problematic dependencies
      optimizeDeps: {
        include: [
          // The main library that uses `require`
          '@tarobase/js-sdk',
          // Its internal dependencies that it tries to `require`
          '@privy-io/react-auth',
          '@privy-io/react-auth/solana',
        ],
      },
      build: {
        minify: true,
        chunkSizeWarningLimit: 1500,
        commonjsOptions: {
          transformMixedEsModules: true,
        },
        rollupOptions: {
          onwarn(warning, warn) {
            if (warning.code === 'EVAL' && warning.loc?.file?.includes('vm-browserify')) {
              return;
            }
            if (warning.message.includes('annotation that Rollup cannot interpret')) {
              return;
            }
            warn(warning);
          },
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              tarobase: ['@tarobase/js-sdk'],
            },
          },
        },
      },
      plugins: [
        react(),
        stdLibBrowser(),
        // We removed the separate commonjs() plugin call. We use the built-in `build.commonjsOptions` instead.
      ],
      resolve: {
        dedupe: ['react', 'react-dom'],
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@tarobase/js-sdk': '@pooflabs/web',
          '@tarobase/server': '@pooflabs/server',
          '@tarobase/core': '@pooflabs/core',
          perf_hooks: false,
          v8: false,
        },
      },
      server: {
        port: cliPort || fallbackPort,
        allowedHosts: true,
        historyApiFallback: true,
      },
    };
  },
);
