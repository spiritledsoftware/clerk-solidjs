import { isServer, type JSX, spread } from '@solidjs/web';
import { children, createEffect, createMemo, Show } from 'solid-js';
import { errorThrower } from '../errors/error-thrower';
import { multipleChildrenInButtonComponent } from '../errors/messages';
import type { ButtonHTMLProps } from '../types';

export type ButtonComponentName =
  | 'SignInButton'
  | 'SignUpButton'
  | 'SignOutButton'
  | 'SignInWithMetamaskButton'
  | 'CheckoutButton'
  | 'SubscriptionDetailsButton'
  | 'PlanDetailsButton'
  | 'InviteMembersButton';

const isRendered = (value: unknown) =>
  value != null && value !== false && value !== true && value !== '';

/**
 * Returns the single rendered child, `undefined` when there is none, and throws when
 * there is more than one.
 */
export const assertSingleChild =
  (resolved: JSX.Element | JSX.Element[]) => (name: ButtonComponentName) => {
    const list = (Array.isArray(resolved) ? resolved : [resolved]).filter(
      isRendered
    );
    if (list.length > 1) {
      return errorThrower.throw(multipleChildrenInButtonComponent(name));
    }
    return list[0] as JSX.Element | undefined;
  };

export const safeExecute =
  (cb: unknown) =>
  (...args: any) => {
    if (cb && typeof cb === 'function') {
      return cb(...args);
    }
  };

export type ClerkButtonProps = {
  /** Used in the error thrown for multiple children. */
  name: ButtonComponentName;
  /** Text of the default `<button>` when there are no children. */
  defaultText: string;
  /** HTML attributes for the default `<button>`. */
  buttonProps: ButtonHTMLProps;
  /** Runs the Clerk action after the user's click handlers. */
  onActivate: () => unknown;
};

/**
 * The trigger shared by the Clerk button components.
 *
 * Solid has no `cloneElement`, so a child cannot be re-rendered with extra props the
 * way `@clerk/react` does it. Instead:
 *
 * - With no children, or text (or any non-element) children, a `<button>` is rendered
 *   around them, with `buttonProps` (including `onClick`) applied to it.
 * - With a single element child (`<button>`, `<a>`, a component that renders one
 *   element, ...), that element is rendered as is: `buttonProps` are spread onto it
 *   (like `cloneElement` upstream, they override its own attributes) and a click
 *   listener is attached to it. Its own `onClick` runs first (Solid delegates it), then
 *   `buttonProps.onClick`, then the Clerk action.
 *
 * More than one child throws, as in `@clerk/react`.
 */
export function ClerkButton(
  props: ClerkButtonProps & { children?: JSX.Element }
): JSX.Element {
  const resolved = children(() => props.children);
  const child = createMemo(() =>
    assertSingleChild(resolved() as JSX.Element)(props.name)
  );
  // On the server there are no DOM nodes: a rendered element is an SSR template
  // object, and text is a string. Treat the former as the element branch so the
  // server markup matches what the browser hydrates.
  const element = createMemo(() => {
    const c = child();
    if (isServer) {
      return isRendered(c) && typeof c === 'object' ? c : undefined;
    }
    return c instanceof Element ? c : undefined;
  });

  const activate = async (e: MouseEvent) => {
    await safeExecute(props.buttonProps.onClick)(e);
    return props.onActivate();
  };

  createEffect(
    () => element(),
    (el) => {
      if (!el || isServer) return;
      const target = el as Element;
      const listener = async (e: Event) => {
        // Let the element's own click handler run first, as upstream does. Solid
        // delegates it to the render root, which sees the event only after it bubbles;
        // a microtask would still run before that, so wait a macrotask.
        await new Promise((resolve) => setTimeout(resolve, 0));
        await activate(e as MouseEvent);
      };
      target.addEventListener('click', listener);
      return () => target.removeEventListener('click', listener);
    }
  );

  return (
    <Show
      when={element()}
      keyed
      fallback={
        <button {...props.buttonProps} onClick={activate}>
          {child() ?? props.defaultText}
        </button>
      }
    >
      {(el) => {
        // Owned by this branch, so the bindings go away when the child changes.
        // Server output renders the child as is; the props apply after hydration.
        if (!isServer) {
          spread(
            el as Element,
            props.buttonProps,
            true,
            (key) => key === 'onClick'
          );
        }
        return el as JSX.Element;
      }}
    </Show>
  );
}
