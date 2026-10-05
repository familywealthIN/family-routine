<template>
  <!--
    "Before you start" — the area/project brief pinned as the first item in a
    routine's thread (design handoff § "Areas and projects live in chat").

    The Home host starts it collapsed (the owner wants it minimised) and opens
    it on a tap of the header; it also collapses when the composer takes focus.
    One block per `area:`/`project:` tag on the routine: the standing
    commitment, up to three NEXT STEPS each with an Add pill, and up to three
    PAST ACTIVITY rows.

    Presentational — the Add pill's string is appended to the checklist
    verbatim by the container, so this component never edits it.

    A block flagged `pending` is one whose context is still being built. Its
    kind label and breadcrumb come off the tag string, so they are already
    true; everything under them is simply absent until it arrives. That is the
    whole loading state — no spinner, no skeleton, nothing that moves. A block
    that resolves to nothing is removed by the container instead.
  -->
  <div class="rn-brief" data-testid="routine-brief-card">
    <div class="rn-brief__head" data-testid="brief-toggle" @click="$emit('toggle')">
      <div class="rn-brief__badge">
        <i class="rn-mi rn-brief__badge-icon">tips_and_updates</i>
      </div>
      <div class="rn-brief__head-text">
        <div class="rn-brief__title">Before you start</div>
        <div class="rn-brief__sub" data-testid="brief-subline">{{ subline }}</div>
      </div>
      <i class="rn-mi rn-brief__chevron">{{ open ? 'expand_less' : 'expand_more' }}</i>
    </div>

    <template v-if="open">
      <div
        v-for="block in blocks"
        :key="block.tag"
        class="rn-brief__block"
        :class="{ 'rn-brief__block--pending': block.pending }"
        data-testid="brief-block"
      >
        <div class="rn-brief__block-head">
          <i class="rn-mi rn-brief__kind-icon" :style="{ color: block.color }">{{ block.icon }}</i>
          <div class="rn-brief__kind" :style="{ color: block.color }">{{ block.kind }}</div>
          <div class="rn-brief__crumbs">
            <span
              v-for="(segment, i) in block.segments"
              :key="`${block.tag}-s${i}`"
              class="rn-brief__crumb"
              :class="{ 'rn-brief__crumb--nested': i > 0 }"
            >{{ segment }}</span>
          </div>
          <div class="rn-brief__spacer"></div>
          <div v-if="block.stat" class="rn-brief__stat">{{ block.stat }}</div>
        </div>

        <div v-if="block.description" class="rn-brief__desc">{{ block.description }}</div>

        <template v-if="block.steps.length">
          <div class="rn-brief__label">NEXT STEPS</div>
          <div
            v-for="(step, i) in block.steps"
            :key="`${block.tag}-n${i}`"
            class="rn-brief__step"
          >
            <i class="rn-mi rn-brief__step-icon">subdirectory_arrow_right</i>
            <div
              class="rn-brief__step-text"
              :style="{ color: step.added ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.87)' }"
            >{{ step.text }}</div>
            <button
              type="button"
              class="rn-brief__add"
              :class="{ 'rn-brief__add--added': step.added }"
              :disabled="step.added"
              data-testid="brief-add"
              @click="onAdd(block, step)"
            >
              <i class="rn-mi rn-brief__add-icon">{{ step.added ? 'check' : 'add' }}</i>
              {{ step.added ? 'Added' : 'Add' }}
            </button>
          </div>
        </template>

        <template v-if="block.activity.length">
          <div class="rn-brief__label">PAST ACTIVITY</div>
          <div class="rn-brief__acts">
            <div
              v-for="(act, i) in block.activity"
              :key="`${block.tag}-a${i}`"
              class="rn-brief__act"
              data-testid="brief-activity"
            >
              <i
                class="rn-mi rn-brief__act-icon"
                :style="{ color: act.done ? '#4CAF50' : 'rgba(0,0,0,.35)' }"
              >{{ act.done ? 'check_circle' : 'remove_circle_outline' }}</i>
              <div class="rn-brief__act-date">{{ act.date }}</div>
              <div
                class="rn-brief__act-text"
                :style="{ color: act.done ? 'rgba(0,0,0,.75)' : 'rgba(0,0,0,.5)' }"
              >{{ act.text }}</div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'OrganismRoutineBriefCard',
  props: {
    /**
     * One block per area/project tag:
     * [{ tag, kind, icon, color, segments: [String], breadcrumb, description,
     *    stat, steps: [{ text, added }], activity: [{ date, text, done }],
     *    pending }]
     *
     * `pending` blocks carry the kind/breadcrumb and empty body fields.
     */
    blocks: { type: Array, default: () => [] },
    /** `{breadcrumbs joined by ' · '} · {n} next steps` */
    subline: { type: String, default: '' },
    open: { type: Boolean, default: true },
  },
  methods: {
    /**
     * An already-added step is inert: the same string twice is two identical
     * checklist items. The pill is disabled too — this is the belt to that
     * brace, not a race-gating disable (see containers/ARCHITECTURE.md §3 #7).
     */
    onAdd(block, step) {
      if (step.added) return;
      this.$emit('add-step', { tag: block.tag, text: step.text });
    },
  },
};
</script>

