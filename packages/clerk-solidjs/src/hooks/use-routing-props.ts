import type { RoutingOptions } from '@clerk/shared/types';
import { errorThrower } from '../errors/error-thrower';
import {
  incompatibleRoutingWithPathProvidedError,
  noPathProvidedError
} from '../errors/messages';

/**
 * Resolves a component's routing props: `path` routing (the default) needs a
 * `path`, and other routing strategies must not set one.
 *
 * @internal
 */
export function useRoutingProps<T extends RoutingOptions>(
  componentName: string,
  props: T,
  routingOptions?: RoutingOptions
): T {
  const path = props.path || routingOptions?.path;
  const routing = props.routing || routingOptions?.routing || 'path';

  if (routing === 'path') {
    if (!path) {
      return errorThrower.throw(noPathProvidedError(componentName));
    }

    return {
      ...routingOptions,
      ...props,
      routing: 'path'
    };
  }

  if (props.path) {
    return errorThrower.throw(
      incompatibleRoutingWithPathProvidedError(componentName)
    );
  }

  return {
    ...routingOptions,
    ...props,
    path: undefined
  };
}
