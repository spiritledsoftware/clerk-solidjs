import { eventMethodCalled } from '@clerk/shared/telemetry';
import type { SetActive, SignInResource } from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../../contexts/clerk-instance';
import { useClientBase } from '../base';
import { useAssertWrappedByClerkProvider } from '../use-assert-wrapped-by-clerk-provider';

export type UseSignInReturn = {
  isLoaded: Accessor<boolean>;
  signIn: Accessor<SignInResource | undefined>;
  setActive: SetActive;
};

/**
 * The resource-based `useSignIn()` hook from Clerk Core 2.
 *
 * @deprecated Use the signal-based `useSignIn()` from `clerk-solidjs` instead.
 */
export const useSignIn = (): UseSignInReturn => {
  useAssertWrappedByClerkProvider('useSignIn');

  const { clerk } = useClerkContext('useSignIn');
  const client = useClientBase();

  clerk.telemetry?.record(eventMethodCalled('useSignIn'));

  return {
    isLoaded: createMemo(() => !!client()),
    signIn: createMemo(() => client()?.signIn),
    setActive: (params) => clerk.setActive(params) as Promise<void>
  };
};