<style>
.rn-brief {
  width: 100%;
  box-sizing: border-box;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, .08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
  overflow: hidden;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-brief__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
}

.rn-brief__head:hover {
  background: rgba(0, 0, 0, .02);
}

.rn-brief__badge {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(40, 139, 213, .1);
  color: #288bd5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rn-brief__badge-icon {
  font-size: 18px;
}

.rn-brief__head-text {
  flex: 1;
  min-width: 0;
}

.rn-brief__title {
  font-size: 13px;
  font-weight: 700;
}

.rn-brief__sub {
  font-size: 11px;
  color: rgba(0, 0, 0, .5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-brief__chevron {
  font-size: 20px;
  color: rgba(0, 0, 0, .45);
}

.rn-brief__block {
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(0, 0, 0, .06);
}

/* Waiting on its context. The breadcrumb is real, just not the whole story
   yet, so it sits back a little rather than animating. */
.rn-brief__block--pending {
  opacity: .62;
}

.rn-brief__block-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.rn-brief__kind-icon {
  font-size: 16px;
}

.rn-brief__kind {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
}

.rn-brief__crumbs {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
}

.rn-brief__crumb--nested {
  padding: 0 0 0 5px;
  margin-left: 5px;
  border-left: 1px solid #ccc;
}

.rn-brief__spacer {
  flex: 1;
}

.rn-brief__stat {
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
  white-space: nowrap;
}

.rn-brief__desc {
  font-size: 13px;
  line-height: 1.45;
  color: rgba(0, 0, 0, .72);
  margin-top: 4px;
}

.rn-brief__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  margin-top: 10px;
}

.rn-brief__step {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
}

.rn-brief__step-icon {
  font-size: 18px;
  color: rgba(0, 0, 0, .3);
  flex-shrink: 0;
}

.rn-brief__step-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.3;
}

.rn-brief__add {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  background: #fff;
  color: #288bd5;
  border: 1px solid rgba(40, 139, 213, .45);
  cursor: pointer;
}

.rn-brief__add--added {
  background: rgba(76, 175, 80, .1);
  color: #2e7d32;
  border-color: rgba(76, 175, 80, .3);
  cursor: default;
}

.rn-brief__add-icon {
  font-size: 15px;
}

.rn-brief__acts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.rn-brief__act {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.35;
}

.rn-brief__act-icon {
  font-size: 15px;
}

.rn-brief__act-date {
  width: 40px;
  flex-shrink: 0;
  color: rgba(0, 0, 0, .5);
  font-variant-numeric: tabular-nums;
}

.rn-brief__act-text {
  flex: 1;
  min-width: 0;
}
</style>
