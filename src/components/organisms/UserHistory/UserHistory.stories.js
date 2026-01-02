// organisms/UserHistory/UserHistory.stories.js
import UserHistory from './UserHistory.vue';

export default {
  title: 'Organisms/UserHistory',
  component: UserHistory,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => ({
  components: { UserHistory },
  data() {
    return {
      routines: [
        {
          id: '1',
          date: '22-12-2025',
          tasklist: [
            { id: '1', name: 'Morning Exercise', ticked: true, points: 10 },
            { id: '2', name: 'Read', ticked: true, points: 5 },
            { id: '3', name: 'Meditate', ticked: false, passed: true, points: 5 },
          ],
        },
        {
          id: '2',
          date: '21-12-2025',
          tasklist: [
            { id: '4', name: 'Morning Exercise', ticked: true, points: 10 },
            { id: '5', name: 'Read', ticked: true, points: 5 },
          ],
        },
      ],
    };
  },
  template: '<UserHistory :routines="routines" />',
});

export const EmptyState = () => ({
  components: { UserHistory },
  data() {
    return {
      routines: [],
    };
  },
  template: '<UserHistory :routines="routines" />',
});
