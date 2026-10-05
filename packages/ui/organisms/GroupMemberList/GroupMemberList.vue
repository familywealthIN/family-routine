<template>
  <!--
    The members card: a header, the member rows (passed in through the default
    slot so each one can own its own read), the pending-invite rows, and the
    in-list "Invite someone" row that dims and relabels when the group is full.
  -->
  <section class="rn-gmlist" data-testid="group-member-list">
    <div class="rn-gmlist__head">
      <div class="rn-gmlist__eyebrow">MEMBERS · TODAY</div>
      <div class="rn-gmlist__hint">Last 7 days</div>
    </div>

    <slot></slot>

    <group-member-row
      v-for="invite in pending"
      :key="invite.id"
      pending
      divided
      :name="invite.name || invite.email"
      :email="invite.email"
      now-text="Invite sent · waiting to join"
      @cancel="$emit('cancel-invite', invite)"
    />

    <p v-if="empty" class="rn-gmlist__empty" data-testid="group-member-list-empty">
      {{ emptyText }}
    </p>

    <div
      class="rn-gmlist__invite"
      :class="{ 'rn-gmlist__invite--full': full }"
      data-testid="group-invite-row"
      @click="$emit('invite')"
    >
      <i class="rn-mi rn-gmlist__invite-glyph">person_add_alt</i>{{ inviteLabel }}
    </div>
  </section>
</template>

<script>
import GroupMemberRow from '../GroupMemberRow/GroupMemberRow.vue';
import { FULL_LABEL, INVITE_LABEL } from '../../constants/groups';

export default {
  name: 'OrganismGroupMemberList',
  components: { GroupMemberRow },
  props: {
    /** Sent invites awaiting acceptance: `{ id, email }`. */
    pending: { type: Array, default: () => [] },
    /** 10 members + pending. Dims the row and swaps its label. */
    full: { type: Boolean, default: false },
    /** No members and no pending invites — say so instead of showing a gap. */
    empty: { type: Boolean, default: false },
    emptyText: { type: String, default: 'No one here yet. Invite someone to compare days with.' },
  },
  computed: {
    inviteLabel() {
      return this.full ? FULL_LABEL : INVITE_LABEL;
    },
  },
};
</script>

<style>
.rn-gmlist {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
  padding: 6px 8px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-shell--tablet .rn-gmlist,
.rn-shell--desktop .rn-gmlist {
  border-radius: 20px;
}

.rn-gmlist__head {
  display: flex;
  align-items: center;
  padding: 8px 8px 4px;
}

.rn-gmlist__eyebrow {
  flex: 1;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-gmlist__hint {
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
}

.rn-gmlist__empty {
  margin: 0;
  padding: 18px 10px;
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
  text-align: center;
}

.rn-gmlist__invite {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 0 8px 0 18px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  color: #288bd5;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.rn-gmlist__invite--full {
  color: rgba(0, 0, 0, .35);
}

.rn-gmlist__invite-glyph {
  font-size: 24px;
}
</style>
