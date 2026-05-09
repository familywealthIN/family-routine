import TabItem from './TabItem.vue';

export default {
  title: 'Atoms/TabItem',
  component: TabItem,
  argTypes: {
    transition: {
      control: 'text',
    },
    reverseTransition: {
      control: 'text',
    },
    lazy: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TabItem },
  data() {
    return {
      tab: 0,
    };
  },
  template: `
    <div>
      <v-tabs v-model="tab">
        <v-tab>Tab 1</v-tab>
        <v-tab>Tab 2</v-tab>
      </v-tabs>
      <v-tabs-items v-model="tab">
        <TabItem v-bind="$props">
          <v-card flat>
            <v-card-text>Content for Tab 1</v-card-text>
          </v-card>
        </TabItem>
        <TabItem>
          <v-card flat>
            <v-card-text>Content for Tab 2</v-card-text>
          </v-card>
        </TabItem>
      </v-tabs-items>
    </div>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const WithContent = () => ({
  components: { TabItem },
  data() {
    return {
      tab: 0,
    };
  },
  template: `
    <div>
      <v-tabs v-model="tab">
        <v-tab>Goals</v-tab>
        <v-tab>Tasks</v-tab>
        <v-tab>Progress</v-tab>
      </v-tabs>
      <v-tabs-items v-model="tab">
        <TabItem>
          <v-card flat>
            <v-card-text>
              <h3>Your Goals</h3>
              <p>Track and manage your personal and family goals here.</p>
              <v-list>
                <v-list-tile v-for="i in 3" :key="i">
                  <v-list-tile-content>
                    <v-list-tile-title>Goal {{ i }}</v-list-tile-title>
                  </v-list-tile-content>
                </v-list-tile>
              </v-list>
            </v-card-text>
          </v-card>
        </TabItem>
        <TabItem>
          <v-card flat>
            <v-card-text>
              <h3>Today's Tasks</h3>
              <p>View and complete your daily tasks.</p>
            </v-card-text>
          </v-card>
        </TabItem>
        <TabItem>
          <v-card flat>
            <v-card-text>
              <h3>Progress Overview</h3>
              <p>See how you're doing over time.</p>
            </v-card-text>
          </v-card>
        </TabItem>
      </v-tabs-items>
    </div>
  `,
});

export const Lazy = Template.bind({});
Lazy.args = {
  lazy: true,
};
