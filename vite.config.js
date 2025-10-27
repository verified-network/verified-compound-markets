import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import nodePolyfills from "rollup-plugin-polyfill-node";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Node.js global to browser globalThis
  define: {
    global: "globalThis",
  },
  server: {
    port: 5183,
  },
  build: {
    target: ["es2020"],
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
      },
      plugins: [nodePolyfills()],
      external: [
        "@safe-globalThis/safe-apps-provider",
        "@safe-globalThis/safe-apps-sdk",
      ],
    },
  },
  base: "",
  publicDir: "web_public",
  experimental: {
    renderBuiltUrl: (filename, { hostType }) => {
      return { relative: true };
    },
  },
  resolve: {
    alias: {
      "/fonts": resolve(__dirname, "node_modules/compound-styles/public/fonts"),
      process: "process/browser",
      stream: "stream-browserify",
      zlib: "browserify-zlib",
      util: "util/",
      path: "path-browserify",
      "@": resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
      supported: {
        bigint: true,
      },
      // Enable esbuild polyfill plugins
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          protocolImports: true,
        }),
      ],
    },
  },
});


function getBondPurchases(address purchaser, address bondToken) external view returns(uint256, uint256, bytes32, uint256){
          return (issues[purchaser][bondToken].purchasedIssueAmount,
                  issues[purchaser][bondToken].paidInAmount,
                  issues[purchaser][bondToken].paidInCurrency,
                  issues[purchaser][bondToken].timeIssuedOrSubscribed);
  
    }
