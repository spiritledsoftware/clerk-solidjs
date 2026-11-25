import type {
  __experimental_CheckoutButtonProps,
  __experimental_PlanDetailsButtonProps,
  __experimental_SubscriptionDetailsButtonProps,
  ClerkAPIResponseError,
  ClerkPaginatedResponse,
  InitialState,
  InternalClerkScriptProps,
  IsomorphicClerkOptions,
  LoadedClerk,
  RedirectUrlProp,
  InviteMembersButtonProps as SharedInviteMembersButtonProps,
  SignInButtonProps as SharedSignInButtonProps,
  SignUpButtonProps as SharedSignUpButtonProps,
  SignInRedirectOptions,
  SignOutOptions,
  SignUpRedirectOptions,
  TasksRedirectOptions
} from '@clerk/shared/types';
import type { ClerkUIConstructor } from '@clerk/shared/ui';
import type { Appearance, ExtractAppearanceType } from '@clerk/ui/internal';
import type { JSX } from '@solidjs/web';
import type { Accessor } from 'solid-js';

export type {
  BrowserClerk,
  BrowserClerkConstructor,
  Clerk,
  ClerkProp,
  HeadlessBrowserClerk,
  HeadlessBrowserClerkConstructor,
  IsomorphicClerkOptions,
  LoadedClerk
} from '@clerk/shared/types';

declare global {
  interface Window {
    __clerk_publishable_key?: string;
    __clerk_proxy_url?: string;
    __clerk_domain?: string;
    __internal_ClerkUICtor?: ClerkUIConstructor;
  }
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Redeclaration of the `Ui` type from `@clerk/ui/internal`, so a `ui` object from any
 * `@clerk/ui` version is accepted without a type mismatch.
 */
export interface Ui<A = any> {
  __brand?: '__clerkUI';
  ClerkUI?: ClerkUIConstructor | Promise<ClerkUIConstructor>;
  version?: string;
  __appearanceType?: A;
}

/**
 * @interface
 */
export type ClerkProviderProps<TUi extends Ui = Ui> = Omit<
  IsomorphicClerkOptions,
  'appearance' | 'publishableKey' | keyof InternalClerkScriptProps
> & {
  children: JSX.Element;
  /**
   * The Clerk Publishable Key for your instance. When omitted, it is read from
   * `VITE_CLERK_PUBLISHABLE_KEY` or `CLERK_PUBLISHABLE_KEY`.
   */
  publishableKey?: string;
  /**
   * Provide an initial state of the Clerk client during server-side rendering. You don't need to
   * set this value yourself unless you're developing an SDK.
   */
  initialState?: InitialState;
  /**
   * Indicates to silently fail the initialization process when the publishable keys is not
   * provided, instead of throwing an error.
   * @default false
   * @internal
   */
  __internal_bypassMissingPublishableKey?: boolean;
  /**
   * An object to style your components. Will only affect Clerk Components and not Account Portal pages.
   */
  appearance?: ExtractAppearanceType<TUi, Appearance>;
  /**
   * An object to use the bundled Clerk UI instead of loading from CDN.
   * Import `ui` from `@clerk/ui` and pass it here to bundle the UI with your application.
   * When omitted, UI is loaded from Clerk's CDN.
   */
  ui?: TUi;
};

export type WithClerkProp<T = unknown> = T & {
  clerk: Accessor<LoadedClerk>;
  component?: string;
};

// Clerk object
export interface MountProps {
  mount: (node: HTMLDivElement, props: any) => void;
  unmount: (node: HTMLDivElement) => void;
  updateProps: (props: any) => void;
  props?: any;
}

export interface OpenProps {
  open: (props: any) => void;
  close: () => void;
  props?: any;
}

/**
 * HTML attributes accepted by the Clerk button components. They are applied to the
 * default `<button>` rendered when the component has no element child.
 */
export type ButtonHTMLProps = Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  children?: JSX.Element;
};

type WithButtonHTMLProps<T> = T &
  Omit<ButtonHTMLProps, Extract<keyof T, string>>;

export type SignInButtonProps = WithButtonHTMLProps<SharedSignInButtonProps>;

export type SignUpButtonProps = WithButtonHTMLProps<SharedSignUpButtonProps>;

export type SignOutButtonProps = WithButtonHTMLProps<
  Pick<SignOutOptions, 'redirectUrl' | 'sessionId'> & {
    /**
     * @deprecated Use the `redirectUrl` and `sessionId` props directly instead.
     */
    signOutOptions?: SignOutOptions;
  }
>;

export type SignInWithMetamaskButtonProps = WithButtonHTMLProps<
  { mode?: 'redirect' | 'modal' } & RedirectUrlProp
>;

export type InviteMembersButtonProps =
  WithButtonHTMLProps<SharedInviteMembersButtonProps>;

export type CheckoutButtonProps =
  WithButtonHTMLProps<__experimental_CheckoutButtonProps>;

export type PlanDetailsButtonProps =
  WithButtonHTMLProps<__experimental_PlanDetailsButtonProps>;

export type SubscriptionDetailsButtonProps =
  WithButtonHTMLProps<__experimental_SubscriptionDetailsButtonProps>;

export type RedirectToSignInProps = SignInRedirectOptions;
export type RedirectToSignUpProps = SignUpRedirectOptions;
export type RedirectToTasksProps = TasksRedirectOptions;

