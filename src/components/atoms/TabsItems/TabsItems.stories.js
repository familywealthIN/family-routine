import TabsItems from './TabsItems.vue';

export default {
  title: 'Atoms/TabsItems',
  component: TabsItems,
  argTypes: {
    continuous: {
      control: 'boolean',
    },
    cycle: {
      control: 'boolean',
    },
    touchless: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TabsItems },
  data() {
    return {
      tab: 0,
    };
  },
  template: `
    <div>
      <v-tabs v-model="tab">
        <v-tab>Day</v-tab>
        <v-tab>Week</v-tab>
        <v-tab>Month</v-tab>
      </v-tabs>
      <TabsItems v-model="tab" v-bind="$props">
        <v-tab-item>
          <v-card flat>
            <v-card-text>
              <h3>Daily View</h3>
              <p>Your tasks and goals for today.</p>
            </v-card-text>
          </v-card>
        </v-tab-item>
        <v-tab-item>
          <v-card flat>
            <v-card-text>
              <h3>Weekly View</h3>
              <p>Your tasks and goals for this week.</p>
            </v-card-text>
          </v-card>
        </v-tab-item>
        <v-tab-item>
          <v-card flat>
            <v-card-text>
              <h3>Monthly View</h3>
              <p>Your tasks and goals for this month.</p>
            </v-card-text>
          </v-card>
        </v-tab-item>
      </TabsItems>
    </div>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Continuous = Template.bind({});
Continuous.args = {
  continuous: true,
};

export const Cycle = Template.bind({});
Cycle.args = {
  cycle: true,
};

export const GoalPeriods = () => ({
  components: { TabsItems },
  data() {
    return {
      tab: 0,
    };
  },
  template: `
    <div>
      <v-tabs v-model="tab" color="primary">
        <v-tab>Today</v-tab>
        <v-tab>This Week</v-tab>
        <v-tab>This Month</v-tab>
        <v-tab>This Year</v-tab>
      </v-tabs>
      <TabsItems v-model="tab">
        <v-tab-item v-for="period in ['Daily', 'Weekly', 'Monthly', 'Yearly']" :key="period">
          <v-card flat class="pa-4">
            <h3>{{ period }} Goals</h3>
            <v-list>
              <v-list-tile v-for="i in 3" :key="i">
                <v-list-tile-avatar>
                  <v-icon>flag</v-icon>
                </v-list-tile-avatar>
                <v-list-tile-content>
                  <v-list-tile-title>{{ period }} Goal {{ i }}</v-list-tile-title>
                </v-list-tile-content>
              </v-list-tile>
            </v-list>
          </v-card>
        </v-tab-item>
      </TabsItems>
    </div>
  `,
});
