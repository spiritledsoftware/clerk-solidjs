---
'clerk-solidjs': major
---

Support Solid 2 and Clerk Core 3.

- Requires `solid-js` and `@solidjs/web` 2. Solid 1 and SolidStart users should stay on v2.
- `clerk-solidjs/start` now targets `@solidjs/vite-plugin` start mode: `clerkMiddleware()` is fetch-style middleware, `auth()` is async, and the SSR auth state is hydrated through Solid's hydration channel.
- Clerk Core 3 parity with `@clerk/react` 6: `<Show>` replaces `<SignedIn>`, `<SignedOut>`, and `<Protect>`; signal-based `useSignIn()`, `useSignUp()`, and `useWaitlist()` (resource-based hooks moved to `clerk-solidjs/legacy`); new components (`PricingTable`, `APIKeys`, `UserAvatar`, `OAuthConsent`, `OAuthDeviceVerification`, `Task*`, `HandleSSOCallback`, `InviteMembersButton`, `ClerkDegraded`, `ClerkFailed`, `RedirectToTasks`); new hooks (`useReverification`, `useAPIKeys`, `useOrganizationCreationDefaults`, `useOAuthConsent`, `useOAuthDeviceVerification`); billing components and hooks under `clerk-solidjs/experimental`.
- Custom pages and menu items for `UserProfile`, `OrganizationProfile`, `UserButton`, and `OrganizationSwitcher`.
- The prebuilt UI loads `@clerk/ui` (from Clerk's CDN, or bundled via the `ui` prop).
- Removed the deprecated `clerk-solidjs/server` entry point and CommonJS builds.
