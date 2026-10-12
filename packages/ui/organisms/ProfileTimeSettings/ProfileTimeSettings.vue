<template>
  <!--
    Profile's TIME card: the two settings a user can actually change, plus the
    one that is fixed (`Profile and About.dc.html` § PP/PT/PD).

    Three decisions worth keeping:

    1. The yellow "most settings are READ ONLY" banner is gone. The locked row
       carries a `lock` glyph, so the warning sits on the thing it describes
       instead of on a card where two of three rows are editable.
    2. Time format PREVIEWS the choice — "09:00 · 18:30" against
       "9:00 AM · 6:30 PM" — because the labels "12h" and "24h" do not tell a
       user what their timeline will look like.
    3. Nothing is disabled while a save is in flight (ARCHITECTURE.md § 3.7).
       The old select carried `:disabled="savingTimezone"`, which costs a dead
       interaction on a slow connection; the container echoes the new value
       instead and reverts only if the server refuses it.
  -->
  <section class="rn-ptime" data-testid="profile-time">
    <div class="rn-ptime__head">TIME</div>

    <!-- Time format -->
    <div class="rn-ptime__row">
      <div class="rn-ptime__text">
        <div class="rn-ptime__label">Time format</div>
        <div class="rn-ptime__sub">
          Home shows routines as
          <b class="rn-ptime__preview" data-testid="profile-time-preview">{{ preview }}</b>
        </div>
      </div>
      <sliding-switch
        class="rn-ptime__switch"
        :segments="formats"
        :value="format"
        data-testid="profile-time-format"
        @change="$emit('change-time-format', $event)"
      />
    </div>

    <!-- Time zone -->
    <div class="rn-ptime__row">
      <div class="rn-ptime__text">
        <div class="rn-ptime__label">Time zone</div>
        <div class="rn-ptime__sub">Routine times and day changes follow this</div>
      </div>
      <select
        class="rn-ptime__select"
        :value="timezone"
        aria-label="Time zone"
        data-testid="profile-timezone"
        @change="$emit('change-timezone', $event.target.value)"
      >
        <!-- `selected` per option, not just the select's :value: when the option
             list and the value change in the same tick (profile finishing its
             load), Vue 2 sets the value before the new options exist and the
             browser falls back to the first zone. -->
        <option
          v-for="zone in timezoneOptions"
          :key="zone.value"
          :value="zone.value"
          :selected="zone.value === timezone"
        >
          {{ zone.label }}
        </option>
      </select>
    </div>

    <!-- Start of the week — read only -->
    <div class="rn-ptime__row rn-ptime__row--last">
      <div class="rn-ptime__text">
        <div class="rn-ptime__label">
          Start of the week
          <i class="rn-mi rn-ptime__lock" title="Read only" data-testid="profile-week-lock">lock</i>
        </div>
        <div class="rn-ptime__sub">{{ weekRunsLabel }}</div>
      </div>
      <div class="rn-ptime__locked" data-testid="profile-week-start">
        <div
          v-for="option in weekStartOptions"
          :key="option.value"
          class="rn-ptime__locked-seg"
          :class="{ 'rn-ptime__locked-seg--on': option.value === weekStart }"
        >
          {{ option.label }}
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import SlidingSwitch from '../../molecules/SlidingSwitch/SlidingSwitch.vue';
import { PROFILE_SETTINGS, TIMEZONE_OPTIONS, WEEK_START_OPTIONS } from '../../constants/settings';
import { TIME_FORMATS, normaliseTimeFormat, timeFormatPreview } from '../../constants/profile';

/** Spelled out, because "sun" in a locked pill does not say what it implies. */
const WEEK_RUNS = {
  sun: 'Weeks run Sunday to Saturday',
  mon: 'Weeks run Monday to Sunday',
};

