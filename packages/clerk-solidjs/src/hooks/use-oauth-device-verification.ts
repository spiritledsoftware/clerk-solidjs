import type { ClerkAPIResponseError } from '@clerk/shared/error';
import { ClerkRuntimeError } from '@clerk/shared/error';
import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  LookupOAuthDeviceVerificationParams,
  OAuthDeviceVerificationInfo,
  OAuthDeviceVerificationResult,
  SubmitOAuthDeviceVerificationParams
} from '@clerk/shared/types';
import { type Accessor, createSignal } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';

const HOOK_NAME = 'useOAuthDeviceVerification';
type HookError = ClerkAPIResponseError | ClerkRuntimeError;
type DecisionParams = Omit<SubmitOAuthDeviceVerificationParams, 'approved'>;
type Pending<T> = { key: string; promise: Promise<T> };

const normalizeUserCode = (userCode: string) =>
  userCode.toUpperCase().replace(/[-\p{White_Space}]/gu, '');

const createNotReadyError = () =>
  new ClerkRuntimeError(
    'Clerk must be loaded before using OAuth device verification.',
    { code: 'oauth_device_verification_not_ready' }
  );

const createLookupInProgressError = () =>
  new ClerkRuntimeError(
    'An OAuth device verification lookup is already in progress for another code.',
    { code: 'oauth_device_verification_lookup_in_progress' }
  );

const createSubmissionInProgressError = () =>
  new ClerkRuntimeError(
    'Another OAuth device verification decision is already in progress.',
    { code: 'oauth_device_verification_submission_in_progress' }
  );

export type UseOAuthDeviceVerificationReturn = {
  /** The device authorization from the latest successful lookup. */
  data: Accessor<OAuthDeviceVerificationInfo | undefined>;
  /** The result of the latest approval or denial. */
  result: Accessor<OAuthDeviceVerificationResult | undefined>;
  /**
   * The latest lookup or submission error. Preflight rejections (Clerk not loaded, or a
   * conflicting request in progress) only reject the returned promise.
   */
  error: Accessor<HookError | null>;
  /** `true` while a lookup is in progress. */
  isLoading: Accessor<boolean>;
  /** `true` while an approval or denial is in progress. */
  isSubmitting: Accessor<boolean>;
  lookup: (
    params: LookupOAuthDeviceVerificationParams
  ) => Promise<OAuthDeviceVerificationInfo>;
  approve: (params: DecisionParams) => Promise<OAuthDeviceVerificationResult>;
  deny: (
    params: LookupOAuthDeviceVerificationParams
  ) => Promise<OAuthDeviceVerificationResult>;
  /** Clears the state; results of requests already in flight are discarded. */
  reset: () => void;
};

/**
 * State and actions for a custom OAuth device verification flow: look up a device
 * authorization by user code, then approve or deny it.
 *
 * @example
 * ```tsx
 * const { data, isLoading, lookup, approve } = useOAuthDeviceVerification();
 *
 * return (
 *   <>
 *     <button disabled={isLoading()} onClick={() => lookup({ userCode: code() })}>
 *       Verify code
 *     </button>
 *     <Show when={data()}>
 *       {(info) => <p>Authorize {info().oauthApplicationName}?</p>}
 *     </Show>
 *   </>
 * );
 * ```
 */
export function useOAuthDeviceVerification(): UseOAuthDeviceVerificationReturn {
  useAssertWrappedByClerkProvider(HOOK_NAME);
  const { clerk } = useClerkContext(HOOK_NAME);

  const [data, setData] = createSignal<OAuthDeviceVerificationInfo>();
  const [result, setResult] = createSignal<OAuthDeviceVerificationResult>();
  const [error, setError] = createSignal<HookError | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  let pendingLookup: Pending<OAuthDeviceVerificationInfo> | null = null;
  let pendingSubmit: Pending<OAuthDeviceVerificationResult> | null = null;
  // Bumped by reset(); requests from an earlier generation do not write state.
  let generation = 0;

  clerk.telemetry?.record(eventMethodCalled(HOOK_NAME));

  const oauthApplication = () =>
    clerk.loaded ? clerk.oauthApplication : undefined;

  const lookup = (params: LookupOAuthDeviceVerificationParams) => {
    const app = oauthApplication();
    if (!app) {
      return Promise.reject(createNotReadyError());
    }

    const key = normalizeUserCode(params.userCode);
    if (pendingLookup) {
      if (pendingLookup.key === key) {
        return pendingLookup.promise;
      }
      return Promise.reject(createLookupInProgressError());
    }

    const requestGeneration = generation;
    setError(null);
    setData(undefined);
    setResult(undefined);
    setIsLoading(true);

    const request: Promise<OAuthDeviceVerificationInfo> = app
      .lookupDeviceVerification({ ...params, userCode: key })
      .then((info) => {
        if (generation === requestGeneration) setData(() => info);
        return info;
      })
      .catch((err: HookError) => {
        if (generation === requestGeneration) setError(() => err);
        throw err;
      })
      .finally(() => {
        if (pendingLookup?.promise === request) pendingLookup = null;
        if (generation === requestGeneration) setIsLoading(false);
      });

    pendingLookup = { key, promise: request };
    return request;
  };

  const submit = (params: DecisionParams, approved: boolean) => {
    const app = oauthApplication();
    if (!app) {
      return Promise.reject(createNotReadyError());
    }

    const userCode = normalizeUserCode(params.userCode);
    const key = JSON.stringify([
      userCode,
      params.organizationId ?? null,
      approved
    ]);
    if (pendingSubmit) {
      if (pendingSubmit.key === key) {
        return pendingSubmit.promise;
      }
      return Promise.reject(createSubmissionInProgressError());
    }

    const requestGeneration = generation;
    setError(null);
    setIsSubmitting(true);

    const request: Promise<OAuthDeviceVerificationResult> = app
      .submitDeviceVerification({ ...params, userCode, approved })
      .then((decision) => {
        if (generation === requestGeneration) setResult(() => decision);
        return decision;
      })
      .catch((err: HookError) => {
        if (generation === requestGeneration) setError(() => err);
        throw err;
      })
      .finally(() => {
        if (pendingSubmit?.promise === request) pendingSubmit = null;
        if (generation === requestGeneration) setIsSubmitting(false);
      });

    pendingSubmit = { key, promise: request };
    return request;
  };

  return {
    data,
    result,
    error,
    isLoading,
    isSubmitting,
    lookup,
    approve: (params) => submit(params, true),
    deny: (params) => submit(params, false),
    reset: () => {
      generation += 1;
      pendingLookup = null;
      setData(undefined);
      setResult(undefined);
      setError(null);
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };
}
