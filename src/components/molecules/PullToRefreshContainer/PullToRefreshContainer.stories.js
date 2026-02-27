import PullToRefreshContainer from './PullToRefreshContainer.vue';

export default {
  title: 'Molecules/PullToRefreshContainer',
  component: PullToRefreshContainer,
  argTypes: {
    refreshing: {
      control: 'boolean',
    },
    threshold: {
      control: { type: 'number', min: 50, max: 200 },
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'A container that supports pull-to-refresh gesture on mobile devices.',
      },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PullToRefreshContainer },
  data() {
    return {
      isRefreshing: false,
      items: ['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5'],
    };
  },
  methods: {
    handleRefresh() {
      this.isRefreshing = true;
      setTimeout(() => {
        this.isRefreshing = false;
        this.items.push(`Task ${this.items.length + 1}`);
      }, 1500);
    },
  },
  template: `
    <PullToRefreshContainer 
      :refreshing="isRefreshing" 
      @refresh="handleRefresh"
      v-bind="$props"
      style="height: 300px; overflow: auto; border: 1px solid #eee;"
    >
      <v-list>
        <v-list-tile v-for="(item, index) in items" :key="index">
          <v-list-tile-content>
            <v-list-tile-title>{{ item }}</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </PullToRefreshContainer>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const CustomThreshold = Template.bind({});
CustomThreshold.args = {
  threshold: 100,
};

export const Refreshing = Template.bind({});
Refreshing.args = {
  refreshing: true,
};

export const TaskListRefresh = () => ({
  components: { PullToRefreshContainer },
  data() {
    return {
      isRefreshing: false,
      tasks: [
        { id: 1, title: 'Morning meditation', completed: true },
        { id: 2, title: 'Exercise', completed: false },
        { id: 3, title: 'Review goals', completed: false },
        { id: 4, title: 'Team meeting', completed: false },
        { id: 5, title: 'Project work', completed: false },
      ],
    };
  },
  methods: {
    handleRefresh() {
      this.isRefreshing = true;
      setTimeout(() => {
        this.isRefreshing = false;
      }, 1500);
    },
  },
  template: `
    <v-card style="max-height: 400px;">
      <v-card-title>Today's Tasks</v-card-title>
      <PullToRefreshContainer 
        :refreshing="isRefreshing" 
        @refresh="handleRefresh"
        style="max-height: 300px; overflow: auto;"
      >
        <v-list>
          <v-list-tile v-for="task in tasks" :key="task.id">
            <v-list-tile-action>
              <v-checkbox v-model="task.completed"></v-checkbox>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title :class="{ 'text-decoration-line-through': task.completed }">
                {{ task.title }}
              </v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
      </PullToRefreshContainer>
    </v-card>
  `,
});
