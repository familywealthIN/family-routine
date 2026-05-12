<template>
  <component :is="wrapperComponent" v-model="isOpen" :max-width="isMobile ? '100%' : '900'" :hide-overlay="isMobile">
    <v-card class="agent-result-card" :class="{ 'agent-result-card--mobile': isMobile }">
      <div v-if="isMobile" class="agent-result-handle" />
      <div class="agent-result-header">
        <span class="agent-result-title">{{ title }}</span>
        <v-btn icon small @click="close">
          <v-icon small>close</v-icon>
        </v-btn>
      </div>
      <div class="agent-result-body">
        <iframe
          v-if="html"
          :srcdoc="html"
          sandbox="allow-scripts"
          referrerpolicy="no-referrer"
          class="agent-result-frame"
        />
        <div v-else class="agent-result-empty">No content to display.</div>
      </div>
    </v-card>
  </component>
</template>

<script>
import { AtomBottomSheet } from '../../atoms';

export default {
  name: 'OrganismAgentResultModal',
  components: { AtomBottomSheet },
  props: {
    value: { type: Boolean, default: false },
    html: { type: String, default: '' },
    title: { type: String, default: 'Agent result' },
  },
  computed: {
    isOpen: {
      get() { return this.value; },
      set(v) { this.$emit('input', v); },
    },
    isMobile() {
      return this.$vuetify && this.$vuetify.breakpoint && this.$vuetify.breakpoint.name === 'xs';
    },
    wrapperComponent() {
      return this.isMobile ? 'AtomBottomSheet' : 'v-dialog';
    },
  },
  methods: {
    close() {
      this.isOpen = false;
      this.$emit('closed');
    },
  },
};
</script>

<style scoped>
.agent-result-card {
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}
.agent-result-card--mobile {
  border-radius: 16px 16px 0 0 !important;
  max-height: 90vh;
}
.agent-result-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background-color: #ccc;
  margin: 8px auto 4px;
}
.agent-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}
.agent-result-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}
.agent-result-body {
  flex: 1;
  overflow: hidden;
  display: flex;
}
.agent-result-frame {
  width: 100%;
  height: 70vh;
  border: 0;
  background: #fff;
}
.agent-result-card--mobile .agent-result-frame {
  height: 80vh;
}
.agent-result-empty {
  padding: 24px;
  color: #888;
  text-align: center;
  width: 100%;
}
</style>
