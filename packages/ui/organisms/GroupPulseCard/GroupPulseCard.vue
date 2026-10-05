<template>
  <!--
    The group pulse — what replaced the forest stock photo and its member count
    (Groups.dc.html § "What changed from FamilyRoutine.vue").

    Pure: the average and the line are computed by the page's model
    (`utils/groupModel.groupPulse`) so the arithmetic is unit-tested once rather
    than re-derived inside a template.
  -->
  <section class="rn-pulse" data-testid="group-pulse">
    <div class="rn-pulse__eyebrow">GROUP PULSE · THIS WEEK</div>
    <div class="rn-pulse__headline">
      <div class="rn-pulse__value" data-testid="group-pulse-average">
        {{ average }}<span class="rn-pulse__pct">%</span>
      </div>
      <div class="rn-pulse__line" data-testid="group-pulse-line">{{ line }}</div>
    </div>
    <div class="rn-pulse__foot">
      <div class="rn-pulse__stack" data-testid="group-pulse-stack">
        <div
          v-for="(face, index) in faces"
          :key="face.key"
          class="rn-pulse__face"
          :title="face.name"
          :style="faceStyle(face, index)"
        >
          <img
            v-if="face.picture"
            class="rn-pulse__face-img"
            :src="face.picture"
            :alt="face.name"
            @error="onImageError"
          />
          <template v-else>{{ face.initials }}</template>
        </div>
      </div>
      <div class="rn-pulse__recent" data-testid="group-pulse-recent">
        <b>{{ doneCount }}</b> of {{ memberCount }} finished a routine in the last hour
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'OrganismGroupPulseCard',
  props: {
    /** Rounded mean of every member's week average. */
    average: { type: Number, default: 0 },
    /** The pulse sentence — "Strong week…" or "Average across n members…". */
    line: { type: String, default: '' },
    /** `{ key, name, initials, color, picture }` per member who just finished. */
    faces: { type: Array, default: () => [] },
    doneCount: { type: Number, default: 0 },
    memberCount: { type: Number, default: 0 },
  },
  methods: {
    // -8px overlap on every face but the first — the design's stack.
    faceStyle(face, index) {
      return { background: face.color, marginLeft: index ? '-8px' : '0' };
    },
    onImageError(event) {
      // A dead avatar URL falls back to the coloured initials behind it.
      event.target.style.display = 'none';
    },
  },
};
</script>

<style>
.rn-pulse {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
  padding: 16px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-shell--tablet .rn-pulse,
.rn-shell--desktop .rn-pulse {
  border-radius: 20px;
}

.rn-pulse__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-pulse__headline {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.rn-pulse__value {
  font-size: 40px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -1px;
  color: #288bd5;
  flex-shrink: 0;
}

.rn-pulse__pct {
  font-size: 20px;
}

.rn-pulse__line {
  flex: 1;
  min-width: 0;
  padding-bottom: 3px;
  font-size: 13px;
  line-height: 1.35;
  color: rgba(0, 0, 0, .6);
}

.rn-pulse__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, .06);
}

.rn-pulse__stack {
  display: flex;
  flex-shrink: 0;
}

.rn-pulse__face {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #fff;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.rn-pulse__face-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rn-pulse__recent {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}
</style>
