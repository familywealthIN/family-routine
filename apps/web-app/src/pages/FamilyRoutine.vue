<template>
  <app-shell-container
    class="rn-groups"
    active="groups"
    title="Group"
    :subtitle="subLabel"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <template v-slot:header-actions>
      <!-- The person-add glyph alone on phone, as every header action is;
           labelled where there is room. -->
      <div
        class="rn-shell__act"
        :class="[
          isFull || loadFailed ? 'rn-shell__act--muted' : 'rn-shell__act--primary',
          isPhone ? 'rn-shell__act--icon' : 'rn-shell__act--label',
        ]"
        title="Invite member"
        data-testid="groups-invite-button"
        @click="openInvite"
      >
        <i class="rn-mi rn-shell__act-glyph">person_add</i>
        <span v-if="!isPhone">Invite</span>
      </div>
    </template>

    <!-- The root read: who I am, which group, who invited me. -->
    <group-identity-container
      ref="identity"
      @identity="onIdentity"
      @failed="onIdentityFailed"
    />
    <!-- The invites you sent that are still open, and the unit that withdraws one. -->
    <group-pending-invites-container ref="pendingInvites" @pending="onPending" />
    <group-invite-cancel-container ref="cancelInvite" />

    <div class="rn-groups__layout" :class="`rn-groups__layout--${shell}`" data-testid="groups-page">
      <div class="rn-groups__list-col">
        <group-join-request-container
          v-if="inviterEmail"
          :inviter-email="inviterEmail"
          :in-group="!!groupId"
          @accepted="onInviteAccepted"
          @declined="onInviteDeclined"
          @failed="onInviteResponseFailed"
        />

        <!-- With the root read failed, membership is unknown: no member rows or
             pulse built on a guess (they drew 0% today / a 1-day streak). -->
        <load-error-state
          v-if="loadFailed"
          class="rn-groups__load-error"
          message="Couldn't load your group."
          data-testid="groups-load-error"
          @retry="refreshIdentity"
        />

        <group-pulse-container
          v-if="!loadFailed"
          :members="members"
          :stats="memberStats"
          :my-email="myEmail"
        />

        <group-members-container
          v-if="!loadFailed"
          :group-id="groupId"
          :me="me"
          :pending="pending"
          :stats="memberStats"
          :selected-email="selectedEmail"
          :today="today"
          :now-minutes="nowMinutes"
          :full="isFull"
          @members="onMembers"
          @stats="onMemberStats"
          @open="openMember"
          @invite="openInvite"
          @cancel-invite="cancelInvite"
        />

        <div
          v-if="groupId"
          class="rn-groups__leave"
          data-testid="groups-leave-button"
          @click="sheet = 'leave'"
        >
          <i class="rn-mi rn-groups__leave-glyph">logout</i>Leave group
        </div>
      </div>

      <!-- Tablet / desktop: the detail panel is permanently beside the list. -->
      <div v-if="!isPhone" class="rn-groups__detail-col" data-testid="groups-detail-pane">
        <div class="rn-groups__panel">
          <group-member-week-container
            v-if="selectedMember && !loadFailed"
            :key="selectedMember.email"
            :group-id="groupId"
            :email="selectedMember.email"
            :name="selectedMember.name"
            :picture="selectedMember.picture"
            :you="isMe(selectedMember)"
            :today="today"
            :now-minutes="nowMinutes"
          />
        </div>
      </div>
    </div>

    <!-- Phone: the same panel, in a near-full-height sheet. -->
    <responsive-sheet
      v-if="isPhone"
      class="rn-groups__member-sheet"
      :open="sheet === 'member' && !!selectedMember"
      shell="phone"
      :closable="false"
      data-testid="groups-detail-sheet"
      @close="closeSheet"
    >
      <group-member-week-container
        v-if="selectedMember && !loadFailed"
        :key="selectedMember.email"
        :group-id="groupId"
        :email="selectedMember.email"
        :name="selectedMember.name"
        :picture="selectedMember.picture"
        :you="isMe(selectedMember)"
        :today="today"
        :now-minutes="nowMinutes"
        closable
        @close="closeSheet"
      />
    </responsive-sheet>

    <group-invite-container
      :open="sheet === 'invite'"
      :shell="shell"
      :taken="takenEmails"
      :slots-left="slotsRemaining"
      :full="isFull"
      @sent="onInviteSent"
      @failed="onInviteFailed"
      @close="closeSheet"
    />

    <group-leave-container
      :open="sheet === 'leave'"
      :shell="shell"
      :others-names="othersNames"
      @left="onLeft"
      @failed="onLeaveFailed"
      @close="closeSheet"
    />

    <app-toast
      :shell="shell"
      :title="toast.title"
      :sub="toast.sub"
      :icon="toast.icon"
      :icon-color="toast.color"
      :seq="toast.seq"
      @done="clearToast"
    />
  </app-shell-container>
