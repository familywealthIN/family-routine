<template>
  <!--
    Today's routines as a list. Two shapes, one data source:
      - `rows` (desktop sidebar): 46px rows with time, state icon, name and a
        stimulus letter pill.
      - `chips` (iPad mini): 32px horizontally-scrolling pills.
    Clicking either focuses that routine.
  -->
  <div v-if="layout === 'chips'" class="rn-rail rn-rail--chips rn-hidescroll">
    <div
      v-for="routine in routines"
      :key="routine.id"
      class="rn-rail__chip"
      :style="chipStyle(routine)"
      :data-testid="`routine-chip-${routine.id}`"
      @click="$emit('focus-routine', routine.id)"
    >
      <i
        class="rn-mi rn-rail__chip-icon"
        :style="{ color: routine.isFocus ? '#fff' : routine.stateColor }"
      >{{ routine.stateIcon }}</i>
      <span class="rn-rail__chip-time">{{ routine.time }}</span>
      <span class="rn-rail__chip-name">{{ routine.name }}</span>
    </div>
  </div>

  <div v-else class="rn-rail rn-rail--rows">
    <div class="rn-rail__header">{{ dayLabel }} · {{ tickedCount }} of {{ routines.length }} ticked</div>
    <div
      v-for="routine in routines"
      :key="routine.id"
      class="rn-rail__row"
      :style="{ background: routine.isFocus ? 'rgba(40,139,213,.1)' : 'transparent' }"
      :data-testid="`routine-row-${routine.id}`"
      @click="$emit('focus-routine', routine.id)"
    >
      <span class="rn-rail__time" :style="{ color: routine.past ? 'rgba(0,0,0,.4)' : 'rgba(0,0,0,.6)' }">
        {{ routine.time }}
      </span>
      <i class="rn-mi rn-rail__icon" :style="{ color: routine.stateColor }">{{ routine.stateIcon }}</i>
      <span
        class="rn-rail__name"
        :style="{
          fontWeight: routine.isFocus ? 700 : 500,
          color: routine.isFocus ? '#1f6fab' : (routine.past ? 'rgba(0,0,0,.4)' : 'rgba(0,0,0,.8)'),
          textDecoration: routine.ticked ? 'line-through' : 'none',
        }"
      >{{ routine.name }}</span>
      <span
        class="rn-rail__stim"
        :style="{ background: routine.stimulusTint, color: routine.stimulusColor }"
      >{{ routine.stimulus }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MoleculeRoutineRail',
  props: {
    /**
     * [{ id, name, time, stimulus, stimulusColor, stimulusTint, ticked, past,
     *    isFocus, stateIcon, stateColor }]
     */
    routines: { type: Array, default: () => [] },
    /** 'rows' (desktop sidebar) | 'chips' (tablet header) */
    layout: { type: String, default: 'rows' },
    tickedCount: { type: Number, default: 0 },
    /** Which day the list is for — the viewed day, not always today. */
    dayLabel: { type: String, default: 'TODAY' },
  },
  methods: {
    chipStyle(routine) {
      return {
        background: routine.isFocus ? '#288bd5' : '#fff',
        color: routine.isFocus
          ? '#fff'
          : (routine.past ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.8)'),
        boxShadow: routine.isFocus
          ? '0 2px 6px rgba(40,139,213,.35)'
          : '0 1px 2px rgba(0,0,0,.06)',
      };
    },
  },
};
</script>

<style>
.rn-rail {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

/* ---- chips (iPad mini) ---- */
.rn-rail--chips {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 20px 8px;
}

.rn-rail__chip {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  cursor: pointer;
  /* 13px/600 with an 18px glyph — the iPad frame (6a) draws the routine rail as
     32px r999 chips at that scale, not the 12px/15px this once rendered. */
  font-size: 13px;
  transition: background .2s, box-shadow .2s;
}

.rn-rail__chip-icon {
  font-size: 18px;
}

.rn-rail__chip-time {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.rn-rail__chip-name {
  white-space: nowrap;
  font-weight: 600;
}

/* ---- rows (desktop sidebar) ---- */
.rn-rail__header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  text-transform: uppercase;
  padding: 12px 16px 6px;
}

.rn-rail__row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 12px;
  margin: 0 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: background .2s;
}

.rn-rail__row:hover {
  background: rgba(0, 0, 0, .03);
}

.rn-rail__time {
  flex-shrink: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.rn-rail__icon {
  font-size: 18px;
  flex-shrink: 0;
}

.rn-rail__name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-rail__stim {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}
</style>
