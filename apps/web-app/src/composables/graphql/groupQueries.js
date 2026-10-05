/**
 * Groups (group / invite) GraphQL operations.
 *
 * Kept out of `queries.js` so the Groups redesign owns its own operations, the
 * way `chatQueries.js` owns the chat thread's.
 *
 * ## Why `tasklist` deliberately omits `id`
 *
 * One `routineItem` document is reused by every day — `ticked` / `passed` only
 * mean anything on the per-day copy (see `apps/server/src/resolvers/routine.js`).
 * So the SAME `RoutineItem:<id>` appears in all seven days this query returns,
 * and Apollo 2.x (which has no field `merge`) would normalize them into one
 * record: whichever day resolved last would decide the `ticked` flag for every
 * other day, and all seven day dots would read identically.
 *
 * Leaving `id` out of the selection leaves those objects un-normalized, stored
 * inline under their own `Routine:<id>` — which is where a per-day tick state
 * belongs. `ProgressTime.vue`'s `routineSevenDays` already relies on the same
 * property. The week grid therefore keys its rows on `time|name`, not on an id.
 *
 * `UserItem` selections likewise omit `id`: every group mutation here returns a
 * *partial* UserItem (`email` + `groupId`), and a partial normalized write is
 * exactly how this cache got corrupted before (ARCHITECTURE.md §3.2). Un-keyed,
 * they cannot overwrite anything — the affected reads are refetched instead.
 */
import gql from 'graphql-tag';

/**
 * The signed-in user's own record: `groupId` (which group to read) and
 * `inviterEmail` (someone has invited you). Named `showInvite` on the server.
 */
export const SHOW_INVITE_QUERY = gql`
  query showInvite {
    showInvite {
      name
      email
      picture
      groupId
      inviterEmail
    }
  }
`;

/** Everyone in the group, the current user included. */
export const GROUP_MEMBERS_QUERY = gql`
  query getUsersByGroupId($groupId: String!) {
    getUsersByGroupId(groupId: $groupId) {
      name
      email
      picture
    }
  }
`;

/**
 * One member's last seven routine days. See the file header for why `tasklist`
 * carries no `id`.
 */
export const GROUP_MEMBER_ROUTINES_QUERY = gql`
  query routinesByGroupEmail($groupId: String!, $email: String!) {
    routinesByGroupEmail(groupId: $groupId, email: $email) {
      id
      date
      email
      tasklist {
        name
        time
        points
        ticked
        passed
        wait
      }
    }
  }
`;

/**
 * YOUR OWN last seven routine days, with no group needed. Same selection as
 * `GROUP_MEMBER_ROUTINES_QUERY` (and so the same un-normalized `tasklist`), for
 * your row and week when you are in no group: `routinesByGroupEmail` requires a
 * `groupId`, and a solo user's own week must not render as seven blanks.
 */
export const MY_ROUTINES_QUERY = gql`
  query routineSevenDays {
    routineSevenDays {
      id
      date
      email
      tasklist {
        name
        time
        points
        ticked
        passed
        wait
      }
    }
  }
`;

/**
 * Invite someone by email. The server 403s with `User Not Found` when the email
 * belongs to nobody — there is no "invite a stranger" path yet.
 */
export const SEND_INVITE_MUTATION = gql`
  mutation sendInvite($invitedEmail: String!) {
    sendInvite(invitedEmail: $invitedEmail) {
      email
    }
  }
`;

/**
 * Invites YOU have sent that are still open — the invitee still carries your
 * email as `inviterEmail` and has not joined your group. A declined or
 * cancelled invite clears that field, so it drops out (and frees its slot).
 * The server returns only `email`, `name` and `picture` for these people.
 */
export const PENDING_INVITES_QUERY = gql`
  query pendingInvites {
    pendingInvites {
      email
      name
      picture
    }
  }
`;

/** Withdraw an invite you sent. 403s when it is not yours or no longer open. */
export const CANCEL_INVITE_MUTATION = gql`
  mutation cancelInvite($invitedEmail: String!) {
    cancelInvite(invitedEmail: $invitedEmail) {
      email
    }
  }
`;

/** Join the inviter's group. Returns the caller's new `groupId`. */
export const ACCEPT_INVITE_MUTATION = gql`
  mutation acceptInvite($inviterEmail: String!) {
    acceptInvite(inviterEmail: $inviterEmail) {
      email
      groupId
    }
  }
`;

export const DECLINE_INVITE_MUTATION = gql`
  mutation declineInvite {
    declineInvite {
      email
      groupId
    }
  }
`;

export const LEAVE_GROUP_MUTATION = gql`
  mutation leaveGroup {
    leaveGroup {
      email
      groupId
    }
  }
`;

export default {
  SHOW_INVITE_QUERY,
  GROUP_MEMBERS_QUERY,
  GROUP_MEMBER_ROUTINES_QUERY,
  MY_ROUTINES_QUERY,
  PENDING_INVITES_QUERY,
  SEND_INVITE_MUTATION,
  CANCEL_INVITE_MUTATION,
  ACCEPT_INVITE_MUTATION,
  DECLINE_INVITE_MUTATION,
  LEAVE_GROUP_MUTATION,
};