</template>

<script>
/**
 * Groups — "today together" (`packages/design/Groups.dc.html`).
 *
 * The forest stock photo and its member count are gone; in their place a group
 * pulse, member rows that say what each person is doing right now, and a week
 * grid one tap away. Leaving the group asks in a sheet, never a browser
 * `confirm()`.
 *
 * ## No GraphQL lives here
 *
 * The page composes containers and owns layout, the one clock, and the overlay
 * that is open (ARCHITECTURE.md §1). Every read and write is a container:
 * `AppShellContainer` (the chassis shell plus the header's points read),
 * `GroupIdentityContainer` (who/which group), `GroupMembersContainer` (the
 * roster), one `GroupMemberRowContainer` per member, `GroupMemberWeekContainer`
 * (the selected week), and the four write containers — invite, leave, accept,
 * decline.
 *
 * What the page does own is **cross-container orchestration** (§6): accepting an
 * invite changes which group every container below reads, so the page clears the
 * derived state and asks the identity container to re-read.
 *
 * ## Pending invites come from the server
 *
 * `sendInvite` stamps `inviterEmail` on the invitee; `pendingInvites` lists the
 * invites *you* sent that are still open (`GroupPendingInvitesContainer`), and
 * `cancelInvite` withdraws one (`GroupInviteCancelContainer`). A declined or
 * cancelled invite clears the invitee's `inviterEmail`, so it drops out and
 * frees its slot on every device. The 10-member cap counts them, exactly as the
 * design says: `slots = 10 - (members + pending)`.
 */
import AppToast from '@routine-notes/ui/molecules/AppToast/AppToast.vue';
import ResponsiveSheet from '@routine-notes/ui/molecules/ResponsiveSheet/ResponsiveSheet.vue';
import LoadErrorState from '@routine-notes/ui/molecules/LoadErrorState/LoadErrorState.vue';
import {
  MEMBER_CAP, FULL_LABEL, slotsLeft, isGroupFull,
} from '@routine-notes/ui/constants/groups';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import moment from 'moment';
import { signOut } from '../utils/signOut';
import { DAY_FORMAT, otherNames } from '../utils/groupModel';
import AppShellContainer from '../containers/AppShellContainer.vue';
import GroupIdentityContainer from '../containers/GroupIdentityContainer.vue';
import GroupPulseContainer from '../containers/GroupPulseContainer.vue';
import GroupMembersContainer from '../containers/GroupMembersContainer.vue';
import GroupMemberWeekContainer from '../containers/GroupMemberWeekContainer.vue';
import GroupInviteContainer from '../containers/GroupInviteContainer.vue';
import GroupLeaveContainer from '../containers/GroupLeaveContainer.vue';
import GroupJoinRequestContainer from '../containers/GroupJoinRequestContainer.vue';
import GroupPendingInvitesContainer from '../containers/GroupPendingInvitesContainer.vue';
import GroupInviteCancelContainer from '../containers/GroupInviteCancelContainer.vue';

/** The clock behind "In Start Work" / "12 min ago". A minute is granular enough. */
const CLOCK_MS = 60000;

const lower = (email) => String(email || '').toLowerCase();

