import type { CustomMenuItem } from '@clerk/shared/types';
import { logErrorInDevMode } from '@clerk/shared/utils';
import { type Accessor, createMemo } from 'solid-js';
import {
  customMenuItemsIgnoredComponent,
  userButtonIgnoredComponent,
  userButtonMenuItemLinkWrongProps,
  userButtonMenuItemsActionWrongsProps
} from '../errors/messages';
import { createCustomElementRenderer } from './custom-element-renderer';
import { type CustomItemMarker, isCustomItem } from './custom-items';
import { hasJSXProp } from './custom-pages';

export const USER_BUTTON_REORDER_LABELS = ['manageAccount', 'signOut'];

/**
 * `customMenuItems` for `<UserButton>` from its resolved children, mirroring
 * `useUserButtonCustomMenuItems` in `@clerk/react`. Label icons are rendered into the
 * elements Clerk passes to `mountIcon`.
 *
 * @internal
 */
export const createUserButtonCustomMenuItems = (
  resolved: Accessor<unknown[]>,
  options?: () => { allowForAnyChildren?: boolean }
): Accessor<CustomMenuItem[]> => {
  const renderer = createCustomElementRenderer();
  const reorderItemsLabels = USER_BUTTON_REORDER_LABELS;

  return createMemo(() => {
    const allowForAnyChildren = options?.().allowForAnyChildren ?? false;
    const customMenuItems: CustomMenuItem[] = [];

    for (const child of resolved()) {
      if (
        !isCustomItem(child, 'MenuItems') &&
        !isCustomItem(child, 'UserProfileLink') &&
        !isCustomItem(child, 'UserProfilePage')
      ) {
        if (child && !allowForAnyChildren) {
          logErrorInDevMode(userButtonIgnoredComponent);
        }
        continue;
      }
      // Custom profile pages are handled by the custom pages.
      if (!isCustomItem(child, 'MenuItems')) {
        continue;
      }

      for (const item of child.items?.() ?? []) {
        if (
          !isCustomItem(item, 'MenuAction') &&
          !isCustomItem(item, 'MenuLink')
        ) {
          if (item) {
            logErrorInDevMode(customMenuItemsIgnoredComponent);
          }
          continue;
        }

        const props = (item as CustomItemMarker).props;
        const label = props.label as string;
        const hasLabelIcon = hasJSXProp(props, 'labelIcon');
        const iconHandlers = {
          mountIcon: (el: HTMLDivElement) =>
            renderer.mount(el, () => props.labelIcon),
          unmountIcon: (el?: HTMLDivElement) => renderer.unmount(el)
        };

        if (isCustomItem(item, 'MenuAction')) {
          const onClick = props.onClick as (() => void) | undefined;
          const open = props.open as string | undefined;
          const isReorderItem =
            !hasJSXProp(props, 'children') &&
            !onClick &&
            !hasLabelIcon &&
            reorderItemsLabels.some((v) => v === label);

          if (isReorderItem) {
            customMenuItems.push({ label });
          } else if (
            hasLabelIcon &&
            !!label &&
            (typeof onClick === 'function' || typeof open === 'string')
          ) {
            if (onClick !== undefined) {
              customMenuItems.push({ label, onClick, ...iconHandlers });
            } else if (open !== undefined) {
              customMenuItems.push({
                label,
                open: open.startsWith('/') ? open : `/${open}`,
                ...iconHandlers
              });
            }
          } else {
            logErrorInDevMode(userButtonMenuItemsActionWrongsProps);
          }
          continue;
        }

        const href = props.href as string | undefined;
        if (!!href && hasLabelIcon && !!label) {
          customMenuItems.push({ label, href, ...iconHandlers });
        } else {
          logErrorInDevMode(userButtonMenuItemLinkWrongProps);
        }
      }
    }

    return customMenuItems;
  });
};
