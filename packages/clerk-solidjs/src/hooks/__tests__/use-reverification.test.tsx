import { reverificationError } from '@clerk/shared/authorization-errors';
import {
  ClerkAPIResponseError,
  isReverificationCancelledError
} from '@clerk/shared/error';
import { cleanup } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReverification } from '../use-reverification';
import { createTestClerk } from './test-utils';

const hint = () =>
  reverificationError({
    level: 'second_factor',
    afterMinutes: 10
  } as any);

describe('useReverification', () => {
  afterEach(() => cleanup());

  it('passes through results that need no reverification', async () => {
    const open = vi.fn();
    const t = createTestClerk({ __internal_openReverification: open });
    const fetcher = vi.fn(async (a: number, b: number) => a + b);
    const enhanced = t.renderHook(() => useReverification(fetcher));

    await expect(enhanced(1, 2)).resolves.toBe(3);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it('opens the reverification modal and retries after completion', async () => {
    const open = vi.fn((props: any) => props.afterVerification());
    const t = createTestClerk({ __internal_openReverification: open });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(hint())
      .mockResolvedValueOnce({ ok: true });
    const enhanced = t.renderHook(() => useReverification(fetcher));

    await expect(enhanced('arg')).resolves.toEqual({ ok: true });
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'second_factor' })
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith('arg');
  });

  it('treats a session_reverification_required API error as a hint', async () => {
    const open = vi.fn((props: any) => props.afterVerification());
    const t = createTestClerk({ __internal_openReverification: open });
    const apiError = new ClerkAPIResponseError('reverify', {
      data: [
        {
          code: 'session_reverification_required',
          message: 'reverify',
          long_message: 'reverify'
        }
      ],
      status: 403
    });
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(apiError)
      .mockResolvedValueOnce('done');
    const enhanced = t.renderHook(() => useReverification(fetcher));

    await expect(enhanced()).resolves.toBe('done');
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('rejects with a cancellation error when the user cancels', async () => {
    const open = vi.fn((props: any) => props.afterVerificationCancelled());
    const t = createTestClerk({ __internal_openReverification: open });
    const fetcher = vi.fn().mockResolvedValue(hint());
    const enhanced = t.renderHook(() => useReverification(fetcher));

    const error = await enhanced().catch((e: unknown) => e);
    expect(isReverificationCancelledError(error)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('uses onNeedsReverification instead of the modal', async () => {
    const open = vi.fn();
    const t = createTestClerk({ __internal_openReverification: open });
    const onNeedsReverification = vi.fn(({ complete }) => complete());
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(hint())
      .mockResolvedValueOnce('ok');
    const enhanced = t.renderHook(() =>
      useReverification(fetcher, { onNeedsReverification })
    );

    await expect(enhanced()).resolves.toBe('ok');
    expect(open).not.toHaveBeenCalled();
    expect(onNeedsReverification).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'second_factor' })
    );
  });

  it('passes the reverification result when asked to', async () => {
    const result = { passwordReset: true } as any;
    const t = createTestClerk({
      __internal_openReverification: (props: any) =>
        props.afterVerification(result)
    });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(hint())
      .mockResolvedValueOnce('reloaded');
    const enhanced = t.renderHook(() =>
      useReverification(fetcher, { passReverificationResult: true })
    );

    await expect(enhanced('user')).resolves.toBe('reloaded');
    expect(fetcher.mock.calls).toEqual([
      [undefined, 'user'],
      [result, 'user']
    ]);
  });

  it('propagates other errors', async () => {
    const t = createTestClerk({ __internal_openReverification: vi.fn() });
    const failure = new Error('boom');
    const enhanced = t.renderHook(() =>
      useReverification(() => Promise.reject(failure))
    );
    await expect(enhanced()).rejects.toBe(failure);
  });
});
