import { useUser } from "clerk-solidjs/start";
import { createMemo, Loading, Show } from "solid-js";

import { getViewer } from "../server/viewer";

export default function ProtectedPage() {
  // Runs on the server during SSR; the browser adopts the serialized result.
  const viewer = createMemo(() => getViewer());
  const { user } = useUser();

  return (
    <main class="flex flex-col w-screen h-screen items-center justify-center gap-2">
      <Loading fallback={<p>Checking your session...</p>}>
        <Show
          when={viewer()}
          fallback={<p>You are not signed in (checked on the server).</p>}
        >
          {(v) => (
            <>
              <p>Welcome, {user()?.fullName ?? v().email ?? v().userId}</p>
              <p class="text-sm text-slate-500">Server user id: {v().userId}</p>
            </>
          )}
        </Show>
      </Loading>
      <a href="/" class="bg-slate-200 rounded-md px-3 py-1">
        Back
      </a>
    </main>
  );
}
