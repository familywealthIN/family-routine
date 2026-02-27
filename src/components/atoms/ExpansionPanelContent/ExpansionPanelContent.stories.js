import ExpansionPanelContent from './ExpansionPanelContent.vue';

export default {
  title: 'Atoms/ExpansionPanelContent',
  component: ExpansionPanelContent,
  argTypes: {
    lazy: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ExpansionPanelContent },
  template: `
    <v-expansion-panel>
      <ExpansionPanelContent v-bind="$props">
        <template v-slot:header>
          <div>
            <v-icon class="mr-2">schedule</v-icon>
            Morning Routine
          </div>
        </template>
        <v-card flat>
          <v-card-text>
            <v-list dense>
              <v-list-tile>
                <v-list-tile-content>
                  <v-list-tile-title>Wake up - 6:00 AM</v-list-tile-title>
                </v-list-tile-content>
              </v-list-tile>
              <v-list-tile>
                <v-list-tile-content>
                  <v-list-tile-title>Exercise - 6:30 AM</v-list-tile-title>
                </v-list-tile-content>
              </v-list-tile>
              <v-list-tile>
                <v-list-tile-content>
                  <v-list-tile-title>Breakfast - 7:30 AM</v-list-tile-title>
                </v-list-tile-content>
              </v-list-tile>
            </v-list>
          </v-card-text>
        </v-card>
      </ExpansionPanelContent>
    </v-expansion-panel>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
};

export const Lazy = Template.bind({});
Lazy.args = {
  lazy: true,
};
