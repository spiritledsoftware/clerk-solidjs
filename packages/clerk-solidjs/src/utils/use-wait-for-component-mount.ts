import { type Accessor, createSignal, onSettled } from 'solid-js';

export type ComponentMountStatus = 'rendering' | 'rendered' | 'error';

/**
 * Resolves once the element matching `selector` has element children, watching DOM
 * changes under `document.body`. Returns a function that stops watching.
 */
const waitForElementChildren = (
  selector: string,
  onReady: () => void
): (() => void) => {
  const root = document.body;
  const isReady = () => {
    const el = root.querySelector(selector);
    return !!el && el.childElementCount > 0;
  };

  if (isReady()) {
    onReady();
    return () => {};
  }

  const observer = new MutationObserver(() => {
    if (isReady()) {
      observer.disconnect();
      onReady();
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
};

/**
 * Detects when a Clerk component has mounted by watching for children in the element
 * with `data-clerk-component="${component}"` (plus an optional extra `selector`).
 * Port of `useWaitForComponentMount` from `@clerk/react`.
 *
 * Watching starts after the first render settles, and only when `enabled()` is true then
 * (components use it to drive their `fallback`, so there is nothing to watch without one).
 *
 * @internal
 */
export function useWaitForComponentMount(
  component: () => string | undefined,
  options?: { selector?: string; enabled?: () => boolean }
): Accessor<ComponentMountStatus> {
  const [status, setStatus] = createSignal<ComponentMountStatus>('rendering');

  onSettled(() => {
    if (typeof window === 'undefined') return;
    if (options?.enabled && !options.enabled()) return;
    const name = component();
    if (!name) {
      setStatus('error');
      return;
    }
    const selector = `[data-clerk-component="${name}"]${options?.selector ?? ''}`;
    try {
      return waitForElementChildren(selector, () => setStatus('rendered'));
    } catch {
      setStatus('error');
    }
  });

  return status;
}
