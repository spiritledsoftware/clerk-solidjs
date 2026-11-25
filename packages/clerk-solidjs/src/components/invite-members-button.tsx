import { omit } from 'solid-js';
import type { InviteMembersButtonProps, WithClerkProp } from '../types';
import { ClerkButton } from '../utils/children-utils';
import { withClerk } from './with-clerk';

/**
 * A button that opens a modal containing the organization invite-members form when
 * clicked. Wrap your own element, or omit children to render a default button.
 *
 * Requires an active organization, and should only be rendered for members who can
 * manage memberships (the `org:sys_memberships:manage` permission). Guard with `<Show>`
 * or `useAuth()` if unsure.
 *
 * @example
 * ```tsx
 * <InviteMembersButton>
 *   <button>Invite members</button>
 * </InviteMembersButton>
 * ```
 */
export const InviteMembersButton = withClerk(
  (props: WithClerkProp<InviteMembersButtonProps>) => {
    const buttonProps = omit(
      props,
      'clerk',
      'component',
      'children',
      'appearance'
    );

    const clickHandler = () =>
      props.clerk().openInviteMembers({ appearance: props.appearance });

    return (
      <ClerkButton
        name="InviteMembersButton"
        defaultText="Invite members"
        buttonProps={buttonProps}
        onActivate={clickHandler}
      >
        {props.children}
      </ClerkButton>
    );
  },
  { component: 'InviteMembersButton', renderWhileLoading: true }
);
