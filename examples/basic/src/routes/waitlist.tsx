import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignOutButton,
  UserButton,
  Waitlist,
} from "clerk-solidjs/start";

export default function WaitlistPage() {
  return (
    <main class="flex flex-col w-screen h-screen items-center justify-center gap-2">
      <h1 class="text-3xl font-bold mb-5 font-mono bg-slate-300 rounded-md p-1">
        clerk-solidjs
      </h1>
      <ClerkLoading>
        <p>Loading...</p>
      </ClerkLoading>
      <ClerkLoaded>
        <Show when="signed-out">
          <Waitlist />
        </Show>
        <Show when="signed-in">
          <UserButton showName />
          <SignOutButton class="bg-slate-200 rounded-md px-3 py-1" />
        </Show>
      </ClerkLoaded>
      <a href="/" class="bg-slate-200 rounded-md px-3 py-1">
        Back
      </a>
    </main>
  );
}
