<template>
  <!--
    The agent lifecycle ring (Agents.dc.html; chassis § Rings / § Motion).

    A 42px avatar carrying `inset 0 0 0 2px {stage colour}` — a static ring that
    breathes ONLY while the agent is running or listening, so "something is
    happening" is a motion signal and not another badge to read. Everything else
    (waiting, firing, finished, failed) is still.

    Stage tokens come from `constants/routineFocus.js` AGENT_STAGES /
    AGENT_LIVE_STAGES. This component adds no stage list of its own.

    Why the pulse is a separate layer: `rn-breathe` is already defined in
    styles/routine-focus.css as a scale+fade expanding ring, and
    `RoutineFocusCard` / `RoutineTopBar` both ship against that definition.
    Redefining it as a box-shadow pulse (the way the Agents mock does) would
    break those two. So the chassis animation `rn-breathe 1.8s ease-in-out
    infinite` is applied to a ring layer sitting over the avatar — which is
    exactly what that keyframe draws — while the avatar itself keeps the static
    inset ring and never scales.
  -->
  <div
    class="rn-status"
    :style="rootStyle"
    :title="title || undefined"
    data-testid="status-ring"
    :data-stage="stage"
    @click="$emit('click')"
  >
    <span
      v-if="breathing"
      class="rn-status__pulse"
      data-testid="status-ring-pulse"
      :style="pulseStyle"
    ></span>
    <span
      class="rn-status__face"
      data-testid="status-ring-face"
      :style="faceStyle"
      :aria-busy="live ? 'true' : 'false'"
    >
      <slot>
        <i
          v-if="resolvedGlyph"
          class="rn-mi rn-status__glyph"
          :style="glyphStyle"
        >{{ resolvedGlyph }}</i>
      </slot>
    </span>
  </div>
</template>

<script>
import { AGENT_STAGES, AGENT_LIVE_STAGES } from '../../constants/routineFocus';

/** The chassis motion table pins the pulse to 1.8s regardless of stage. */
const BREATHE = 'rn-breathe 1.8s ease-in-out infinite';

/** `#rrggbb` -> `rgba(r,g,b,a)`. Every chassis tint is the colour at 12%. */
function tintOf(hex, alpha) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!match) return 'transparent';
  const int = parseInt(match[1], 16);
  /* eslint-disable no-bitwise */
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  /* eslint-enable no-bitwise */
  return `rgba(${r},${g},${b},${alpha})`;
}

export default {
  name: 'MoleculeStatusRing',
  props: {
    /** An AGENT_STAGES key: waiting | running | listening | firing | finished | failed. */
    stage: { type: String, default: null },
    /** Avatar diameter. 42 on a list card, 48 in the detail header. */
    size: { type: Number, default: 42 },
    /** Overrides the stage colour. */
    color: { type: String, default: null },
    /** Overrides the derived 12% tint. */
    tint: { type: String, default: null },
    /** Overrides the stage glyph. Ignored when the default slot is filled. */
    glyph: { type: String, default: undefined },
    title: { type: String, default: '' },
  },
  computed: {
    token() {
      return AGENT_STAGES[this.stage] || null;
    },
    /** Still doing something — drives aria-busy and is exposed for hosts. */
    live() {
      return AGENT_LIVE_STAGES.indexOf(this.stage) !== -1;
    },
    /**
     * Chassis motion table: the status ring breathes while running or
     * listening. Narrower than `live` on purpose — a queued (`waiting`) or
     * one-shot (`firing`) agent is not something the user is waiting on here.
     * Deliberately not `AGENT_STAGES[stage].breathe`, which describes the tick
     * BUTTON rings on Home (a different surface with its own per-stage timing).
     */
    breathing() {
      return this.stage === 'running' || this.stage === 'listening';
    },
    resolvedColor() {
      if (this.color) return this.color;
      return this.token ? this.token.color : 'rgba(0,0,0,.24)';
    },
    resolvedTint() {
      if (this.tint) return this.tint;
      return tintOf(this.resolvedColor, '.12');
    },
    resolvedGlyph() {
      if (this.glyph !== undefined) return this.glyph;
      return this.token ? this.token.glyph : '';
    },
    rootStyle() {
      return { width: `${this.size}px`, height: `${this.size}px` };
    },
    /** The avatar never animates — only the ring layer over it does. */
    faceStyle() {
      return {
        background: this.resolvedTint,
        color: this.resolvedColor,
        boxShadow: `inset 0 0 0 2px ${this.resolvedColor}`,
      };
    },
    pulseStyle() {
      return {
        boxShadow: `0 0 0 2px ${this.resolvedColor}`,
        animation: BREATHE,
      };
    },
    glyphStyle() {
      return { fontSize: `${Math.round(this.size * 0.52)}px` };
    },
  },
};
</script>

<style>
.rn-status {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.rn-status__face {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

/* The breathing layer. `rn-breathe` scales and fades this ring out, which is
   why it is a sibling of the avatar and not the avatar itself. */
.rn-status__pulse {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: 50%;
  pointer-events: none;
}

.rn-status__glyph {
  line-height: 1;
}
</style>
