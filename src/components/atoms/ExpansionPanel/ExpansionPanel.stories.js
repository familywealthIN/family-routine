import ExpansionPanel from './ExpansionPanel.vue';

export default {
  title: 'Atoms/ExpansionPanel',
  component: ExpansionPanel,
  argTypes: {
    multiple: {
      control: 'boolean',
    },
    focusable: {
      control: 'boolean',
    },
    popout: {
      control: 'boolean',
    },
    inset: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ExpansionPanel },
  template: `
    <ExpansionPanel v-bind="$props">
      <v-expansion-panel-content>
        <template v-slot:header>
          <div>Panel 1</div>
        </template>
        <v-card>
          <v-card-text>Content for panel 1</v-card-text>
        </v-card>
      </v-expansion-panel-content>
      <v-expansion-panel-content>
        <template v-slot:header>
          <div>Panel 2</div>
        </template>
        <v-card>
          <v-card-text>Content for panel 2</v-card-text>
        </v-card>
      </v-expansion-panel-content>
      <v-expansion-panel-content>
        <template v-slot:header>
          <div>Panel 3</div>
        </template>
        <v-card>
          <v-card-text>Content for panel 3</v-card-text>
        </v-card>
      </v-expansion-panel-content>
    </ExpansionPanel>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Multiple = Template.bind({});
Multiple.args = {
  multiple: true,
};

export const Popout = Template.bind({});
Popout.args = {
  popout: true,
};

export const Inset = Template.bind({});
Inset.args = {
  inset: true,
};

export const Focusable = Template.bind({});
Focusable.args = {
  focusable: true,
};
