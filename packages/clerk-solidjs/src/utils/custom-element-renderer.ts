import { type JSX, render } from '@solidjs/web';
import { getOwner, runWithOwner } from 'solid-js';

export type CustomElementRenderer = {
  /** Renders `content()` into `el`, replacing anything previously rendered there. */
  mount: (el: HTMLElement, content: () => JSX.Element) => void;
  /** Disposes what was rendered into `el`. */
  unmount: (el?: HTMLElement) => void;
};

/**
 * Renders Solid content into elements Clerk hands over through the `mount` / `mountIcon`
 * callbacks of custom pages and menu items.
 *
 * Each element gets its own `render()` root, created under the calling component's
 * owner, so the content sees the same context (the Clerk provider, routers, ...) as the
 * component and is disposed with it. `unmount` disposes the root early; Clerk calls it
 * when it drops the element.
 *
 * @internal
 */
export const createCustomElementRenderer = (): CustomElementRenderer => {
  const owner = getOwner();
  const disposers = new Map<HTMLElement, () => void>();

  const unmount = (el?: HTMLElement) => {
    if (!el) return;
    const dispose = disposers.get(el);
    if (!dispose) return;
    disposers.delete(el);
    dispose();
  };

  const mount = (el: HTMLElement, content: () => JSX.Element) => {
    unmount(el);
    const dispose = runWithOwner(owner, () => render(content, el));
    disposers.set(el, dispose);
  };

  return { mount, unmount };
};
