import { eventMethodCalled } from '@clerk/shared/telemetry';
import type { UserResource } from '@clerk/shared/types';
import type { Accessor } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import { useUserBase } from './base';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';

export type UseUserReturn = {
  isLoaded: Accessor<boolean>;
  isSignedIn: Accessor<boolean | undefined>;
  user: Accessor<UserResource | null | undefined>;
};

/**
 * Access the current user's `User` object.
 *
 * `user()` is `undefined` while Clerk loads and `null` when no one is signed in.
 */
export function useUser(): UseUserReturn {
  useAssertWrappedByClerkProvider('useUser');

  const { clerk } = useClerkContext('useUser');
  const user = useUserBase();

  clerk.telemetry?.record(eventMethodCalled('useUser'));

  return {
    isLoaded: () => user() !== undefined,
    isSignedIn: () => {
      const value = user();
      return value === undefined ? undefined : value !== null;
    },
    user
  };
}
