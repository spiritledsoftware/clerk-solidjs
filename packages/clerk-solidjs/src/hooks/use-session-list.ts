import { eventMethodCalled } from '@clerk/shared/telemetry';
import type { SessionResource, SetActive } from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import { useClientBase } from './base';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';

export type UseSessionListReturn = {
  isLoaded: Accessor<boolean>;
  sessions: Accessor<SessionResource[] | undefined>;
  setActive: SetActive;
};

/**
 * Access the sessions on the current client and switch between them.
 */
export const useSessionList = (): UseSessionListReturn => {
  useAssertWrappedByClerkProvider('useSessionList');

  const { clerk } = useClerkContext('useSessionList');
  const client = useClientBase();

  clerk.telemetry?.record(eventMethodCalled('useSessionList'));

  return {
    isLoaded: createMemo(() => !!client()),
    sessions: createMemo(() => client()?.sessions),
    setActive: (params) => clerk.setActive(params) as Promise<void>
  };
};
