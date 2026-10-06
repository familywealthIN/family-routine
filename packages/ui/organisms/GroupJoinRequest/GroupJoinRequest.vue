<template>
  <!--
    Someone has invited you into their group. Accepting leaves the group you are
    in now, which is why the card says so under the buttons rather than in a
    toast after the fact.
  -->
  <section class="rn-gjoin" data-testid="group-join-request">
    <div class="rn-gjoin__head">
      <div class="rn-gjoin__glyph"><i class="rn-mi">mail</i></div>
      <div class="rn-gjoin__text">
        <div class="rn-gjoin__title">Join request</div>
        <div class="rn-gjoin__sub">{{ inviterEmail }} invited you to their group</div>
      </div>
    </div>
    <div class="rn-gjoin__actions">
      <button
        type="button"
        class="rn-gjoin__btn rn-gjoin__btn--ghost"
        data-testid="group-join-decline"
        @click="$emit('decline')"
      >
        Decline
      </button>
      <button
        type="button"
        class="rn-gjoin__btn rn-gjoin__btn--primary"
        data-testid="group-join-accept"
        @click="$emit('accept')"
      >
        Accept
      </button>
    </div>
    <div class="rn-gjoin__note">{{ note }}</div>
  </section>
</template>

<script>
export default {
  name: 'OrganismGroupJoinRequest',
  props: {
    inviterEmail: { type: String, default: '' },
    /** Omitted when you are not in a group yet — there is nothing to leave. */
    inGroup: { type: Boolean, default: true },
  },
  computed: {
    note() {
      return this.inGroup
        ? 'Accepting leaves your current group.'
        : 'You will start sharing daily scores with them.';
    },
  },
};
</script>

<style>
.rn-gjoin {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-shell--tablet .rn-gjoin,
.rn-shell--desktop .rn-gjoin {
  border-radius: 20px;
}

.rn-gjoin__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rn-gjoin__glyph {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(40, 139, 213, .12);
  color: #1f6fab;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rn-gjoin__glyph .rn-mi {
  font-size: 20px;
}

.rn-gjoin__text {
  flex: 1;
  min-width: 0;
}

.rn-gjoin__title {
  font-size: 14px;
  font-weight: 700;
}

.rn-gjoin__sub {
  font-size: 13px;
  color: rgba(0, 0, 0, .6);
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-gjoin__actions {
  display: flex;
  gap: 8px;
}

.rn-gjoin__btn {
  flex: 1;
  height: 40px;
  border-radius: 14px;
  border: 0;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.rn-gjoin__btn--ghost {
  border: 1px solid rgba(0, 0, 0, .15);
  background: transparent;
  color: rgba(0, 0, 0, .7);
}

.rn-gjoin__btn--primary {
  background: #288bd5;
  color: #fff;
}

.rn-gjoin__note {
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
}
</style>
