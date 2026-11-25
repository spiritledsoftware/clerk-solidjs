import { type Accessor, createEffect, createMemo } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';

/**
 * Asks Clerk (in development) to prompt for enabling Organizations, once per hook
 * instance, as soon as Clerk is loaded and `enabled` is true.
 *
 * @internal
 */
export function useAttemptToEnableOrganizations(
  caller: 'useOrganization' | 'useOrganizationList',
  enabled: Accessor<boolean> = () => true
): void {
  const ctx = useClerkContext(caller);
  let attempted = false;

  const ready = createMemo(() => {
    ctx.status();
    return enabled() && ctx.clerk.loaded;
  });

  createEffect(
    () => ready(),
    (isReady) => {
      if (!isReady || attempted) return;
      attempted = true;
      ctx.clerk.__internal_attemptToEnableEnvironmentSetting?.({
        for: 'organizations',
        caller
      });
    }
  );
}
