import { validateReverificationConfig } from '@clerk/shared/authorization';
import {
  isReverificationHint,
  reverificationError
} from '@clerk/shared/authorization-errors';
import {
  ClerkRuntimeError,
  isClerkAPIResponseError
} from '@clerk/shared/error';
import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  ReverificationResult,
  SessionVerificationLevel
} from '@clerk/shared/types';
import { createDeferredPromise } from '@clerk/shared/utils';
import { useClerkContext } from '../contexts/clerk-instance';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';

const CLERK_API_REVERIFICATION_ERROR_CODE = 'session_reverification_required';

async function resolveResult<T>(
  result: Promise<T> | T
): Promise<T | ReturnType<typeof reverificationError>> {
  try {
    const r = await result;
    if (r instanceof Response) {
      return r.json();
    }
    return r;
  } catch (e) {
    // Treat FAPI assurance errors as a reverification hint.
    if (
      isClerkAPIResponseError(e) &&
      e.errors.find(({ code }) => code === CLERK_API_REVERIFICATION_ERROR_CODE)
    ) {
      return reverificationError();
    }
    throw e;
  }
}

type ExcludeClerkError<T> = T extends { clerk_error: any } ? never : T;

/**
 * @interface
 */
export type NeedsReverificationParameters = {
  /**
   * Marks the reverification process as cancelled and rejects the original request.
   */
  cancel: () => void;
  /**
   * Marks the reverification process as complete and retries the original request.
   */
  complete: (result?: ReverificationResult) => void;
  /**
   * The verification level required for the reverification process.
   */
  level: SessionVerificationLevel | undefined;
};

/**
 * @interface
 */
export type UseReverificationOptions = {
  /**
   * Handler for the reverification process. Opts out of the default UI, to build a custom one.
   */
  onNeedsReverification?: (properties: NeedsReverificationParameters) => void;
  /**
   * When `true`, the fetcher's first argument is a `ReverificationResult` (`undefined` on
   * the first call), and the returned function takes the remaining arguments.
   */
  passReverificationResult?: true;
};

type UseReverificationResult<
  Fetcher extends (...args: any[]) => Promise<any> | undefined,
  Args extends any[] = Parameters<Fetcher>
> = (...args: Args) => Promise<ExcludeClerkError<Awaited<ReturnType<Fetcher>>>>;

type UseReverification = <
  Fetcher extends (...args: any[]) => Promise<any> | undefined,
  Options extends UseReverificationOptions = UseReverificationOptions
>(
  fetcher: Fetcher,
  options?: Options
) => Options extends { passReverificationResult: true }
  ? UseReverificationResult<
      Fetcher,
      Parameters<Fetcher> extends [any?, ...infer Rest]
        ? Rest
        : Parameters<Fetcher>
    >
  : UseReverificationResult<Fetcher>;

/**
 * Wrap a request that may need the user to reverify. When the request answers with a
 * reverification hint (or a `session_reverification_required` API error), Clerk's
 * reverification modal opens (or `onNeedsReverification` is called) and the request is
 * retried once the user has reverified. Cancelling rejects with a
 * `reverification_cancelled` error (see `isReverificationCancelledError`).
 *
 * The fetcher and options are plain values: read accessors inside the fetcher to use
 * reactive state at call time.
 *
 * @example
 * ```tsx
 * const fetchBalance = useReverification(() =>
 *   fetch('/api/balance').then((r) => r.json() as Promise<{ balance: number }>)
 * );
 *
 * const onClick = async () => {
 *   try {
 *     const { balance } = await fetchBalance();
 *   } catch (err) {
 *     if (isReverificationCancelledError(err)) {
 *       // The user closed the modal.
 *     }
 *   }
 * };
 * ```
 */
export const useReverification: UseReverification = (fetcher, options) => {
  useAssertWrappedByClerkProvider('useReverification');
  const { clerk } = useClerkContext('useReverification');

  clerk.telemetry?.record(
    eventMethodCalled('useReverification', {
      onNeedsReverification: Boolean(options?.onNeedsReverification),
      passReverificationResult: Boolean(options?.passReverificationResult)
    })
  );

  const callFetcher = (
    reverification: ReverificationResult | undefined,
    args: unknown[]
  ) =>
    options?.passReverificationResult
      ? fetcher(reverification, ...args)
      : fetcher(...args);

  return (async (...args: unknown[]) => {
    let result = await resolveResult(callFetcher(undefined, args));

    if (isReverificationHint(result)) {
      const resolvers = createDeferredPromise();
      const isValidMetadata = validateReverificationConfig(
        result.clerk_error.metadata?.reverification
      );
      const level = isValidMetadata ? isValidMetadata().level : undefined;

      const cancel = () => {
        resolvers.reject(
          new ClerkRuntimeError('User cancelled attempted verification', {
            code: 'reverification_cancelled'
          })
        );
      };
      const complete = (reverificationResult?: ReverificationResult) => {
        resolvers.resolve(reverificationResult);
      };

      if (options?.onNeedsReverification === undefined) {
        clerk.__internal_openReverification?.({
          level,
          afterVerification: complete,
          afterVerificationCancelled: cancel
        });
      } else {
        options.onNeedsReverification({ cancel, complete, level });
      }

      const reverificationResult = (await resolvers.promise) as
        | ReverificationResult
        | undefined;

      // Retry the original request once.
      result = await resolveResult(callFetcher(reverificationResult, args));
    }

    return result;
  }) as ReturnType<UseReverification>;
};
