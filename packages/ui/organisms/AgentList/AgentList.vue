<template>
  <!--
    The Agents page list column (`packages/design/Agents.dc.html`, frames
    #ap/#at/#ad): three stat tiles over one card per agent.

    Phone renders it as the whole screen; tablet and desktop render it as the
    `flex:2` half of a 2:3 split with the detail pane permanently beside it — the
    split is the PAGE's layout, so this organism only changes its card radius
    (16 on phone, 20 above it) and never decides whether a detail sheet exists.

    Pure presentational: the agents arrive already joined to their routine
    (`routineTime` / `routineName`), every status token comes from
    `constants/agents`, and the ring is `molecules/StatusRing` — which owns the
    "breathes only while running or listening" rule.
  -->
  <div class="rn-agl" :class="`rn-agl--${shell}`" data-testid="agent-list">
    <div class="rn-agl__stats" data-testid="agent-list-stats">
      <div v-for="tile in statTiles" :key="tile.key" class="rn-agl__stat" :data-testid="`agent-stat-${tile.key}`">
        <div class="rn-agl__stat-k">{{ tile.label }}</div>
        <div class="rn-agl__stat-v" :style="{ color: tile.color }">{{ tile.value }}</div>
      </div>
    </div>

    <!--
      D-10: `fetchAll` swallows a failed load into the store and leaves the list
      empty, so without this branch the page tells the user they have no agents
      when really the server could not be reached. Error and empty are two
      different screens and the error one offers a retry.
    -->
    <load-error-state
      v-if="loadError"
      class="rn-agl__error"
      message="We couldn't load your agents."
      :retrying="retrying"
      @retry="$emit('retry')"
    />

    <div v-else-if="!agents.length" class="rn-agl__empty" data-testid="agent-list-empty">
      <i class="rn-mi rn-agl__empty-glyph">smart_toy</i>
      <div class="rn-agl__empty-title">No agents yet</div>
      <div class="rn-agl__empty-sub">
        Build one and it fires a start event when its routine becomes active — and an
        end event once every task under that routine is ticked.
      </div>
    </div>

    <div v-else class="rn-agl__cards">
      <div
        v-for="row in rows"
        :key="row.id"
        class="rn-agl__card"
        :class="{ 'rn-agl__card--on': row.selected }"
        :data-testid="`agent-card-${row.id}`"
        @click="$emit('select', row.id)"
      >
        <status-ring
          :stage="row.status"
          :size="42"
          :color="row.color"
          :tint="row.tint"
          glyph="smart_toy"
          :title="row.statusLabel"
        />
        <div class="rn-agl__body">
          <div class="rn-agl__head">
            <div class="rn-agl__name">{{ row.name }}</div>
            <div
              class="rn-agl__pill"
              :style="{ background: row.tint, color: row.color }"
              :data-testid="`agent-status-${row.id}`"
            >
              <i class="rn-mi rn-agl__pill-glyph">{{ row.statusIcon }}</i>{{ row.statusLabel }}
            </div>
          </div>
          <div class="rn-agl__meta">
            <i class="rn-mi rn-agl__meta-glyph">history</i>
            <span v-if="row.routineTime" class="rn-agl__time">{{ row.routineTime }}</span>
            <span class="rn-agl__routine">{{ row.routineName }}</span>
          </div>
          <div class="rn-agl__counts">
            <div class="rn-agl__bar">
              <div class="rn-agl__bar-ok" :style="{ width: row.okPct }"></div>
            </div>
            <div class="rn-agl__tally">
              <b class="rn-agl__ok">{{ row.ok }}</b> ok ·
              <b :style="{ color: row.failColor }">{{ row.fail }}</b> failed
            </div>
          </div>
          <div class="rn-agl__last" :style="{ color: row.lastColor }">{{ row.lastLabel }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import StatusRing from '../../molecules/StatusRing/StatusRing.vue';
import LoadErrorState from '../../molecules/LoadErrorState/LoadErrorState.vue';
import { agentStatusKey, AGENT_STATUS, agentTotals } from '../../constants/agents';
import { lastRunLabel } from '../../utils/agentFormat';

/** Totals are UNKNOWN after a failed load, not zero (D-10). */
const UNKNOWN = '—';

export default {
  name: 'OrganismAgentList',
  components: { StatusRing, LoadErrorState },
  props: {
    /**
     * Agent documents, each with `routineTime` / `routineName` joined on by the
     * container. De-duped by the container, never here.
     */
    agents: { type: Array, default: () => [] },
    selectedId: { type: String, default: '' },
    /** phone | tablet | desktop — card radius only. */
    shell: { type: String, default: 'phone' },
    /** The query failed AND nothing is cached — show the error, not "no agents". */
    loadError: { type: Boolean, default: false },
    retrying: { type: Boolean, default: false },
    /** Injectable clock so "Today 09:02" is testable. */
    now: { type: [String, Number, Date], default: undefined },
  },
  computed: {
    totals() {
      return agentTotals(this.agents);
    },
    statTiles() {
      const { runs, rate, live } = this.totals;
      const dash = this.loadError;
      return [
        {
          key: 'runs', label: 'RUNS', value: dash ? UNKNOWN : runs, color: 'rgba(0,0,0,.87)',
        },
        {
          key: 'success', label: 'SUCCESS', value: dash ? UNKNOWN : `${rate}%`, color: '#2e7d32',
        },
        {
          key: 'live', label: 'LIVE NOW', value: dash ? UNKNOWN : live, color: '#1976d2',
        },
      ];
    },
    rows() {
      return this.agents.map((agent) => {
        const status = agentStatusKey(agent);
        const token = AGENT_STATUS[status];
        const ok = Number(agent.successCount) || 0;
        const fail = Number(agent.failureCount) || 0;
        const total = ok + fail;
        return {
          id: agent.id,
          name: agent.name,
          status,
          statusLabel: token.label,
          statusIcon: token.icon,
          color: token.color,
          tint: token.tint,
          routineTime: agent.routineTime || '',
          routineName: agent.routineName || agent.taskRef || '',
          ok,
          fail,
          okPct: total ? `${Math.round((ok / total) * 100)}%` : '0%',
          failColor: fail ? '#d32f2f' : 'rgba(0,0,0,.55)',
          lastLabel: lastRunLabel(agent, this.now),
          lastColor: status === 'failed' ? '#d32f2f' : 'rgba(0,0,0,.45)',
          selected: agent.id === this.selectedId,
        };
      });
    },
  },
};
</script>

<style>
.rn-agl {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: max-content;
  gap: 12px;
  align-content: start;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-agl__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.rn-agl__stat {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
  padding: 10px 12px;
  min-width: 0;
}

.rn-agl__stat-k {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-agl__stat-v {
  font-size: 20px;
  font-weight: 700;
  margin-top: 2px;
}

.rn-agl__cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: max-content;
  gap: 10px;
}

.rn-agl__card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
  padding: 14px;
  cursor: pointer;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  transition: box-shadow .2s;
}

.rn-agl--tablet .rn-agl__card,
.rn-agl--desktop .rn-agl__card {
  border-radius: 20px;
}

/* Selection is a 2px inset rule, not a background — the card keeps its white
   surface so the status ring stays the only coloured thing on it. */
.rn-agl__card--on {
  box-shadow: inset 0 0 0 2px #288bd5, 0 2px 6px rgba(40, 139, 213, .12);
}

.rn-agl__body {
  flex: 1;
  min-width: 0;
}

.rn-agl__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rn-agl__name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-agl__pill {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border-radius: 11px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.rn-agl__pill-glyph {
  font-size: 13px;
}

.rn-agl__meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: rgba(0, 0, 0, .6);
  margin-top: 3px;
  min-width: 0;
}

.rn-agl__meta-glyph {
  font-size: 14px;
}

.rn-agl__time {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.rn-agl__routine {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-agl__counts {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

/* The track is the failure colour and the fill is the success colour, so the
   bar reads as a ratio without a second element or a legend. */
.rn-agl__bar {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(229, 57, 53, .25);
  overflow: hidden;
}

.rn-agl__bar-ok {
  height: 100%;
  background: #4CAF50;
  border-radius: 3px;
}

.rn-agl__tally {
  font-size: 11px;
  color: rgba(0, 0, 0, .55);
  white-space: nowrap;
}

.rn-agl__ok {
  color: #2e7d32;
}

.rn-agl__last {
  font-size: 11px;
  margin-top: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-agl__empty {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
  padding: 28px 20px;
  text-align: center;
}

.rn-agl__empty-glyph {
  font-size: 36px;
  color: rgba(0, 0, 0, .18);
}

.rn-agl__empty-title {
  font-size: 16px;
  font-weight: 700;
  margin-top: 8px;
}

.rn-agl__empty-sub {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .54);
  margin-top: 4px;
}

.rn-agl__error {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
}
</style>
