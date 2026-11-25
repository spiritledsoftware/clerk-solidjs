# clerk-solidjs basic example

A server-rendered Solid 2 app using `clerk-solidjs` with [`@solidjs/vite-plugin`](https://github.com/solidjs/solid-vite-plugin) start mode (streaming SSR, middleware, and server functions) and Solid Router 2.

## Setup

```bash
cp .env.example .env # then fill in your keys from https://dashboard.clerk.com
pnpm install
pnpm --filter clerk-solidjs build # the example uses the workspace build of the library
```

## Develop and build

```bash
pnpm dev     # vite dev server
pnpm build   # vite build -> dist/client and dist/server
pnpm serve   # vite preview of the production build
```

## How it fits together

- `vite.config.ts` enables start mode: `solid({ start: { middleware: './src/middleware.ts' }, ssr: true, serverFunctions: true })`. It also folds `.env` into `process.env`, where Clerk reads `CLERK_SECRET_KEY` on the server.
- `src/middleware.ts` runs `clerkMiddleware()` from `clerk-solidjs/start/server` on every request. It authenticates the request, answers Clerk handshakes, and stores the auth state on the request event's `locals`.
- `src/App.tsx` mounts the router and wraps the routes in `ClerkProvider` from `clerk-solidjs/start`. The provider renders the request's auth state on the server and hands it to the browser for hydration. It also uses Solid Router for Clerk's navigation.
- `src/Document.tsx` is the HTML shell, with `<HydrationScript />`.
- `src/server/viewer.ts` is a `"use server"` module. `getViewer()` calls `auth()` to identify the caller from the request, then reads the user with `clerkClient()`.
- Pages: `/` (sign in/out), `/waitlist` (the `<Waitlist />` component), and `/protected` (calls `getViewer()` during SSR).
