import type { CustomPage } from '@clerk/shared/types';
import { logErrorInDevMode } from '@clerk/shared/utils';
import type { JSX } from '@solidjs/web';
import { type Accessor, createMemo } from 'solid-js';
import {
  customLinkWrongProps,
  customPagesIgnoredComponent,
  customPageWrongProps
} from '../errors/messages';
import { createCustomElementRenderer } from './custom-element-renderer';
import {
  type CustomItemKind,
  type CustomItemMarker,
  isCustomItem
} from './custom-items';

type CustomPagesOptions = {
  /** Don't warn about children that are not custom pages (`__experimental_asProvider`). */
  allowForAnyChildren?: boolean;
};

type CustomPagesParams = {
  pageKind: CustomItemKind;
  linkKind: CustomItemKind;
  reorderItemsLabels: string[];
  componentName: string;
};

export const USER_PROFILE_REORDER_LABELS = [
  'account',
  'security',
  'billing',
  'apiKeys'
];
export const ORGANIZATION_PROFILE_REORDER_LABELS = [
  'general',
  'members',
  'billing',
  'apiKeys'
];

/**
 * `customPages` for `<UserProfile>` (and `<UserButton>`'s profile) from its resolved children.
 *
 * @internal
 */
export const createUserProfileCustomPages = (
  resolved: Accessor<unknown[]>,
  options?: () => CustomPagesOptions
) =>
  createCustomPages(
    resolved,
    {
      pageKind: 'UserProfilePage',
      linkKind: 'UserProfileLink',
      reorderItemsLabels: USER_PROFILE_REORDER_LABELS,
      componentName: 'UserProfile'
    },
    options
  );

/**
 * `customPages` for `<OrganizationProfile>` (and `<OrganizationSwitcher>`'s profile) from its
 * resolved children.
 *
 * @internal
 */
export const createOrganizationProfileCustomPages = (
  resolved: Accessor<unknown[]>,
  options?: () => CustomPagesOptions
) =>
  createCustomPages(
    resolved,
    {
      pageKind: 'OrganizationProfilePage',
      linkKind: 'OrganizationProfileLink',
      reorderItemsLabels: ORGANIZATION_PROFILE_REORDER_LABELS,
      componentName: 'OrganizationProfile'
    },
    options
  );

/**
 * Turns `.Page` / `.Link` markers into Clerk `CustomPage`s, mirroring `useCustomPages` in
 * `@clerk/react`. Page content and label icons are rendered into the elements Clerk passes
 * to `mount` / `mountIcon`. Any other child is ignored with a dev-mode error.
 */
const createCustomPages = (
  resolved: Accessor<unknown[]>,
  params: CustomPagesParams,
  options?: () => CustomPagesOptions
): Accessor<CustomPage[]> => {
  const renderer = createCustomElementRenderer();
  const { pageKind, linkKind, reorderItemsLabels, componentName } = params;

  const mountHandlers = (content: () => JSX.Element) => ({
    mount: (el: HTMLDivElement) => renderer.mount(el, content),
    unmount: (el?: HTMLDivElement) => renderer.unmount(el)
  });
  const iconHandlers = (content: () => JSX.Element) => ({
    mountIcon: (el: HTMLDivElement) => renderer.mount(el, content),
    unmountIcon: (el?: HTMLDivElement) => renderer.unmount(el)
  });

  return createMemo(() => {
    const allowForAnyChildren = options?.().allowForAnyChildren ?? false;
    const customPages: CustomPage[] = [];

    for (const child of resolved()) {
      if (!isCustomItem(child)) {
        if (child && !allowForAnyChildren) {
          logErrorInDevMode(customPagesIgnoredComponent(componentName));
        }
        continue;
      }
      // `<UserButton.MenuItems>` is handled by the custom menu items.
      if (!isCustomItem(child, pageKind) && !isCustomItem(child, linkKind)) {
        if (!isCustomItem(child, 'MenuItems') && !allowForAnyChildren) {
          logErrorInDevMode(customPagesIgnoredComponent(componentName));
        }
        continue;
      }

      const props = (child as CustomItemMarker).props;
      const shape = describe(props);

      if (isCustomItem(child, pageKind)) {
        if (isReorderItem(shape, reorderItemsLabels)) {
          customPages.push({ label: shape.label as string });
        } else if (isCustomPage(shape)) {
          customPages.push({
            label: shape.label as string,
            url: shape.url as string,
            ...mountHandlers(() => props.children),
            ...iconHandlers(() => props.labelIcon)
          });
        } else {
          logErrorInDevMode(customPageWrongProps(componentName));
        }
        continue;
      }

      if (isExternalLink(shape)) {
        customPages.push({
          label: shape.label as string,
          url: shape.url as string,
          ...iconHandlers(() => props.labelIcon)
        });
      } else {
        logErrorInDevMode(customLinkWrongProps(componentName));
      }
    }

    return customPages;
  });
};

type Shape = {
  label: unknown;
  url: unknown;
  hasChildren: boolean;
  hasLabelIcon: boolean;
};

/**
 * Reads the scalar props and checks for the JSX ones without rendering them: reading
 * `children` / `labelIcon` would create their DOM.
 */
const describe = (props: Record<string, any>): Shape => ({
  label: props.label,
  url: props.url,
  hasChildren: hasJSXProp(props, 'children'),
  hasLabelIcon: hasJSXProp(props, 'labelIcon')
});

/**
 * Whether a JSX prop was passed. A getter (dynamic JSX) counts as present; a plain value
 * must be truthy.
 *
 * @internal
 */
export const hasJSXProp = (props: Record<string, any>, key: string) => {
  if (!(key in props)) return false;
  const descriptor = Object.getOwnPropertyDescriptor(props, key);
  if (descriptor && !('value' in descriptor)) return true;
  return !!props[key];
};

const isReorderItem = (shape: Shape, validItems: string[]) =>
  !shape.hasChildren &&
  !shape.url &&
  !shape.hasLabelIcon &&
  validItems.some((v) => v === shape.label);

const isCustomPage = (shape: Shape) =>
  shape.hasChildren && !!shape.url && shape.hasLabelIcon && !!shape.label;

const isExternalLink = (shape: Shape) =>
  !shape.hasChildren && !!shape.url && shape.hasLabelIcon && !!shape.label;
