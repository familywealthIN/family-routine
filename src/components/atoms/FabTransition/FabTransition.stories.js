import FabTransition from './FabTransition.vue';

export default {
  title: 'Atoms/FabTransition',
  component: FabTransition,
};

export const Default = () => ({
  components: { FabTransition },
  template: `
    <FabTransition>
      <v-btn fab color="primary">
        <v-icon>add</v-icon>
      </v-btn>
    </FabTransition>
  `,
});

export const WithToggle = () => ({
  components: { FabTransition },
  data() {
    return { show: true };
  },
  template: `
    <div>
      <v-btn @click="show = !show" class="mb-4">Toggle FAB</v-btn>
      <FabTransition>
        <v-btn v-show="show" fab color="primary">
          <v-icon>add</v-icon>
        </v-btn>
      </FabTransition>
    </div>
  `,
});
