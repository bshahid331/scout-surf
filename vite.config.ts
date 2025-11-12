// @ts-nocheck
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import stdLibBrowser from 'vite-plugin-node-stdlib-browser';

// NOTE: We don't need the `vite-plugin-commonjs` import anymore.
// Vite has a built-in, configurable CommonJS plugin.

// Get port number from directory name as fallback
const dirName = __dirname.split(path.sep).pop() || '';
const portMatch = dirName.match(/server-(\d+)/);
const fallbackPort = portMatch ? parseInt(portMatch[1]) : 3001;

// https://vite.dev/config/
export default defineConfig(() => {
  // Get port from CLI args if provided
  const cliPort = process.env.PORT ? parseInt(process.env.PORT) : undefined;

  // Cache and output directory optimization (use environment variables if set)
  const cacheDir = process.env.VITE_POOF_CACHEDIR || path.resolve(__dirname, 'node_modules/.vite');
  const outDir = process.env.VITE_POOF_OUTDIR || path.resolve(__dirname, 'dist');

  // Plugin to inject console shim
  const consoleShimPlugin = (): Plugin => {
    return {
      name: 'inject-console-shim',
      transformIndexHtml(html) {
        const shimPath = path.resolve(__dirname, 'console-shim.js');
        let shimCode = '';

        try {
          shimCode = fs.readFileSync(shimPath, 'utf-8');
        } catch (e) {
          console.warn('Console shim file not found, skipping injection');
          return html;
        }

        // Get VITE_ENV from environment
        const viteEnv = process.env.VITE_ENV || 'development';

        // Inject the shim as an inline script in the head
        // This ensures it runs before any other scripts
        // Also inject VITE_ENV as a global variable
        return html.replace(
          '<head>',
          `<head>\n    <script>\n      window.__VITE_ENV__ = '${viteEnv}';\n${shimCode}\n    </script>`
        );
      },
    };
  };

  return {
    cacheDir,
    // SOLUTION PART 1: Force Vite to pre-bundle the problematic dependencies
    optimizeDeps: {
      include: [
        // The main library that uses `require`
        '@pooflabs/web',
        // Its internal dependencies that it tries to `require`
        '@privy-io/react-auth',
        '@privy-io/react-auth/solana',
      ],
    },
    build: {
      outDir,
      minify: process.env.BUILD_PROFILE === 'production',
      // Disable sourcemaps for production builds to optimize bundle size
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        treeshake: process.env.BUILD_PROFILE === 'production',
        onwarn(warning: any, warn: any) {
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
            poof: ['@pooflabs/web'],
          },
        },
      },
    },
    plugins: [
      consoleShimPlugin(),
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
    define: {
      global: 'globalThis',
    },
    server: {
      port: cliPort || fallbackPort,
      allowedHosts: true,
      historyApiFallback: true,
    },
  };
});
