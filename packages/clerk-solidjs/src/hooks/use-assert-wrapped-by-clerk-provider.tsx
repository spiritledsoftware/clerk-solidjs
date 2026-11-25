import { useContext } from 'solid-js';
import { ClerkContext } from '../contexts/clerk-instance';
import { errorThrower } from '../errors/error-thrower';

export function useAssertWrappedByClerkProvider(source: string): void {
  if (!useContext(ClerkContext)) {
    errorThrower.throwMissingClerkProviderError({ source });
  }
}
