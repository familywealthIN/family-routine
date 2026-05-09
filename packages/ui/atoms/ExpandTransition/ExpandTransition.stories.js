import ExpandTransition from './ExpandTransition.vue';

export default {
  title: 'Atoms/ExpandTransition',
  component: ExpandTransition,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ExpandTransition },
  data() {
    return {
      show: true,
    };
  },
  template: `
    <div>
      <v-btn @click="show = !show" class="mb-4">
        {{ show ? 'Hide' : 'Show' }} Content
      </v-btn>
      <ExpandTransition v-bind="$props">
        <v-card v-show="show" class="pa-4">
          <h3>Expandable Content</h3>
          <p>This content can be expanded and collapsed with a smooth transition.</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </v-card>
      </ExpandTransition>
    </div>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const WithList = () => ({
  components: { ExpandTransition },
  data() {
    return {
      expanded: false,
    };
  },
  template: `
    <v-list>
      <v-list-tile @click="expanded = !expanded">
        <v-list-tile-content>
          <v-list-tile-title>Click to expand</v-list-tile-title>
        </v-list-tile-content>
        <v-list-tile-action>
          <v-icon>{{ expanded ? 'expand_less' : 'expand_more' }}</v-icon>
        </v-list-tile-action>
      </v-list-tile>
      <ExpandTransition>
        <div v-show="expanded" class="pa-3 grey lighten-4">
          <p>Expanded content goes here...</p>
          <p>More details about the item.</p>
        </div>
      </ExpandTransition>
    </v-list>
  `,
});
