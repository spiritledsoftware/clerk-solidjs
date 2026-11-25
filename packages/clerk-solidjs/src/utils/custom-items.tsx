import { logErrorInDevMode } from '@clerk/shared/utils';
import type { JSX } from '@solidjs/web';
import { type Accessor, children, createContext, useContext } from 'solid-js';

/**
 * Custom pages (`<UserProfile.Page>`, `<OrganizationProfile.Link>`, ...) and custom menu
 * items (`<UserButton.MenuItems>`, `<UserButton.Action>`, ...) are marker components:
 * they render nothing themselves. Inside the component that owns them they return a
 * {@link CustomItemMarker} describing their props, which the owner collects with
 * `children()` and turns into Clerk's `customPages` / `customMenuItems` options.
 *
 * Which owner a marker is under is tracked with {@link CustomItemsScope}, so a marker
 * rendered anywhere else logs the same dev-mode error as `@clerk/react` and renders its
 * children.
 */

export type CustomItemKind =
  | 'UserProfilePage'
  | 'UserProfileLink'
  | 'OrganizationProfilePage'
  | 'OrganizationProfileLink'
  | 'MenuItems'
  | 'MenuAction'
  | 'MenuLink';

const CUSTOM_ITEM = Symbol.for('clerk-solidjs.custom-item');

export type CustomItemMarker<P = Record<string, any>> = {
  [CUSTOM_ITEM]: CustomItemKind;
  /** The marker component's props. Read `children` / `labelIcon` lazily: each read renders them. */
  props: P;
  /** For `MenuItems`: its resolved children. */
  items?: Accessor<unknown[]>;
};

export const isCustomItem = (
  value: unknown,
  kind?: CustomItemKind
): value is CustomItemMarker =>
  !!value &&
  typeof value === 'object' &&
  CUSTOM_ITEM in value &&
  (kind === undefined || (value as CustomItemMarker)[CUSTOM_ITEM] === kind);

export const customItemKind = (value: CustomItemMarker): CustomItemKind =>
  value[CUSTOM_ITEM];

type Scope = 'customPages' | 'menuItems';

/**
 * @internal
 */
export const CustomItemsScope = createContext<Scope | null>(null);

/**
 * Builds a marker component. Under `scope` it returns a marker; anywhere else it logs
 * `misplacedError` in development and renders its children.
 *
 * @internal
 */
export const createMarkerComponent = <P extends { children?: JSX.Element }>(
  kind: CustomItemKind,
  scope: Scope,
  misplacedError: string
) =>
  function CustomItem(props: P): JSX.Element {
    if (useContext(CustomItemsScope) !== scope) {
      logErrorInDevMode(misplacedError);
      return <>{props.children}</>;
    }
    const marker: CustomItemMarker<P> = { [CUSTOM_ITEM]: kind, props };
    if (kind === 'MenuItems') {
      const items = children(() => (
        <CustomItemsScope value="menuItems">{props.children}</CustomItemsScope>
      ));
      marker.items = items.toArray;
    }
    return marker as unknown as JSX.Element;
  };

/**
 * Resolves the children of a component that accepts custom pages / menu items, with
 * the marker components among them returning markers.
 *
 * @internal
 */
export const resolveCustomItemChildren = (fn: () => JSX.Element) =>
  children(() => (
    <CustomItemsScope value="customPages">{fn()}</CustomItemsScope>
  ));

/**
 * The resolved children without custom-item markers.
 *
 * @internal
 */
export const sanitizeChildren = (resolved: unknown[]) =>
  resolved.filter((child) => !isCustomItem(child)) as JSX.Element[];
