import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  SignInErrors,
  SignInFutureResource,
  SignInSignalValue,
  SignUpErrors,
  SignUpFutureResource,
  SignUpSignalValue,
  State,
  WaitlistErrors,
  WaitlistResource,
  WaitlistSignalValue
} from '@clerk/shared/types';
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal
} from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';

type SignalName = 'signIn' | 'signUp' | 'waitlist';
type SignalValues = {
  signIn: SignInSignalValue;
  signUp: SignUpSignalValue;
  waitlist: WaitlistSignalValue;
};

const readSignal = <S extends SignalName>(
  state: State,
  signal: S
): SignalValues[S] => {
  switch (signal) {
    case 'signIn':
      return state.signInSignal() as SignalValues[S];
    case 'signUp':
      return state.signUpSignal() as SignalValues[S];
    case 'waitlist':
      return state.waitlistSignal() as SignalValues[S];
    default:
      throw new Error(`Unknown signal: ${signal as string}`);
  }
};

/**
 * Bridges one of Clerk's signals (`clerk.__internal_state`, backed by alien-signals) into
 * a Solid accessor: an alien effect bumps a Solid signal on every emission, and the
 * accessor re-reads Clerk's signal. Before Clerk loads, `__internal_state` is the
 * `StateProxy`, whose values gate on Clerk being loaded; the subscription is re-made
 * once it loads.
 *
 * @internal
 */
export function useClerkSignal<S extends SignalName>(
  signal: S
): Accessor<SignalValues[S]> {
  useAssertWrappedByClerkProvider('useClerkSignal');

  const ctx = useClerkContext('useClerkSignal');
  const { clerk } = ctx;

  const telemetryName =
    signal === 'signIn'
      ? 'useSignIn'
      : signal === 'signUp'
        ? 'useSignUp'
        : 'useWaitlist';
  clerk.telemetry?.record(
    eventMethodCalled(telemetryName, { apiVersion: '2025-11' })
  );

  const loaded = createMemo(() => {
    ctx.status();
    return clerk.loaded;
  });

  // Clerk's signal values may be the same object across emissions; never compare.
  const [version, bump] = createSignal(undefined, { equals: false });

  createEffect(
    () => loaded(),
    (isLoaded) => {
      if (!isLoaded) return;
      return clerk.__internal_state.__internal_effect(() => {
        readSignal(clerk.__internal_state, signal);
        bump();
      });
    }
  );

  return createMemo(
    () => {
      version();
      loaded();
      return readSignal(clerk.__internal_state, signal);
    },
    { equals: false }
  );
}

export type UseSignInReturn = {
  /** The signal-based `SignIn` resource. Methods are safe to call before Clerk loads. */
  signIn: Accessor<SignInFutureResource>;
  /** Errors from the last request, by field. */
  errors: Accessor<SignInErrors>;
  /** `'fetching'` while a request is in flight. */
  fetchStatus: Accessor<'idle' | 'fetching'>;
};

export type UseSignUpReturn = {
  /** The signal-based `SignUp` resource. Methods are safe to call before Clerk loads. */
  signUp: Accessor<SignUpFutureResource>;
  errors: Accessor<SignUpErrors>;
  fetchStatus: Accessor<'idle' | 'fetching'>;
};

export type UseWaitlistReturn = {
  /** The signal-based `Waitlist` resource. */
  waitlist: Accessor<WaitlistResource>;
  errors: Accessor<WaitlistErrors>;
  fetchStatus: Accessor<'idle' | 'fetching'>;
};

/**
 * Access the signal-based `SignIn` resource, its errors, and fetch status.
 *
 * @example
 * ```tsx
 * const { signIn, errors, fetchStatus } = useSignIn();
 *
 * const submit = async (identifier: string, password: string) => {
 *   await signIn().password({ identifier, password });
 *   if (signIn().status === 'complete') await signIn().finalize();
 * };
 *
 * return <p>{errors().fields.identifier?.message}</p>;
 * ```
 */
export function useSignIn(): UseSignInReturn {
  const value = useClerkSignal('signIn');
  return {
    signIn: () => value().signIn,
    errors: () => value().errors,
    fetchStatus: () => value().fetchStatus
  };
}

/**
 * Access the signal-based `SignUp` resource, its errors, and fetch status.
 */
export function useSignUp(): UseSignUpReturn {
  const value = useClerkSignal('signUp');
  return {
    signUp: () => value().signUp,
    errors: () => value().errors,
    fetchStatus: () => value().fetchStatus
  };
}

/**
 * Access the signal-based `Waitlist` resource, its errors, and fetch status.
 */
export function useWaitlist(): UseWaitlistReturn {
  const value = useClerkSignal('waitlist');
  return {
    waitlist: () => value().waitlist,
    errors: () => value().errors,
    fetchStatus: () => value().fetchStatus
  };
}
