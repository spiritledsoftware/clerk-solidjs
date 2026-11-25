import { isPublishableKey } from '@clerk/shared/keys';
import type { ClerkStatus, IsomorphicClerkOptions } from '@clerk/shared/types';
import type { JSX } from '@solidjs/web';
import {
  createEffect,
  createMemo,
  createSignal,
  omit,
  onSettled,
  untrack,
  useContext
} from 'solid-js';
import { errorThrower } from '../errors/error-thrower';
import { multipleClerkProvidersError } from '../errors/messages';
import { IsomorphicClerk } from '../isomorphic-clerk';
import type { ClerkProviderProps, Ui } from '../types';
import { mergeWithEnv } from '../utils/env-variables';
import { ClerkContext, type ClerkContextValue } from './clerk-instance';

function assertValidPublishableKey(
  options: IsomorphicClerkOptions & {
    __internal_bypassMissingPublishableKey?: boolean;
  }
) {
  if (options.Clerk || options.__internal_bypassMissingPublishableKey) {
    return;
  }
  if (!options.publishableKey) {
    errorThrower.throwMissingPublishableKeyError();
  } else if (!isPublishableKey(options.publishableKey)) {
    errorThrower.throwInvalidPublishableKeyError({
      key: options.publishableKey
    });
  }
}

function ClerkProviderBase<TUi extends Ui>(
  props: ClerkProviderProps<TUi>
): JSX.Element {
  const options = createMemo(
    () =>
      mergeWithEnv({
        ...omit(props, 'initialState', 'children')
      } as unknown as IsomorphicClerkOptions) as IsomorphicClerkOptions & {
        __internal_bypassMissingPublishableKey?: boolean;
      }
  );

  // One Clerk instance per provider, created from the options it mounts with
  // (the instance itself handles a changed publishable key on the client).
  const initialOptions = untrack(options);
  assertValidPublishableKey(initialOptions);
  const clerk = IsomorphicClerk.getOrCreateInstance(initialOptions);

  const [status, setStatus] = createSignal<ClerkStatus>(clerk.status);
  // Bumped on every resource emission; Clerk mutates in place, so equality is off.
  const [emitted, notifyEmitted] = createSignal(undefined, { equals: false });

  const resources = createMemo(
    () => {
      status();
      emitted();
      return clerk.loaded ? clerk.__internal_lastEmittedResources : undefined;
    },
    { equals: false }
  );

  onSettled(() => {
    const onStatus = (next: ClerkStatus) => setStatus(next);
    clerk.on('status', onStatus);
    const unsubscribe = clerk.addListener(() => notifyEmitted(), {
      skipInitialEmit: true
    });
    // Catch up on anything that happened before the listeners were attached.
    setStatus(clerk.status);
    notifyEmitted();

    return () => {
      unsubscribe();
      clerk.off('status', onStatus);
      IsomorphicClerk.clearInstance();
    };
  });

  const appearance = createMemo(() => options().appearance);
  createEffect(
    () => appearance(),
    (value) => {
      void clerk.__internal_updateProps({ appearance: value });
    },
    { defer: true }
  );

  const localization = createMemo(() => options().localization);
  // As upstream: a localization change pushes the current options; other
  // option changes take effect on the next mount.
  createEffect(
    () => localization(),
    () => {
      void clerk.__internal_updateProps({ options: untrack(options) });
    },
    { defer: true }
  );

  const value: ClerkContextValue = {
    clerk,
    status,
    resources,
    initialState: () => props.initialState
  };

  return <ClerkContext value={value}>{props.children}</ClerkContext>;
}

/**
 * The root Clerk provider. Wrap your application in a single `<ClerkProvider>`.
 *
 * If you use server rendering, import `ClerkProvider` from `clerk-solidjs/start` instead.
 */
export function ClerkProvider<TUi extends Ui = Ui>(
  props: ClerkProviderProps<TUi>
): JSX.Element {
  if (useContext(ClerkContext)) {
    errorThrower.throw(multipleClerkProvidersError);
  }
  return <ClerkProviderBase {...props} />;
}
