import { ClientResource } from '@clerk/shared/types';
import { Accessor } from 'solid-js';
import { createContextProviderAndHook } from '../utils/create-context-provider-and-hook';

export const [ClientContextProvider, useClientContext] =
  createContextProviderAndHook(
    'ClientProvider',
    (props: { client: Accessor<ClientResource | null | undefined> }) => {
      return props.client;
    }
  );