export default {
  name: 'FamilyRoutine',
  components: {
    LoadErrorState,
    AppShellContainer,
    AppToast,
    ResponsiveSheet,
    GroupIdentityContainer,
    GroupPulseContainer,
    GroupMembersContainer,
    GroupMemberWeekContainer,
    GroupInviteContainer,
    GroupLeaveContainer,
    GroupJoinRequestContainer,
    GroupPendingInvitesContainer,
    GroupInviteCancelContainer,
  },
  data() {
    const now = moment();
    return {
      /** From GroupIdentityContainer: `{ me, groupId, inviterEmail, loaded }`. */
      identity: {
        me: {}, groupId: '', inviterEmail: '', loaded: false,
      },
      /** The identity read failed and nothing is known about your group. */
      identityFailed: false,
      today: now.format(DAY_FORMAT),
      nowMinutes: now.hours() * 60 + now.minutes(),
      clockId: null,
      /** `{ name, email, picture }` per member, reported by the members container. */
      members: [],
      /** email -> row stats, reported by each member row container. */
      memberStats: {},
      /** `{ id, email, name, picture }` per open sent invite, from the server. */
      pending: [],
      /** Lower-cased emails whose `cancelInvite` is in flight. */
      cancelling: [],
      selectedEmail: '',
      /** 'invite' | 'leave' | 'member' | null — one overlay at a time. */
      sheet: null,
      toast: {
        title: '', sub: '', icon: 'check_circle', color: '#4CAF50', seq: 0,
      },
    };
  },
  computed: {
    shell() {
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    isPhone() {
      return this.shell === 'phone';
    },
    /** The server's record wins; `$root.$data` covers the first paint. */
    me() {
      const root = this.$root.$data || {};
      const user = this.identity.me || {};
      return {
        name: user.name || root.name || '',
        email: user.email || root.email || '',
        picture: user.picture || root.picture || '',
      };
    },
    myEmail() {
      return this.me.email;
    },
    groupId() {
      return this.identity.groupId;
    },
    inviterEmail() {
      return this.identity.inviterEmail;
    },
    slotsRemaining() {
      return slotsLeft(this.members.length, this.pending.length);
    },
    isFull() {
      return isGroupFull(this.members.length, this.pending.length);
    },
    /**
     * The root read failed with nothing cached: whether you are in a group, and
     * with whom, is unknown — so the page must not claim "1 member · 9 spots
     * left" or offer an invite built on that guess.
     */
    loadFailed() {
      return this.identityFailed && !this.identity.loaded;
    },
    subLabel() {
      if (this.loadFailed) return 'Could not load your group';
      if (this.identity.loaded && !this.groupId) return 'You’re not in a group';
      if (this.isFull) return FULL_LABEL;
      const count = this.members.length;
      const slots = this.slotsRemaining;
      return `${count} member${count === 1 ? '' : 's'} · ${slots} spot${slots === 1 ? '' : 's'} left`;
    },
    /** Already a member or already invited — the invite form's duplicate check. */
    takenEmails() {
      return this.members.map((member) => member.email)
        .concat(this.pending.map((invite) => invite.email));
    },
    othersNames() {
      return otherNames(this.members, this.myEmail);
    },
    selectedMember() {
      if (!this.members.length) return null;
      const chosen = this.members.find((member) => member.email === this.selectedEmail);
      if (chosen) return chosen;
      // Default to someone else's week — your own day is the Home screen's job.
      return this.members.find((member) => member.email !== this.myEmail) || this.members[0];
    },
  },
  created() {
    this.clockId = setInterval(this.tickClock, CLOCK_MS);
  },
  beforeDestroy() {
    if (this.clockId) clearInterval(this.clockId);
  },
  methods: {
    // ---- shell -------------------------------------------------------------
    onNavigate(key, item) {
      const route = item && item.route;
      if (!route || (this.$route && this.$route.path === route)) return;
      this.$router.push(route).catch(() => {});
    },
    onSignOut() {
      signOut(this);
    },

    // ---- clock -------------------------------------------------------------
    tickClock() {
      const now = moment();
      this.nowMinutes = now.hours() * 60 + now.minutes();
      const date = now.format(DAY_FORMAT);
      // Midnight rollover: every derivation keys off `today`, so moving it IS the
      // whole of this page's new-day reset.
      if (date !== this.today) this.today = date;
    },

    // ---- container feedback ------------------------------------------------
    onIdentity(identity) {
      this.identity = identity;
      if (identity && identity.loaded) this.identityFailed = false;
    },
    onIdentityFailed() {
      this.identityFailed = true;
      this.showToast({
        title: 'Could not load your group',
        sub: 'Check your connection and try again',
        icon: 'cloud_off',
        color: '#ef9a9a',
      });
    },
    onMembers(members) {
      this.members = members || [];
      this.syncPending();
    },
    onMemberStats(stats) {
      if (!stats || !stats.email) return;
      // Replace the map: a new key on an existing object is not reactive in Vue 2.
      this.memberStats = { ...this.memberStats, [stats.email]: stats };
    },

    // ---- member detail -----------------------------------------------------
    openMember(email) {
      this.selectedEmail = email;
      if (this.isPhone) this.sheet = 'member';
    },
    closeSheet() {
      this.sheet = null;
    },

    // ---- invites -----------------------------------------------------------
    onPending(list) {
      this.pending = list || [];
      this.syncPending();
    },
    /** Drop any invite whose person has since joined (the roster may land first). */
    syncPending() {
      const emails = this.members.map((member) => lower(member.email));
      const kept = this.pending.filter((invite) => emails.indexOf(lower(invite.email)) === -1);
      if (kept.length !== this.pending.length) this.pending = kept;
    },
    refreshPending() {
      const { pendingInvites } = this.$refs;
      if (pendingInvites && pendingInvites.refresh) pendingInvites.refresh();
    },
    openInvite() {
      if (this.loadFailed) {
        // Nothing to invite into yet: say so, and try the read again.
        this.showToast({
          title: 'Could not load your group',
          sub: 'Retrying — try inviting again in a moment',
          icon: 'cloud_off',
          color: '#ef9a9a',
        });
        this.refreshIdentity();
        return;
      }
      if (this.isFull) {
        this.showToast({
          title: 'Group is full',
          sub: `${MEMBER_CAP} members max`,
          icon: 'block',
          color: '#ffb74d',
        });
        return;
      }
      this.sheet = 'invite';
    },
    onInviteSent(email) {
      // Optimistic row until the server's list comes back with it.
      if (!this.pending.some((invite) => lower(invite.email) === lower(email))) {
        this.pending = this.pending.concat([{
          id: lower(email), email, name: '', picture: '',
        }]);
      }
      this.refreshPending();
      this.sheet = null;
      this.showToast({
        title: 'Invite sent', sub: email, icon: 'send', color: '#64b5f6',
      });
      // Sending your first invite is what MINTS a group for you, so re-read the
      // root: `groupId` goes from empty to real and the roster starts loading.
      if (!this.groupId) this.refreshIdentity();
    },
    onInviteFailed(failure) {
      this.showToast({
        title: 'Invite not sent',
        sub: failure.reason,
        icon: 'error_outline',
        color: '#ef9a9a',
      });
    },
    /**
     * Withdraw the invite on the server; the row goes only once it agrees, so
     * "Invite cancelled" is never shown for an invite that is still live.
     */
    cancelInvite(invite) {
      const key = lower(invite && invite.email);
      const unit = this.$refs.cancelInvite;
      if (!key || !unit || this.cancelling.indexOf(key) !== -1) return Promise.resolve(false);
      this.cancelling = this.cancelling.concat([key]);
      return unit.run(invite.email).then((ok) => {
        this.cancelling = this.cancelling.filter((item) => item !== key);
        if (ok) {
          this.pending = this.pending.filter((item) => lower(item.email) !== key);
          this.showToast({
            title: 'Invite cancelled',
            sub: invite.email,
            icon: 'cancel_schedule_send',
            color: '#bdbdbd',
          });
        } else {
          this.showToast({
            title: 'Could not cancel that invite',
            sub: 'Try again in a moment',
            icon: 'error_outline',
            color: '#ef9a9a',
          });
        }
        // Either way, re-read the server's list: a failure may mean the invite
        // was already accepted, declined or cancelled elsewhere.
        this.refreshPending();
        return ok;
      });
    },

    // ---- join request ------------------------------------------------------
    onInviteAccepted({ inviterEmail, groupId }) {
      // The real switch the mock skipped: clear what was derived from the group we
      // just left, then re-read the root so every container re-queries.
      this.resetGroupState();
      this.refreshIdentity();
      // "Still pending" is relative to your group, which just changed.
      this.refreshPending();
      this.showToast({
        title: `You joined ${inviterEmail}’s group`,
        sub: groupId ? 'Your scores are now shared there' : 'Reloading your group',
        icon: 'group_add',
        color: '#81c784',
      });
    },
    onInviteDeclined(inviterEmail) {
      this.refreshIdentity();
      this.showToast({
        title: 'Invite declined', sub: inviterEmail, icon: 'close', color: '#bdbdbd',
      });
    },
    onInviteResponseFailed(which) {
      this.showToast({
        title: which === 'accept' ? 'Could not join that group' : 'Could not decline',
        sub: 'Try again in a moment',
        icon: 'error_outline',
        color: '#ef9a9a',
      });
    },

    // ---- leaving -----------------------------------------------------------
    onLeft() {
      this.sheet = null;
      this.resetGroupState();
      this.pending = [];
      this.refreshIdentity();
      this.refreshPending();
      this.showToast({
        title: 'You left the group',
        sub: 'Your routines and history are unchanged',
        icon: 'logout',
        color: '#ef9a9a',
      });
    },
    onLeaveFailed() {
      this.sheet = null;
      this.showToast({
        title: 'Could not leave the group',
        sub: 'Try again in a moment',
        icon: 'error_outline',
        color: '#ef9a9a',
      });
    },

    // ---- plumbing ----------------------------------------------------------
    isMe(member) {
      return !!member && !!this.myEmail
        && String(member.email || '').toLowerCase() === String(this.myEmail).toLowerCase();
    },
    resetGroupState() {
      this.members = [];
      this.memberStats = {};
      this.selectedEmail = '';
    },
    refreshIdentity() {
      const { identity } = this.$refs;
      if (identity && identity.refresh) identity.refresh();
    },
    showToast({
      title, sub, icon, color,
    }) {
      this.toast = {
        title,
        sub,
        icon: icon || 'check_circle',
        color: color || '#4CAF50',
        seq: this.toast.seq + 1,
      };
    },
    clearToast() {
      this.toast = { ...this.toast, title: '', sub: '' };
    },
  },
};
</script>

<style>
/* Root-class-prefixed so none of this leaks into the rest of the app. */
.rn-groups .rn-groups__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-content: start;
}

/* Tablet / desktop: the list takes 3, the member panel 2, and the panel stays
   put while the list scrolls — the design keeps it permanently visible. */
.rn-groups .rn-groups__layout--tablet,
.rn-groups .rn-groups__layout--desktop {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.rn-groups .rn-groups__list-col {
  flex: 3 1 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: max-content;
  gap: 12px;
  align-content: start;
}

.rn-groups .rn-groups__detail-col {
  flex: 2 1 0;
  min-width: 0;
  position: sticky;
  top: 0;
}

.rn-groups .rn-groups__panel {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
  padding: 8px 20px 20px;
  min-height: 120px;
}

.rn-groups .rn-groups__leave {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  border-radius: 14px;
  color: #d32f2f;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.rn-groups .rn-groups__leave:hover {
  background: rgba(211, 47, 47, .06);
}

/* The member sheet is the one sheet that is nearly full height: the week grid
   needs the room, and the 56px gap keeps the page it came from in sight. */
.rn-groups__member-sheet .rn-rsheet__panel--sheet {
  top: 56px;
  max-height: none;
  border-radius: 20px 20px 0 0;
}
</style>
