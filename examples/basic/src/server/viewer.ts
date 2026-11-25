"use server";

import { auth, clerkClient } from "clerk-solidjs/start/server";

/**
 * Server function: the caller's identity comes from the request (via
 * clerkMiddleware), never from an argument.
 */
export async function getViewer() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) {
    return null;
  }
  const user = await clerkClient().users.getUser(userId);
  return {
    userId,
    email: user.primaryEmailAddress?.emailAddress ?? null,
  };
}
