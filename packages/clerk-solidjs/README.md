<div align="center">

<img src="https://raw.githubusercontent.com/spirit-led-software/clerk-solidjs/master/assets/images/icon.svg" alt="clerk-solidjs">

---

_This is an unofficial community-led port of the [Clerk React SDK](https://www.npmjs.com/package/@clerk/clerk-react) for [SolidJS](https://solidjs.com) and [SolidStart](https://start.solidjs.com)._

[![Clerk documentation](https://img.shields.io/badge/documentation-clerk-lavender.svg?style=for-the-badge&logo=clerk)](https://clerk.com/docs?utm_source=github&utm_medium=clerk_solidjs)

### Released on NPM

[![NPM version](https://img.shields.io/npm/v/clerk-solidjs.svg?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/clerk-solidjs)
[![NPM Downloads](https://img.shields.io/npm/dm/clerk-solidjs?style=for-the-badge)
](https://www.npmjs.com/package/clerk-solidjs)

### Maintained on GitHub

[![GitHub stars](https://img.shields.io/github/stars/spirit-led-software/clerk-solidjs.svg?style=for-the-badge)](https://github.com/spirit-led-software/clerk-solidjs/stargazers)
[![GitHub watchers](https://img.shields.io/github/watchers/spirit-led-software/clerk-solidjs.svg?style=for-the-badge)](https://github.com/spirit-led-software/clerk-solidjs/watchers)
[![GitHub license](https://img.shields.io/github/license/spirit-led-software/clerk-solidjs.svg?style=for-the-badge)](https://github.com/spirit-led-software/clerk-solidjs/blob/master/LICENSE)
[![GitHub forks](https://img.shields.io/github/forks/spirit-led-software/clerk-solidjs.svg?style=for-the-badge)](https://github.com/spirit-led-software/clerk-solidjs/forks)
[![GitHub issues](https://img.shields.io/github/issues/spirit-led-software/clerk-solidjs.svg?style=for-the-badge)](https://github.com/spirit-led-software/clerk-solidjs/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/spirit-led-software/clerk-solidjs.svg?style=for-the-badge)](https://github.com/spirit-led-software/clerk-solidjs/pulls)
[![GitHub contributors](https://img.shields.io/github/contributors/spirit-led-software/clerk-solidjs.svg?style=for-the-badge)](https://github.com/spirit-led-software/clerk-solidjs/graphs/contributors)
![GitHub last commit](https://img.shields.io/github/last-commit/spirit-led-software/clerk-solidjs.svg?style=for-the-badge)

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-yellow.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![turborepo](https://img.shields.io/badge/built%20with-turborepo-cc00ff.svg?style=for-the-badge&logo=turborepo)](https://turborepo.org/)

</div>

---

## Overview

Clerk is the easiest way to add authentication and user management to your application. Add sign up, sign in, and profile management to your application in minutes.

## Features

`clerk-solidjs` v3 targets **Solid 2** and tracks Clerk Core 3 (`@clerk/react` 6.x):

&#10004; [Prebuilt components](https://clerk.com/docs/components/overview), including `<PricingTable />`, `<APIKeys />`, `<UserAvatar />`, the session task components, and OAuth consent  
&#10004; [Custom pages and menu items](https://clerk.com/docs/components/customization/user-profile) for `<UserProfile />`, `<OrganizationProfile />`, `<UserButton />`, and `<OrganizationSwitcher />`  
&#10004; [Control components](https://clerk.com/docs/components/control/show) such as `<Show />`, `<ClerkLoaded />`, and `<ClerkDegraded />`  
&#10004; [Hooks](https://clerk.com/docs/references/react/use-user)\*, including the signal-based `useSignIn()`, `useSignUp()`, and `useWaitlist()`  
&#10004; Billing components and hooks under `clerk-solidjs/experimental`  
&#10004; Server rendering with Solid 2 start mode: [middleware](#middleware), [`auth()`](#the-auth-helper), and SSR auth state

\* Hooks return accessors, and hooks that take parameters take an accessor so they stay reactive:

```ts
const { isSignedIn, userId } = useAuth();
isSignedIn(); // read like any other accessor

useOrganizationList(() => ({ userMemberships: { infinite: true } }));
```

## Getting Started

### Prerequisites

- `solid-js` and `@solidjs/web` `>=2`
- For server rendering: `@solidjs/vite-plugin` `>=3` in start mode, and `@solidjs/router` `>=2`
- Node.js `>=20.19`

Using Solid 1 or SolidStart? Stay on `clerk-solidjs@2`.

### Installation

```sh
npm install clerk-solidjs
# or
yarn add clerk-solidjs
# or
pnpm add clerk-solidjs
# or
bun add clerk-solidjs
```

## Usage

Wrap your application in a `<ClerkProvider />`. With Vite, `VITE_CLERK_PUBLISHABLE_KEY` is read automatically, or pass `publishableKey` explicitly.

```tsx
// src/App.tsx
import { ClerkProvider } from 'clerk-solidjs';
import { Loading } from 'solid-js';

export default function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <Loading>
        <Home />
      </Loading>
    </ClerkProvider>
  );
}
```

Then use components and hooks anywhere below the provider:

```tsx
import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignInButton,
  UserButton,
  useAuth
} from 'clerk-solidjs';

export default function Home() {
  const { userId } = useAuth();

  return (
    <div>
      <ClerkLoading>
        <p>Loading...</p>
      </ClerkLoading>
      <ClerkLoaded>
        <Show when="signed-in">
          <UserButton />
          <p>Welcome, {userId()}</p>
        </Show>
        <Show when="signed-out">
          <SignInButton />
        </Show>
      </ClerkLoaded>
    </div>
  );
}
```

`<Show />` also gates on roles, permissions, features, and plans:

```tsx
<Show when={{ role: 'org:admin' }} fallback={<p>Admins only</p>}>
  <AdminPanel />
</Show>
```

### Custom pages

```tsx
<UserProfile>
  <UserProfile.Page label="Custom" url="custom" labelIcon={<Icon />}>
    <h1>Custom page</h1>
  </UserProfile.Page>
  <UserProfile.Link label="Home" url="/" labelIcon={<HomeIcon />} />
</UserProfile>

<UserButton>
  <UserButton.MenuItems>
    <UserButton.Action label="Help" labelIcon={<Icon />} onClick={openHelp} />
    <UserButton.Link label="Docs" href="/docs" labelIcon={<Icon />} />
  </UserButton.MenuItems>
</UserButton>
```

Custom page content renders in your component tree's context, so it can use your providers and router.

## Server rendering (Solid 2 start mode)

The `clerk-solidjs/start` and `clerk-solidjs/start/server` entry points integrate with [`@solidjs/vite-plugin` start mode](https://docs.solidjs.com/building-apps/app-structure). Set `CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` in your environment.

```ts
// vite.config.ts
import solid from '@solidjs/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    solid({
      start: { middleware: './src/middleware.ts' },
      ssr: true,
      serverFunctions: true
    })
  ]
});
```

### Middleware

```ts
// src/middleware.ts
import { clerkMiddleware } from 'clerk-solidjs/start/server';

export default [
  clerkMiddleware()
  // ... other middleware
];
```

`clerkMiddleware(options)` accepts the usual Clerk options (`secretKey`, `publishableKey`, `signInUrl`, `authorizedParties`, `organizationSyncOptions`, ...) or a callback that returns them per request.

### Provider

Import `ClerkProvider` from `clerk-solidjs/start` and render it inside your router. It renders the request's auth state on the server, hands it to the browser for hydration, and navigates with Solid Router.

```tsx
// src/App.tsx
import { ClerkProvider } from 'clerk-solidjs/start';
import { Loading } from 'solid-js';
import { Router } from './router';

export default function App() {
  return (
    <Router>
      {(props) => (
        <ClerkProvider>
          <Loading>{props.children}</Loading>
        </ClerkProvider>
      )}
    </Router>
  );
}
```

`clerk-solidjs/start` re-exports every component and hook, so import them from there in start-mode apps.

### The `auth()` Helper

With `clerkMiddleware` in place, `auth()` returns the request's auth object in server functions and API routes:

```ts
import { auth } from 'clerk-solidjs/start/server';

export async function getProjects() {
  'use server';
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) {
    throw new Error('You must be signed in');
  }
  // ...
}
```

`getRequestEvent().locals.auth` is typed as well: it is a function returning the auth object.

## Upgrading from v2

v3 is a major release:

- **Solid 2 only.** `solid-js`, `@solidjs/web`, and (for `/start`) `@solidjs/router` 2 are peer dependencies. Solid 1 and SolidStart users should stay on v2.
- **SolidStart → start mode.** `clerk-solidjs/start` targets `@solidjs/vite-plugin` start mode. `clerkMiddleware()` is now fetch-style middleware (export it from your middleware module instead of wrapping it in `createMiddleware`), and `auth()` is async.
- **Clerk Core 3.** `<SignedIn>`, `<SignedOut>`, and `<Protect>` are replaced by `<Show>`. `useSignIn()` and `useSignUp()` are the new signal-based hooks; the previous resource-based ones are available from `clerk-solidjs/legacy`. The prebuilt UI now loads `@clerk/ui` from Clerk's CDN (or pass `ui` from `@clerk/ui` to bundle it).
- **Removed** the deprecated `clerk-solidjs/server` entry point (use `clerk-solidjs/start/server`) and CommonJS builds.
- `useAuth()` now also returns `sessionStatus` and `sessionClaims`, and `has()` supports features, plans, and reverification checks.
- **Node.js `>=20.19`** (was `>=18`): Clerk Core 3 needs Node 20, and Vite 8, which start mode runs on, needs 20.19.
- **Not supported yet:** the Stripe `PaymentElement` pieces of the billing API (they need Stripe's React bindings), and portal containers (`UNSAFE_PortalProvider` / `getContainer`, a React portal feature).

## Examples

### Basic

[Basic example](/examples/basic)

## Support

You can get in touch in any of the following ways:

- Create a [GitHub Issue](https://github.com/spirit-led-software/clerk-solidjs/issues)
- Create a [GitHub Discussion](https://github.com/spirit-led-software/clerk-solidjs/discussions)

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please read [our contribution guidelines](https://github.com/spirit-led-software/clerk-solidjs/blob/master/docs/CONTRIBUTING.md).

## Security

`clerk-solidjs` follows good practices of security, but 100% security cannot be assured.

`clerk-solidjs` is provided **"as is"** without any **warranty**. Use at your own risk.

_For more information and to report security issues, please refer to our [security documentation](https://github.com/spirit-led-software/clerk-solidjs/blob/master/docs/SECURITY.md)._

## License

This project is licensed under the **MIT license**.

See [LICENSE](https://github.com/spirit-led-software/clerk-solidjs/blob/master/LICENSE) for more information.
