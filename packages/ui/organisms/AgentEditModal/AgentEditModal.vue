<template>
  <v-dialog v-model="isOpen" max-width="560" persistent scrollable>
    <v-card>
      <v-card-title class="headline">{{ titleText }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="form.name"
          label="Agent name"
          autofocus
          required
          :rules="[v => !!v && v.trim().length > 0 || 'Name is required']"
        />

        <v-select
          v-if="!hideTaskRefSelect"
          v-model="form.taskRef"
          :items="routineOptions"
          item-text="label"
          item-value="value"
          label="Routine"
          :disabled="taskRefLocked"
          :rules="[v => !!v || 'Routine is required']"
        />

        <v-subheader class="pa-0">Start event</v-subheader>
        <v-layout row wrap>
          <v-flex xs4 pr-2>
            <v-select
              v-model="form.startEvent.kind"
              :items="kindOptions"
              label="Kind"
              dense
            />
          </v-flex>
          <v-flex xs8>
            <v-textarea
              v-model="form.startEvent.value"
              :label="kindLabel(form.startEvent.kind)"
              auto-grow
              rows="2"
              hint="Use {{ goal_id }} to substitute the goal item id"
              persistent-hint
            />
          </v-flex>
        </v-layout>

        <v-subheader class="pa-0 mt-3">End event (optional)</v-subheader>
        <v-layout row wrap>
          <v-flex xs4 pr-2>
            <v-select
              v-model="form.endEvent.kind"
              :items="kindOptions"
              label="Kind"
              dense
              clearable
            />
          </v-flex>
          <v-flex xs8>
            <v-textarea
              v-model="form.endEvent.value"
              :label="kindLabel(form.endEvent.kind)"
              auto-grow
              rows="2"
              :disabled="!form.endEvent.kind"
            />
          </v-flex>
        </v-layout>

        <v-alert v-if="errorMessage" type="error" dense class="mt-3">
          {{ errorMessage }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn flat @click="cancel" :disabled="saving">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="saving || !canSave"
          @click="save"
        >
          {{ agent && agent.id ? 'Save' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
const KIND_OPTIONS = [
  { text: 'URL (GET)', value: 'url' },
  { text: 'cURL command', value: 'curl' },
  { text: 'Notify (in-app)', value: 'notify' },
  { text: 'Log (console)', value: 'log' },
];

const blankEvent = () => ({ kind: 'url', value: '' });

export default {
  name: 'OrganismAgentEditModal',
  props: {
    value: { type: Boolean, default: false },
    agent: { type: Object, default: null },
    prefilledTaskRef: { type: String, default: '' },
    routineOptions: { type: Array, default: () => [] },
    hideTaskRefSelect: { type: Boolean, default: false },
  },
  data() {
    return {
      form: {
        name: '',
        taskRef: '',
        startEvent: blankEvent(),
        endEvent: { kind: '', value: '' },
      },
      saving: false,
      errorMessage: '',
    };
  },
  computed: {
    isOpen: {
      get() { return this.value; },
      set(v) { this.$emit('input', v); },
    },
    kindOptions() { return KIND_OPTIONS; },
    titleText() {
      return this.agent && this.agent.id ? 'Edit agent' : 'Build agent';
    },
    taskRefLocked() {
      return !!this.prefilledTaskRef || !!(this.agent && this.agent.id);
    },
    canSave() {
      const hasName = this.form.name && this.form.name.trim();
      const hasTask = !!this.form.taskRef;
      const hasStart = !!(this.form.startEvent && this.form.startEvent.value && this.form.startEvent.value.trim());
      return hasName && hasTask && hasStart;
    },
  },
  watch: {
    value(open) {
      if (open) this.hydrate();
    },
    agent() {
      if (this.value) this.hydrate();
    },
    prefilledTaskRef() {
      if (this.value) this.hydrate();
    },
  },
  methods: {
    kindLabel(kind) {
      switch (kind) {
        case 'curl': return 'cURL command';
        case 'notify': return 'Notify body (text after notify:)';
        case 'log': return 'Log line (text after log:)';
        default: return 'URL';
      }
    },
    hydrate() {
      this.errorMessage = '';
      if (this.agent && this.agent.id) {
        this.form = {
          name: this.agent.name || '',
          taskRef: this.agent.taskRef || '',
          startEvent: this.agent.startEvent
            ? { kind: this.agent.startEvent.kind, value: this.agent.startEvent.value }
            : blankEvent(),
          endEvent: this.agent.endEvent
            ? { kind: this.agent.endEvent.kind, value: this.agent.endEvent.value }
            : { kind: '', value: '' },
        };
      } else {
        this.form = {
          name: '',
          taskRef: this.prefilledTaskRef || '',
          startEvent: blankEvent(),
          endEvent: { kind: '', value: '' },
        };
      }
    },
    cancel() {
      if (this.saving) return;
      this.isOpen = false;
      this.$emit('cancelled');
    },
    async save() {
      if (!this.canSave) return;
      this.saving = true;
      this.errorMessage = '';
      const payload = {
        name: this.form.name.trim(),
        taskRef: this.form.taskRef,
        startEvent: this.form.startEvent,
        endEvent: this.form.endEvent && this.form.endEvent.kind && this.form.endEvent.value
          ? this.form.endEvent
          : null,
      };
      try {
        let agent;
        if (this.agent && this.agent.id) {
          agent = await this.$agent.update(this.agent.id, {
            name: payload.name,
            startEvent: payload.startEvent,
            endEvent: payload.endEvent,
          });
        } else {
          agent = await this.$agent.add(payload);
        }
        this.$emit('saved', agent);
        this.isOpen = false;
      } catch (err) {
        this.errorMessage = (err && err.message) || 'Failed to save agent';
      } finally {
        this.saving = false;
      }
    },
  },
  mounted() {
    if (this.value) this.hydrate();
  },
};
</script>