type PageProps<T extends string> =
  | {
      label: string;
      url: string;
      labelIcon: JSX.Element;
    }
  | {
      label: T;
      url?: never;
      labelIcon?: never;
    };

export type UserProfilePageProps = PageProps<
  'account' | 'security' | 'billing' | 'apiKeys'
>;

export type UserProfileLinkProps = {
  url: string;
  label: string;
  labelIcon: JSX.Element;
};

export type OrganizationProfilePageProps = PageProps<
  'general' | 'members' | 'billing' | 'apiKeys'
>;
export type OrganizationProfileLinkProps = UserProfileLinkProps;

type ButtonActionProps<T extends string> =
  | {
      label: string;
      labelIcon: JSX.Element;
      onClick: () => void;
      open?: never;
    }
  | {
      label: T;
      labelIcon?: never;
      onClick?: never;
      open?: never;
    }
  | {
      label: string;
      labelIcon: JSX.Element;
      onClick?: never;
      open: string;
    };

export type UserButtonActionProps = ButtonActionProps<
  'manageAccount' | 'signOut'
>;

export type UserButtonLinkProps = {
  href: string;
  label: string;
  labelIcon: JSX.Element;
};

export type ValueOrSetter<T = unknown> = (size: T | ((_size: T) => T)) => void;

export type CacheSetter<CData = any> = (
  data?:
    | CData
    | ((currentData?: CData) => Promise<undefined | CData> | undefined | CData)
) => Promise<CData | undefined>;

/**
 * A paginated list returned by hooks such as `useOrganization()` and `useOrganizationList()`.
 * State is exposed as accessors; the helpers are plain functions.
 *
 * @interface
 */
export type PaginatedResources<T = unknown, Infinite = false> = {
  /**
   * The fetched items. In infinite mode, the items of every loaded page.
   */
  data: Accessor<T[]>;
  /**
   * The total count of items that exist remotely.
   */
  count: Accessor<number>;
  /**
   * Clerk's API response error, or `null`.
   */
  error: Accessor<ClerkAPIResponseError | null>;
  /**
   * `true` while a request is in flight and there is no data to show.
   */
  isLoading: Accessor<boolean>;
  /**
   * `true` while any request is in flight, including revalidations.
   */
  isFetching: Accessor<boolean>;
  /**
   * `true` when the last request failed.
   */
  isError: Accessor<boolean>;
  /**
   * The current page. In infinite mode, the number of loaded pages.
   */
  page: Accessor<number>;
  /**
   * The total number of pages, based on `count`, `initialPage`, and `pageSize`.
   */
  pageCount: Accessor<number>;
  /**
   * Load a specific page.
   */
  fetchPage: ValueOrSetter<number>;
  /**
   * Load the previous page. A no-op in infinite mode.
   */
  fetchPrevious: () => void;
  /**
   * Load the next page. In infinite mode, appends it to `data`.
   */
  fetchNext: () => void;
  /**
   * `true` when there are more pages after the current one.
   */
  hasNextPage: Accessor<boolean>;
  /**
   * `true` when there are pages before the current one.
   */
  hasPreviousPage: Accessor<boolean>;
  /**
   * Refetch every cached page of this list.
   */
  revalidate: () => Promise<void>;
  /**
   * Replace the cached data for the current key.
   */
  setData: Infinite extends true
    ? // Array of pages of data
      CacheSetter<(ClerkPaginatedResponse<T> | undefined)[]>
    : // Array of data
      CacheSetter<ClerkPaginatedResponse<T> | undefined>;
};

/**
 * The placeholder a paginated list takes before Clerk has loaded: every accessor
 * returns `undefined` (`false` for booleans) and the helpers are `undefined`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type PaginatedResourcesWithDefault<T = unknown> = {
  data: Accessor<undefined>;
  count: Accessor<undefined>;
  error: Accessor<undefined>;
  isLoading: Accessor<false>;
  isFetching: Accessor<false>;
  isError: Accessor<false>;
  page: Accessor<undefined>;
  pageCount: Accessor<undefined>;
  fetchPage: undefined;
  fetchPrevious: undefined;
  fetchNext: undefined;
  hasNextPage: Accessor<false>;
  hasPreviousPage: Accessor<false>;
  revalidate: undefined;
  setData: undefined;
};

/**
 * @inline
 */
export type PaginatedHookConfig<T> = T & {
  /**
   * If `true`, newly fetched data is appended to the existing list rather than replacing it.
   *
   * @default false
   */
  infinite?: boolean;
  /**
   * If `true`, the previous data is kept until the new data has been fetched.
   *
   * @default false
   */
  keepPreviousData?: boolean;
};

export type PagesOrInfiniteConfig = PaginatedHookConfig<{
  /**
   * If `true`, a request is triggered when the hook is mounted.
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * In `cache` mode no request is made; data is read from the cache only.
   *
   * @hidden
   * @experimental
   */
  __experimental_mode?: 'cache';
  /**
   * Cached lists are cleared when this flips from signed in to `false`.
   *
   * @hidden
   * @experimental
   */
  isSignedIn?: boolean;
}>;

/**
 * @interface
 */
export type PagesOrInfiniteOptions = {
  /**
   * The page to start from. For example, `10` skips the first 9 pages. Read once, when the hook is created.
   *
   * @default 1
   */
  initialPage?: number;
  /**
   * The maximum number of results per page. Read once, when the hook is created.
   *
   * @default 10
   */
  pageSize?: number;
};
