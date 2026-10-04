<template>
  <!--
    Who you are, at the top of Profile (`Profile and About.dc.html` § PP/PT/PD).

    `points` and `streakDays` are OPTIONAL and default to "unknown" rather than
    0: printing a confident 0 at a user with hundreds of points is the
    unknown-vs-zero defect D-10, and Profile has no owner for either figure
    today (`AppShellContainer` owns the one `xpBalance` read, and no query
    returns a streak at all). A chip appears only when a real number arrives.
  -->
  <section class="rn-pid" data-testid="profile-identity">
    <img
      class="rn-pid__avatar"
      :src="avatarSrc"
      :alt="avatarAlt"
      data-testid="profile-identity-avatar"
      @error="onAvatarError"
    />

    <div class="rn-pid__text">
      <div class="rn-pid__name" data-testid="profile-identity-name">{{ displayName }}</div>
      <div class="rn-pid__email" data-testid="profile-identity-email">{{ email }}</div>

      <div v-if="hasChips" class="rn-pid__chips">
        <div v-if="hasPoints" class="rn-pid__chip rn-pid__chip--points" data-testid="profile-identity-points">
          <i class="rn-mi rn-pid__chip-glyph">diamond</i>{{ pointsLabel }}
        </div>
        <div v-if="hasStreak" class="rn-pid__chip rn-pid__chip--streak" data-testid="profile-identity-streak">
          <i class="rn-mi rn-pid__chip-glyph">local_fire_department</i>{{ streakLabel }}
        </div>
      </div>
    </div>

    <button
      type="button"
      class="rn-pid__signout"
      data-testid="profile-identity-signout"
      @click="$emit('sign-out')"
    >
      Sign out
    </button>
  </section>
</template>

<script>
/** Same asset the shell falls back to, so a broken picture looks the same twice. */
const FALLBACK_AVATAR = '/img/default-user.png';

export default {
  name: 'MoleculeProfileIdentityCard',
  props: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    picture: { type: String, default: '' },
    /** Null = not read. Only a real number draws the chip. */
    points: { type: Number, default: null },
    streakDays: { type: Number, default: 0 },
  },
  computed: {
    /**
     * No invented name: the app's own name in the identity slot read as if the
     * user were called "Routine Notes". An unknown name renders empty.
     */
    displayName() {
      return this.name || '';
    },
    avatarSrc() {
      return this.picture || FALLBACK_AVATAR;
    },
    avatarAlt() {
      return `Profile picture of ${this.name || 'User'}`;
    },
    hasPoints() {
      return typeof this.points === 'number' && Number.isFinite(this.points);
    },
    hasStreak() {
      return this.streakDays > 0;
    },
    hasChips() {
      return this.hasPoints || this.hasStreak;
    },
    pointsLabel() {
      return Math.round(this.points).toLocaleString();
    },
    streakLabel() {
      return `${this.streakDays}-day streak`;
    },
  },
  methods: {
    onAvatarError(event) {
      if (event && event.target) event.target.src = FALLBACK_AVATAR;
    },
  },
};
</script>

<style>
.rn-pid {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-pid__avatar {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.rn-pid__text {
  flex: 1;
  min-width: 0;
}

.rn-pid__name {
  font-size: 18px;
  font-weight: 700;
}

.rn-pid__email {
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-pid__chips {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.rn-pid__chip {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.rn-pid__chip--points {
  background: #288bd5;
  color: #fff;
}

.rn-pid__chip--streak {
  background: rgba(255, 152, 0, .12);
  color: #b26a00;
}

.rn-pid__chip-glyph {
  font-size: 14px;
}

.rn-pid__signout {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  padding: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
}
</style>
