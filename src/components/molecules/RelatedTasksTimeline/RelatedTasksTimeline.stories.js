// molecules/RelatedTasksTimeline/RelatedTasksTimeline.stories.js
import RelatedTasksTimeline from './RelatedTasksTimeline.vue';

export default {
  title: 'Molecules/RelatedTasksTimeline',
  component: RelatedTasksTimeline,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RelatedTasksTimeline },
  template: '<RelatedTasksTimeline v-bind="$props" />',
});

export const WithTasks = Template.bind({});
WithTasks.args = {
  tasks: [
    {
      id: '1',
      body: 'Morning workout routine',
      date: '22-12-2025',
      time: '06:00',
      tags: ['exercise', 'health'],
      isComplete: true,
    },
    {
      id: '2',
      body: 'Study JavaScript fundamentals',
      date: '22-12-2025',
      time: '09:00',
      tags: ['learning', 'coding'],
      isComplete: false,
    },
    {
      id: '3',
      body: 'Work on portfolio project',
      date: '23-12-2025',
      time: '14:00',
      tags: ['project', 'coding'],
      isComplete: false,
    },
  ],
};

export const CompletedTasks = Template.bind({});
CompletedTasks.args = {
  tasks: [
    {
      id: '1',
      body: 'Complete module 1 of course',
      date: '20-12-2025',
      time: '10:00',
      tags: ['learning'],
      isComplete: true,
    },
    {
      id: '2',
      body: 'Submit assignment',
      date: '21-12-2025',
      time: '15:00',
      tags: ['work', 'deadline'],
      isComplete: true,
    },
  ],
};

export const MixedStatus = Template.bind({});
MixedStatus.args = {
  tasks: [
    {
      id: '1',
      body: 'Week 1: Setup development environment',
      date: '15-12-2025',
      time: null,
      tags: ['week1', 'setup'],
      isComplete: true,
    },
    {
      id: '2',
      body: 'Week 2: Learn core concepts',
      date: '22-12-2025',
      time: null,
      tags: ['week2', 'learning'],
      isComplete: false,
    },
    {
      id: '3',
      body: 'Week 3: Build first project',
      date: '29-12-2025',
      time: null,
      tags: ['week3', 'project'],
      isComplete: false,
    },
  ],
};

export const NoTags = Template.bind({});
NoTags.args = {
  tasks: [
    {
      id: '1',
      body: 'Simple task without tags',
      date: '22-12-2025',
      time: '08:00',
      tags: [],
      isComplete: false,
    },
    {
      id: '2',
      body: 'Another task',
      date: '23-12-2025',
      time: '10:00',
      isComplete: true,
    },
  ],
};

export const EmptyTasks = Template.bind({});
EmptyTasks.args = {
  tasks: [],
};

export const ManyTasks = Template.bind({});
ManyTasks.args = {
  tasks: Array.from({ length: 10 }, (_, i) => ({
    id: `${i + 1}`,
    body: `Task ${i + 1}: Complete milestone ${i + 1}`,
    date: moment().add(i, 'days').format('DD-MM-YYYY'),
    time: `${8 + i}:00`,
    tags: ['milestone', `week${Math.floor(i / 3) + 1}`],
    isComplete: i % 3 === 0,
  })),
};

export const WithLongContent = Template.bind({});
WithLongContent.args = {
  tasks: [
    {
      id: '1',
      body: 'Complete comprehensive analysis of user requirements and document all edge cases for the new feature implementation',
      date: '22-12-2025',
      time: '09:00',
      tags: ['analysis', 'documentation', 'requirements', 'edge-cases'],
      isComplete: false,
    },
    {
      id: '2',
      body: 'Review pull request',
      date: '22-12-2025',
      time: '14:00',
      tags: ['code-review'],
      isComplete: true,
    },
  ],
};

// Import moment for ManyTasks story
import moment from 'moment';
