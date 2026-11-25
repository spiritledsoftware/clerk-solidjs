import type { LoadedClerk } from '@clerk/shared/types';
import type { Accessor } from 'solid-js';
import { useClerkInstanceContext } from '../contexts/clerk-instance';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';

/**
 * Access the `Clerk` object. Reading the accessor tracks Clerk's load status and
 * resources, so values such as `clerk().user` stay current.
 */
export const useClerk = (): Accessor<LoadedClerk> => {
  useAssertWrappedByClerkProvider('useClerk');
  return useClerkInstanceContext('useClerk');
};