export default {
  name: 'OrganismProfileTimeSettings',
  components: { SlidingSwitch },
  props: {
    /** '12' | '24'. '12h' / '24h' are accepted too — see normaliseTimeFormat. */
    timeFormat: { type: String, default: '24' },
    timezone: { type: String, default: PROFILE_SETTINGS.defaultTimezone },
    /**
     * The real IANA list (~41 entries, "(GMT +5:30) Bombay, Calcutta, Madras,
     * New Delhi"). The mock's five-entry list with its own label format is wrong
     * — chassis.md § Conflicts.
     */
    timezoneOptions: { type: Array, default: () => TIMEZONE_OPTIONS },
    weekStart: { type: String, default: PROFILE_SETTINGS.startOfWeek },
    weekStartOptions: { type: Array, default: () => WEEK_START_OPTIONS },
  },
  computed: {
    formats() {
      return TIME_FORMATS;
    },
    format() {
      return normaliseTimeFormat(this.timeFormat);
    },
    preview() {
      return timeFormatPreview(this.timeFormat);
    },
    weekRunsLabel() {
      return WEEK_RUNS[this.weekStart] || WEEK_RUNS.sun;
    },
  },
};
</script>

<style>
.rn-ptime {
  padding: 6px 16px;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-ptime__head {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  padding: 10px 0 2px;
}

/*
  Wraps, because the controls on the right cannot shrink: the time-zone select
  is a fixed 200px and the toggles 112px. On a 320px phone that left the label
  column 44px — measured — so "Routine times and day changes follow this" came
  out one word per line over seven lines, and the select's text was cut off.
  With `wrap` plus a flex-basis floor on the text, the control drops to its own
  line instead of strangling the label.
*/
.rn-ptime__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 10px 0;
  min-height: 60px;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
}

.rn-ptime__row--last {
  border-bottom: 0;
}

/* 170px is the floor that decides when the control wraps — below it the label
   is being squeezed rather than laid out. */
.rn-ptime__text {
  flex: 1 1 170px;
  min-width: 0;
}

.rn-ptime__label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
}

.rn-ptime__lock {
  font-size: 14px;
  color: rgba(0, 0, 0, .35);
}

.rn-ptime__sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-ptime__preview {
  color: rgba(0, 0, 0, .8);
}

/* `margin-left:auto` keeps the control hard right on a shared line AND on a
   line of its own once the row wraps, so the alignment does not jump. */
.rn-ptime__switch {
  width: 112px;
  flex-shrink: 0;
  margin-left: auto;
}

.rn-ptime__select {
  /* 16px, and wider to hold it: iOS zooms the page when a focused field is
     under 16px. The extra 30px keeps "(GMT -5:00) Eastern Time" from clipping
     any worse than it did at 13px.

     `max-width` rather than a width, and `min-width: 0`, so that once the row
     wraps this takes the line it is given instead of staying 200px and
     clipping its own text. 280 is what "(GMT -5:00) Eastern Time" needs at
     16px — the cap stops it growing absurdly wide on a desktop row. */
  max-width: 280px;
  min-width: 0;
  flex: 1 1 200px;
  height: 36px;
  margin-left: auto;
  border: 1px solid rgba(0, 0, 0, .15);
  border-radius: 10px;
  padding: 0 8px;
  font: inherit;
  font-size: 16px;
  color: #222;
  background: #fff;
  cursor: pointer;
}

/* The locked twin of the switch: same geometry, no thumb transition, dimmed. */
/* Same `margin-left:auto` as `__switch`, so the two segmented controls in this
   card line up with each other whether the row wraps or not. */
.rn-ptime__locked {
  margin-left: auto;
  display: flex;
  padding: 3px;
  border-radius: 10px;
  background: rgba(0, 0, 0, .04);
  width: 112px;
  flex-shrink: 0;
  opacity: .7;
}

.rn-ptime__locked-seg {
  flex: 1;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, .4);
}

.rn-ptime__locked-seg--on {
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .1);
  color: rgba(0, 0, 0, .87);
}
</style>
