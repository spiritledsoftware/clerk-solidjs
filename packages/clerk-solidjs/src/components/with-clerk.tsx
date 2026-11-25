import type { LoadedClerk, Without } from '@clerk/shared/types';
import type { JSX } from '@solidjs/web';
import { type Accessor, type Component, Show } from 'solid-js';
import { useClerkInstanceContext } from '../contexts/clerk-instance';
import { errorThrower } from '../errors/error-thrower';
import { hocChildrenNotAFunctionError } from '../errors/messages';
import { useAssertWrappedByClerkProvider } from '../hooks/use-assert-wrapped-by-clerk-provider';

type WithClerkOptions = { component: string; renderWhileLoading?: boolean };

/**
 * Wraps a component so it receives the Clerk accessor as `props.clerk` and, unless
 * `renderWhileLoading` is set, renders only once Clerk has loaded.
 */
export const withClerk = <
  P extends { clerk: Accessor<LoadedClerk>; component?: string }
>(
  Inner: Component<P>,
  displayNameOrOptions?: string | WithClerkOptions
) => {
  const options =
    typeof displayNameOrOptions === 'string' ? undefined : displayNameOrOptions;
  const displayName =
    (typeof displayNameOrOptions === 'string'
      ? displayNameOrOptions
      : displayNameOrOptions?.component) ||
    Inner.name ||
    'Component';

  return (props: Without<P, 'clerk' | 'component'>): JSX.Element => {
    useAssertWrappedByClerkProvider(displayName);
    const clerk = useClerkInstanceContext(displayName);

    return (
      <Show when={options?.renderWhileLoading || clerk().loaded}>
        <Inner {...(props as P)} component={displayName} clerk={clerk} />
      </Show>
    );
  };
};

/**
 * Render-prop form of {@link withClerk}: renders `children(clerk)` once Clerk has loaded.
 */
export const WithClerk = (props: {
  children: (clerk: Accessor<LoadedClerk>) => JSX.Element;
}): JSX.Element => {
  useAssertWrappedByClerkProvider('WithClerk');
  const clerk = useClerkInstanceContext('WithClerk');
  if (typeof props.children !== 'function') {
    errorThrower.throw(hocChildrenNotAFunctionError);
  }
  return <Show when={clerk().loaded}>{props.children(clerk)}</Show>;
};
