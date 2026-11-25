import { without } from '@clerk/shared/object';
import type { JSX } from '@solidjs/web';
import { createEffect, createMemo, onSettled } from 'solid-js';
import type { MountProps, OpenProps } from '../types';

const isMountProps = (props: any): props is MountProps => 'mount' in props;
const isOpenProps = (props: any): props is OpenProps => 'open' in props;

const stripMenuItemIconHandlers = (
  menuItems?: Array<{ mountIcon?: unknown; unmountIcon?: unknown }>
) => menuItems?.map((item) => without(item, 'mountIcon', 'unmountIcon'));

/** Stable ids for functions, so a key notices a replaced callback. */
const functionIds = new WeakMap<object, number>();
let nextFunctionId = 0;
const functionId = (fn: object) => {
  let id = functionIds.get(fn);
  if (id === undefined) {
    id = ++nextFunctionId;
    functionIds.set(fn, id);
  }
  return id;
};

/**
 * A key that changes only when Clerk needs new props: the props (functions compared
 * by identity), the number of custom pages and menu items, and the menu items without
 * their icon handlers (those are recreated on every change and would always differ).
 */
const propsKey = (props: Record<string, any>): string => {
  try {
    return JSON.stringify(
      [
        without(props, 'customPages', 'customMenuItems', 'children'),
        props.customPages?.length,
        props.customMenuItems?.length,
        stripMenuItemIconHandlers(props.customMenuItems)
      ],
      (_key, value) =>
        typeof value === 'function' ? `fn:${functionId(value)}` : value
    );
  } catch {
    return String(Math.random());
  }
};

export type ClerkHostRendererProps = (MountProps | OpenProps) & {
  component?: string;
  hideRootHtmlElement?: boolean;
  rootProps?: JSX.HTMLAttributes<HTMLDivElement>;
  children?: JSX.Element;
};

/**
 * Mounts one of Clerk's prebuilt components into a `<div>` (or opens a modal one)
 * after the first render settles, keeps it updated, and unmounts it on dispose.
 */
export const ClerkHostRenderer = (props: ClerkHostRendererProps) => {
  let root: HTMLDivElement | undefined;

  const componentProps = createMemo(() => ({ ...(props.props ?? {}) }), {
    equals: (a, b) => propsKey(a) === propsKey(b)
  });

  createEffect(
    () => componentProps(),
    (value) => {
      if (root && isMountProps(props)) {
        props.updateProps({ node: root, props: value });
      }
    },
    { defer: true }
  );

  onSettled(() => {
    const node = root;
    const initial = componentProps();
    if (isMountProps(props)) {
      if (!node) return;
      props.mount(node, initial);
      return () => props.unmount(node);
    }
    if (isOpenProps(props)) {
      props.open(initial);
      return () => props.close();
    }
  });

  return (
    <>
      {!props.hideRootHtmlElement && (
        <div
          ref={(el) => (root = el)}
          {...props.rootProps}
          data-clerk-component={props.component}
        />
      )}
      {props.children}
    </>
  );
};
