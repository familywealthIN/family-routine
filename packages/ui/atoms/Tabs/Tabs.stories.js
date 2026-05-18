import Tabs from './Tabs.vue';

export default {
  title: 'Atoms/Tabs',
  component: Tabs,
  argTypes: {
    centered: { control: 'boolean' },
    fixedTabs: { control: 'boolean' },
    grow: { control: 'boolean' },
    right: { control: 'boolean' },
    showArrows: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Tabs },
  data() {
    return { tab: 0 };
  },
  template: `
    <v-card style="max-width: 600px;">
      <Tabs v-model="tab" v-bind="$props">
        <v-tab>Tab 1</v-tab>
        <v-tab>Tab 2</v-tab>
        <v-tab>Tab 3</v-tab>
      </Tabs>
      <v-tabs-items v-model="tab">
        <v-tab-item>
          <v-card-text>Content for Tab 1</v-card-text>
        </v-tab-item>
        <v-tab-item>
          <v-card-text>Content for Tab 2</v-card-text>
        </v-tab-item>
        <v-tab-item>
          <v-card-text>Content for Tab 3</v-card-text>
        </v-tab-item>
      </v-tabs-items>
    </v-card>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Centered = Template.bind({});
Centered.args = {
  centered: true,
};

export const RightAligned = Template.bind({});
RightAligned.args = {
  right: true,
};

export const FixedTabs = Template.bind({});
FixedTabs.args = {
  fixedTabs: true,
};

export const Grow = Template.bind({});
Grow.args = {
  grow: true,
};
