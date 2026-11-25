import { transformAsync } from '@babel/core';
// @ts-expect-error - no types
import presetTypescript from '@babel/preset-typescript';
// @ts-expect-error - no types
import solidPlugin from '@solidjs/babel-plugin';
import { readFile } from 'node:fs/promises';
import { defineConfig, type Options } from 'tsup';
import clerkJsPackage from './node_modules/@clerk/clerk-js/package.json' with { type: 'json' };
import thisPackage from './package.json' with { type: 'json' };

type Plugin = NonNullable<Options['esbuildPlugins']>[number];

/**
 * Entries that render JSX. Each one is published three ways:
 * - `index.jsx`  preserved JSX, picked up by the `solid` export condition
 * - `index.js`   compiled for the DOM (browser/default)
 * - `server.js`  compiled for SSR (node/worker/deno)
 */
const jsxEntries = {
  'index/index': 'src/index.tsx',
  'experimental/index': 'src/experimental.ts',
  'legacy/index': 'src/legacy.ts',
  'start/index': 'src/start/index.tsx',
  'internal/index': 'src/internal.ts'
};

/** Entries without JSX, published once. */
const plainEntries = {
  'errors/index': 'src/errors.ts',
  'start/server/index': 'src/start/server/index.ts'
};

const solidBabel = (generate: 'dom' | 'ssr', dev: boolean): Plugin => ({
  name: `solid-${generate}`,
  setup(build) {
    build.onLoad({ filter: /\.[cm]?[jt]sx$/ }, async (args) => {
      const source = await readFile(args.path, 'utf8');
      const result = await transformAsync(source, {
        filename: args.path,
        babelrc: false,
        configFile: false,
        sourceMaps: 'inline',
        presets: [[presetTypescript, { onlyRemoveTypeImports: true }]],
        plugins: [[solidPlugin, { generate, hydratable: true, dev }]]
      });
      return { contents: result?.code ?? '', loader: 'js' };
    });
  }
});

export default defineConfig((config) => {
  const watching = !!config.watch;
  const shouldPublish = !!config.env?.publish;

  const external = [
    ...Object.keys(thisPackage.peerDependencies),
    /^solid-js/,
    /^@solidjs\//
  ];

  const define = {
    PACKAGE_NAME: `"${thisPackage.name}"`,
    PACKAGE_VERSION: `"${thisPackage.version}"`,
    JS_PACKAGE_VERSION: `"${clerkJsPackage.version}"`,
    __DEV__: `${watching}`
  };

  const shared: Options = {
    format: 'esm',
    target: 'esnext',
    platform: 'neutral',
    outDir: 'dist',
    treeshake: watching ? false : 'recommended',
    sourcemap: true,
    splitting: true,
    external,
    define,
    dts: false
  };

  const configs: Options[] = [
    {
      ...shared,
      name: 'jsx',
      entry: jsxEntries,
      clean: !watching,
      outExtension: () => ({ js: '.jsx' }),
      esbuildOptions(options) {
        options.jsx = 'preserve';
      }
    },
    {
      ...shared,
      name: 'dom',
      entry: jsxEntries,
      esbuildPlugins: [solidBabel('dom', watching)]
    },
    {
      ...shared,
      name: 'ssr',
      entry: Object.fromEntries(
        Object.entries(jsxEntries).map(([out, src]) => [
          out.replace(/index$/, 'server'),
          src
        ])
      ),
      esbuildPlugins: [solidBabel('ssr', watching)]
    },
    {
      ...shared,
      name: 'plain',
      entry: plainEntries,
      platform: 'node'
    }
  ];

  if (shouldPublish) {
    configs[configs.length - 1].onSuccess = 'pnpm run publish:local';
  }

  return configs;
});
