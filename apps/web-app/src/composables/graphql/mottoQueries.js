/**
 * Pending items ("motto") — the original Inbox.
 *
 * Before the redesign the app's inbox was the "Pending Items" dialog
 * (PendingListContainer), opened from the checklist icon in the classic toolbar.
 * Its store is the user's `motto` array (added by the 2020 "moto changes"
 * commit): free-text unplanned tasks, each a `MottoItem { id, mottoItem }`.
 * The redesigned Inbox sheet lists them again alongside the day's routine-less
 * goal items.
 */
import gql from 'graphql-tag';

export const MOTTO_QUERY = gql`
  query motto {
    motto {
      id
      mottoItem
    }
  }
`;

export const ADD_MOTTO_ITEM_MUTATION = gql`
  mutation addMottoItem($mottoItem: String!) {
    addMottoItem(mottoItem: $mottoItem) {
      id
      mottoItem
    }
  }
`;

export const DELETE_MOTTO_ITEM_MUTATION = gql`
  mutation deleteMottoItem($id: ID!) {
    deleteMottoItem(id: $id) {
      id
    }
  }
`;

/** Prefix that keeps a pending row's key apart from a goal item's id. */
export const PENDING_ID_PREFIX = 'pending:';

/**
 * `MottoItem[]` → Inbox rows. De-duped by id (ARCHITECTURE.md §3.6) and
 * stripped of blanks, since the old dialog never validated server-side.
 */
export function toPendingRows(motto) {
  const seen = {};
  return (Array.isArray(motto) ? motto : [])
    .filter((m) => {
      if (!m || m.id == null || seen[m.id]) return false;
      if (!m.mottoItem || !String(m.mottoItem).trim()) return false;
      seen[m.id] = true;
      return true;
    })
    .map((m) => ({
      id: `${PENDING_ID_PREFIX}${m.id}`,
      mottoId: String(m.id),
      kind: 'pending',
      body: m.mottoItem,
      meta: 'Pending · not planned yet',
    }));
}
