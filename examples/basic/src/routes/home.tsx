import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignInButton,
  SignOutButton,
  UserButton,
} from "clerk-solidjs/start";

export default function Home() {
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
          <SignInButton class="bg-slate-200 rounded-md px-3 py-1" />
        </Show>
        <Show when="signed-in">
          <UserButton showName />
          <SignOutButton class="bg-slate-200 rounded-md px-3 py-1" />
        </Show>
      </ClerkLoaded>
      <a href="/protected" class="bg-slate-200 rounded-md px-3 py-1">
        Protected Page
      </a>
      <a href="/waitlist" class="bg-slate-200 rounded-md px-3 py-1">
        Waitlist
      </a>
    </main>
  );
}
