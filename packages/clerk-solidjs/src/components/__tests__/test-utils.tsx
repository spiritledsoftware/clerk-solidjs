import type { ClerkStatus, Resources } from '@clerk/shared/types';
import type { JSX } from '@solidjs/web';
import { createSignal, flush, untrack } from 'solid-js';
import { vi } from 'vitest';
import { ClerkContext } from '../../contexts/clerk-instance';

/**
 * A `ClerkContext` backed by signals the test drives, around a plain fake Clerk object.
 * Use `setStatus` / `setResources` then `flush()` to move Clerk through its lifecycle.
 */
export const createTestClerk = (
  clerkOverrides: Record<string, unknown> = {}
) => {
  const [status, setStatus] = createSignal<ClerkStatus>('loading');
  const [resources, setResources] = createSignal<Resources | undefined>(
    undefined,
    { equals: false }
  );

  const clerk: Record<string, any> = {
    telemetry: undefined,
    on: vi.fn(),
    off: vi.fn(),
    addListener: vi.fn(() => () => {}),
    __internal_updateProps: vi.fn(),
    ...clerkOverrides
  };
  // Like the real instance, the fake is not reactive itself: the context accessors are.
  const peek = <T,>(read: () => T) => untrack(read);
  Object.defineProperties(clerk, {
    status: { get: () => peek(status) },
    loaded: {
      get: () => peek(() => status() === 'ready' || status() === 'degraded')
    },
    client: { get: () => peek(() => resources()?.client) },
    session: { get: () => peek(() => resources()?.session) },
    user: { get: () => peek(() => resources()?.user) },
    organization: { get: () => peek(() => resources()?.organization) }
  });

  const Provider = (props: { children: JSX.Element }) => (
    <ClerkContext
      value={{
        clerk: clerk as any,
        status,
        resources,
        initialState: () => undefined
      }}
    >
      {props.children}
    </ClerkContext>
  );

  /** Loads Clerk with `next` as its resources, and flushes. */
  const load = (next: Resources) => {
    setResources(next);
    setStatus('ready');
    flush();
  };

  return { clerk, Provider, setStatus, setResources, load };
};

type SignedInOptions = {
  userId?: string;
  sessionId?: string;
  sessionStatus?: 'active' | 'pending';
  org?: { id: string; role: string; permissions: string[] };
};

export const signedInResources = ({
  userId = 'user_1',
  sessionId = 'sess_1',
  sessionStatus = 'active',
  org
}: SignedInOptions = {}): Resources => {
  const user = {
    id: userId,
    organizationMemberships: org
      ? [
          {
            organization: { id: org.id },
            role: org.role,
            permissions: org.permissions
          }
        ]
      : []
  };
  return {
    client: { sessions: [], signedInSessions: [{ id: sessionId }] },
    session: {
      id: sessionId,
      status: sessionStatus,
      user,
      lastActiveToken: { jwt: { claims: {} } },
      factorVerificationAge: null
    },
    user,
    organization: org ? { id: org.id, slug: org.id } : null
  } as unknown as Resources;
};

export const signedOutResources = (): Resources =>
  ({
    client: { sessions: [], signedInSessions: [] },
    session: null,
    user: null,
    organization: null
  }) as unknown as Resources;
