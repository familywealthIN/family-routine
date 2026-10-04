<template>
  <!--
    One row of the Groups member list.

    Three readings stacked: who they are (ring + avatar + YOU), what they are
    doing right now (pulsing orange dot while live), and how the last seven days
    went. A pending invite reuses the same row with `pending` — grey `@` avatar,
    no ring, no dots, no score, a Cancel pill instead.
  -->
  <div
    class="rn-gmrow"
    :class="{ 'rn-gmrow--selected': selected, 'rn-gmrow--pending': pending, 'rn-gmrow--divided': divided }"
    :data-testid="pending ? 'group-pending-row' : 'group-member-row'"
    :data-email="email"
    @click="onOpen"
  >
    <div class="rn-gmrow__avatar-wrap">
      <progress-ring
        v-if="!pending"
        data-testid="group-member-ring"
        :size="ring.size"
        :view-box="ring.viewBox"
        :r="ring.r"
        :stroke="ring.stroke"
        :track-color="ring.track"
        :value="todayScore"
        :color="ringColor"
      />
      <div class="rn-gmrow__avatar" :style="{ background: avatarBg }">
        <img
          v-if="picture"
          class="rn-gmrow__avatar-img"
          :src="picture"
          :alt="name"
          @error="onImageError"
        />
        <template v-else>{{ glyph }}</template>
      </div>
    </div>

    <div class="rn-gmrow__text">
      <div class="rn-gmrow__name-row">
        <div class="rn-gmrow__name">{{ name }}</div>
        <div v-if="you" class="rn-gmrow__you" data-testid="group-member-you">YOU</div>
      </div>
      <div class="rn-gmrow__now" :style="{ color: nowColor }" data-testid="group-member-now">
        <span v-if="live" class="rn-gmrow__live" data-testid="group-member-live"></span>
        <span class="rn-gmrow__now-text">{{ nowText }}</span>
      </div>
      <div v-if="dots.length" class="rn-gmrow__dots" data-testid="group-member-dots">
        <div
          v-for="dot in dots"
          :key="dot.key"
          class="rn-gmrow__dot"
          :class="{ 'rn-gmrow__dot--today': dot.isToday }"
          :title="dot.title"
          :style="{ background: dot.bg }"
        >
          <i v-if="dot.icon" class="rn-mi rn-gmrow__dot-icon">{{ dot.icon }}</i>
        </div>
      </div>
    </div>

    <div v-if="!pending" class="rn-gmrow__score" data-testid="group-member-score">
      <div class="rn-gmrow__score-value">{{ todayScore }}%</div>
      <div class="rn-gmrow__score-label">today</div>
    </div>

    <button
      v-else
      type="button"
      class="rn-gmrow__cancel"
      data-testid="group-pending-cancel"
      @click.stop="$emit('cancel')"
    >
      Cancel
    </button>
  </div>
</template>

<script>
import ProgressRing from '../../molecules/ProgressRing/ProgressRing.vue';
import {
  MEMBER_RING, PENDING_AVATAR_COLOR, initials, scoreColor,
} from '../../constants/groups';

export default {
  name: 'OrganismGroupMemberRow',
  components: { ProgressRing },
  props: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    picture: { type: String, default: '' },
    /** Avatar fill. Derived per-email by the page (`avatarColor`). */
    color: { type: String, default: '#288bd5' },
    you: { type: Boolean, default: false },
    /** Today's banked percentage — also the ring's value. */
    todayScore: { type: Number, default: 0 },
    /** "In Start Work · 3 of 5 done" / "Next: Lunch Walk at 12:30". */
    nowText: { type: String, default: '' },
    /** In a routine right now: the 6px orange dot pulses. */
    live: { type: Boolean, default: false },
    /** Seven `{ key, title, bg, icon, isToday }` from `sevenDayDots`. */
    dots: { type: Array, default: () => [] },
    /** A sent invite: no ring, no dots, no score — a Cancel pill. */
    pending: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    /** Hairline above every row but the first. */
    divided: { type: Boolean, default: false },
  },
  computed: {
    ring() {
      return MEMBER_RING;
    },
    ringColor() {
      return scoreColor(this.todayScore);
    },
    avatarBg() {
      return this.pending ? PENDING_AVATAR_COLOR : this.color;
    },
    glyph() {
      return this.pending ? '@' : initials(this.name || this.email);
    },
    nowColor() {
      if (this.pending) return 'rgba(0,0,0,.45)';
      return this.live ? '#e68900' : 'rgba(0,0,0,.55)';
    },
  },
  methods: {
    onOpen() {
      if (this.pending) return;
      this.$emit('open', this.email);
    },
    onImageError(event) {
      event.target.style.display = 'none';
    },
  },
};
</script>

<style>
.rn-gmrow {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 6px 8px;
  border-radius: 12px;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-gmrow--divided {
  border-top: 1px solid rgba(0, 0, 0, .05);
}

.rn-gmrow:hover {
  background: #fafafa;
}

.rn-gmrow--selected,
.rn-gmrow--selected:hover {
  background: rgba(40, 139, 213, .06);
}

.rn-gmrow--pending,
.rn-gmrow--pending:hover {
  cursor: default;
  background: transparent;
}

.rn-gmrow__avatar-wrap {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

/* The ring is the layer BEHIND the avatar, so it has to leave the flow. */
.rn-gmrow__avatar-wrap .rn-ring {
  position: absolute;
  top: 0;
  left: 0;
}

.rn-gmrow__avatar {
  position: absolute;
  top: 5px;
  right: 5px;
  bottom: 5px;
  left: 5px;
  border-radius: 50%;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.rn-gmrow__avatar-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rn-gmrow__text {
  flex: 1;
  min-width: 0;
}

.rn-gmrow__name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rn-gmrow__name {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-gmrow__you {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .06);
  color: rgba(0, 0, 0, .55);
  flex-shrink: 0;
}

.rn-gmrow__now {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
}

.rn-gmrow__now-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-gmrow__live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #FF9800;
  animation: rn-pulse 1.4s ease-in-out infinite;
  flex-shrink: 0;
}

.rn-gmrow__dots {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.rn-gmrow__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-gmrow__dot-icon {
  font-size: 11px;
}

.rn-gmrow__score {
  text-align: right;
  flex-shrink: 0;
}

.rn-gmrow__score-value {
  font-size: 15px;
  font-weight: 700;
}

.rn-gmrow__score-label {
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
}

.rn-gmrow__cancel {
  flex-shrink: 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .55);
  padding: 6px 10px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, .12);
  background: transparent;
  cursor: pointer;
}
</style>
