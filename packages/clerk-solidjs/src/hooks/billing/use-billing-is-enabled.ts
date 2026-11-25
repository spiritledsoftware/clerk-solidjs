import type { EnvironmentResource, ForPayerType } from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../../contexts/clerk-instance';
import { useOrganizationBase, useUserBase } from '../base';

/**
 * Whether billing requests should run: billing is enabled for the payer type, the hook
 * is enabled, Clerk is loaded, and (when authenticated) a user (and organization) exist.
 *
 * @internal
 */
export function useBillingIsEnabled(
  params?: Accessor<
    | { for?: ForPayerType; enabled?: boolean; authenticated?: boolean }
    | undefined
  >
): Accessor<boolean> {
  const ctx = useClerkContext();
  const user = useUserBase();
  const organization = useOrganizationBase();

  return createMemo(() => {
    ctx.status();
    const p = params?.();
    const clerk = ctx.clerk;
    if (!clerk.loaded || !(p?.enabled ?? true)) return false;

    const environment = (clerk as any).__internal_environment as
      | EnvironmentResource
      | null
      | undefined;
    const userBillingEnabled =
      environment?.commerceSettings?.billing?.user?.enabled;
    const orgBillingEnabled =
      environment?.commerceSettings?.billing?.organization?.enabled;

    const billingEnabled =
      p?.for === 'organization'
        ? orgBillingEnabled
        : p?.for === 'user'
          ? userBillingEnabled
          : userBillingEnabled || orgBillingEnabled;

    const isOrganization = p?.for === 'organization';
    const hasRequiredIdentity =
      (p?.authenticated ?? true)
        ? (isOrganization ? !!organization()?.id : true) && !!user()?.id
        : true;

    return !!billingEnabled && hasRequiredIdentity;
  });
}
