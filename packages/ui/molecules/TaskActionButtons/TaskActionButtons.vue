<template>
  <!--
    The Start Task / Start Agent (or Build Agent) button pair shared by the
    quick-goal modal and the existing-goal action modal. Presentational: emits
    intent, the container/page decides what "start task/agent" means.

    The price (D-16) rides on the buttons that spend it, as a self-contained
    pill rather than loose icon-plus-digits, so a two-button row carrying two
    prices still fits a phone: the row stacks below the xs breakpoint instead
    of overflowing the dialog.
  -->
  <v-flex xs12 d-flex class="task-action-buttons">
    <v-btn
      color="success"
      :loading="loading && loadingAction !== 'agent'"
      :disabled="loading"
      @click="$emit('start-task')"
    >
      Start Task
      <span v-if="costLabel" class="task-action-buttons__cost">
        <v-icon small>diamond</v-icon>{{ costLabel }}
      </span>
    </v-btn>
    <v-btn
      v-if="agentState === 'assigned'"
      color="primary"
      outline
      :loading="loading && loadingAction === 'agent'"
      :disabled="loading"
      @click="$emit('start-agent')"
    >
      Start Agent
      <span v-if="costLabel" class="task-action-buttons__cost">
        <v-icon small>diamond</v-icon>{{ costLabel }}
      </span>
    </v-btn>
    <v-btn
      v-else
      color="primary"
      outline
      :disabled="loading"
      @click="$emit('build-agent')"
    >
      Build Agent
    </v-btn>
  </v-flex>
</template>

<script>
export default {
  name: 'TaskActionButtons',
  props: {
    // 'assigned' → show "Start Agent"; anything else → "Build Agent".
    agentState: {
      type: String,
      default: 'none',
    },
    // Global in-flight flag — disables every button.
    loading: {
      type: Boolean,
      default: false,
    },
    // Which action is in flight ('task' | 'agent' | '') — only that button spins.
    loadingAction: {
      type: String,
      default: '',
    },
    // Frozen points price this task is charged when it has already passed
    // (0 = nothing to pay). Both Start Task and Start Agent spend it.
    redeemCost: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    // Price shown on the spending buttons, so the charge is never a surprise.
    costLabel() {
      return this.redeemCost > 0 ? String(Math.round(this.redeemCost)) : '';
    },
  },
};
</script>

<style>
/* Root-class prefixed so none of this leaks to the buttons on other screens. */
.task-action-buttons {
  flex-wrap: wrap;
}

/* The price pill. Borrows the button's own text colour, so it reads correctly
   on both the filled Start Task and the outlined Start Agent without knowing
   which it is sitting on. */
.task-action-buttons .task-action-buttons__cost {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 0 6px;
  border: 1px solid currentColor;
  border-radius: 10px;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0.85;
}

/* Vuetify's own .v-icon--right margin is 16px, which is what split the icon
   away from its digits; the pill sets its own spacing instead. */
/* The gap is CSS, never template whitespace: compilers disagree about whether
   the newline between the icon and the digits survives, so markup cannot be
   trusted to separate them. */
.task-action-buttons .task-action-buttons__cost .v-icon {
  margin-right: 4px;
  font-size: 13px;
  color: inherit;
}

/* Below Vuetify's xs breakpoint two priced buttons cannot share a row inside
   the dialog, so stack them full-width and drop the horizontal gutters that
   would otherwise misalign them against the fields above. */
@media (max-width: 599px) {
  .task-action-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .task-action-buttons .v-btn {
    width: 100%;
    margin-left: 0;
    margin-right: 0;
  }
}
</style>
