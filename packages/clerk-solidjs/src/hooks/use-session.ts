import { eventMethodCalled } from '@clerk/shared/telemetry';
import type { SignedInSessionResource } from '@clerk/shared/types';
import type { Accessor } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import { useSessionBase } from './base';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';

export type UseSessionReturn = {
  isLoaded: Accessor<boolean>;
  isSignedIn: Accessor<boolean | undefined>;
  session: Accessor<SignedInSessionResource | null | undefined>;
};

/**
 * Access the current user's `Session` object.
 */
export const useSession = (): UseSessionReturn => {
  useAssertWrappedByClerkProvider('useSession');

  const { clerk } = useClerkContext('useSession');
  const session = useSessionBase();

  clerk.telemetry?.record(eventMethodCalled('useSession'));

  return {
    isLoaded: () => session() !== undefined,
    isSignedIn: () => {
      const value = session();
      if (value === undefined) return undefined;
      if (value === null) return false;
      return clerk.isSignedIn;
    },
    session
  };
};
