import { eventMethodCalled } from '@clerk/shared/telemetry';
import type { SetActive, SignUpResource } from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../../contexts/clerk-instance';
import { useClientBase } from '../base';
import { useAssertWrappedByClerkProvider } from '../use-assert-wrapped-by-clerk-provider';

export type UseSignUpReturn = {
  isLoaded: Accessor<boolean>;
  signUp: Accessor<SignUpResource | undefined>;
  setActive: SetActive;
};

/**
 * The resource-based `useSignUp()` hook from Clerk Core 2.
 *
 * @deprecated Use the signal-based `useSignUp()` from `clerk-solidjs` instead.
 */
export const useSignUp = (): UseSignUpReturn => {
  useAssertWrappedByClerkProvider('useSignUp');

  const { clerk } = useClerkContext('useSignUp');
  const client = useClientBase();

  clerk.telemetry?.record(eventMethodCalled('useSignUp'));

  return {
    isLoaded: createMemo(() => !!client()),
    signUp: createMemo(() => client()?.signUp),
    setActive: (params) => clerk.setActive(params) as Promise<void>
  };
};
