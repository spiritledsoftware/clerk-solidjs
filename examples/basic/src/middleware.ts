import { clerkMiddleware } from "clerk-solidjs/start/server";

// Reads CLERK_SECRET_KEY and VITE_CLERK_PUBLISHABLE_KEY from the environment.
// Pass options (or a per-request callback) to override them.
export default [clerkMiddleware()];
