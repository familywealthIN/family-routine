import TimelineItemList from './TimelineItemList.vue';

export default {
  title: 'Molecules/TimelineItemList',
  component: TimelineItemList,
  argTypes: {
    dense: {
      control: 'boolean',
    },
    alignTop: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TimelineItemList },
  data() {
    return {
      items: [
        {
          id: 1, time: '6:00 AM', title: 'Wake up', icon: 'alarm', color: 'blue',
        },
        {
          id: 2, time: '6:30 AM', title: 'Exercise', icon: 'fitness_center', color: 'green',
        },
        {
          id: 3, time: '7:30 AM', title: 'Breakfast', icon: 'restaurant', color: 'orange',
        },
        {
          id: 4, time: '8:00 AM', title: 'Start work', icon: 'work', color: 'purple',
        },
      ],
    };
  },
  template: '<TimelineItemList :items="items" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {};

export const Dense = Template.bind({});
Dense.args = {
  dense: true,
};

export const AlignTop = Template.bind({});
AlignTop.args = {
  alignTop: true,
};

export const GoalMilestones = () => ({
  components: { TimelineItemList },
  data() {
    return {
      milestones: [
        {
          id: 1,
          time: 'Week 1',
          title: 'Learn basics',
          description: 'Complete introductory course',
          icon: 'school',
          color: 'blue',
          completed: true,
        },
        {
          id: 2,
          time: 'Week 2-3',
          title: 'Practice exercises',
          description: 'Complete 50 practice problems',
          icon: 'code',
          color: 'green',
          completed: true,
        },
        {
          id: 3,
          time: 'Week 4',
          title: 'Build project',
          description: 'Create a small application',
          icon: 'build',
          color: 'orange',
          completed: false,
        },
        {
          id: 4,
          time: 'Week 5',
          title: 'Review & refine',
          description: 'Polish and document project',
          icon: 'rate_review',
          color: 'purple',
          completed: false,
        },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>Learning JavaScript - Milestones</v-card-title>
      <v-card-text>
        <TimelineItemList :items="milestones" />
      </v-card-text>
    </v-card>
  `,
});

export const DailySchedule = () => ({
  components: { TimelineItemList },
  data() {
    return {
      schedule: [
        {
          id: 1, time: '6:00 AM', title: 'Wake up & Morning routine', icon: 'wb_sunny', color: 'amber',
        },
        {
          id: 2, time: '7:00 AM', title: 'Exercise', icon: 'directions_run', color: 'green',
        },
        {
          id: 3, time: '8:00 AM', title: 'Breakfast with family', icon: 'family_restroom', color: 'pink',
        },
        {
          id: 4, time: '9:00 AM', title: 'Deep work session', icon: 'psychology', color: 'indigo',
        },
        {
          id: 5, time: '12:00 PM', title: 'Lunch break', icon: 'lunch_dining', color: 'orange',
        },
        {
          id: 6, time: '1:00 PM', title: 'Meetings & collaboration', icon: 'groups', color: 'blue',
        },
        {
          id: 7, time: '5:00 PM', title: 'Review & plan tomorrow', icon: 'checklist', color: 'teal',
        },
        {
          id: 8, time: '6:00 PM', title: 'Family time', icon: 'home', color: 'red',
        },
        {
          id: 9, time: '9:00 PM', title: 'Wind down', icon: 'bedtime', color: 'purple',
        },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>Daily Schedule</v-card-title>
      <v-card-text>
        <TimelineItemList :items="schedule" dense />
      </v-card-text>
    </v-card>
  `,
});
