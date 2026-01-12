// organisms/FamilyUserHistory/FamilyUserHistory.stories.js
import FamilyUserHistory from './FamilyUserHistory.vue';

export default {
  title: 'Organisms/FamilyUserHistory',
  component: FamilyUserHistory,
  parameters: {
    layout: 'fullscreen',
  },
};

// Mock routine history data
const mockRoutines = [
  {
    date: '10-01-2026',
    active: false,
    tasklist: [
      {
        id: '1', name: 'Morning Exercise', points: 10, ticked: true, passed: false, wait: false,
      },
      {
        id: '2', name: 'Review Emails', points: 5, ticked: true, passed: false, wait: false,
      },
      {
        id: '3', name: 'Team Meeting', points: 8, ticked: false, passed: true, wait: false,
      },
    ],
  },
  {
    date: '09-01-2026',
    active: false,
    tasklist: [
      {
        id: '4', name: 'Morning Exercise', points: 10, ticked: true, passed: false, wait: false,
      },
      {
        id: '5', name: 'Write Documentation', points: 15, ticked: true, passed: false, wait: false,
      },
      {
        id: '6', name: 'Code Review', points: 10, ticked: true, passed: false, wait: false,
      },
      {
        id: '7', name: 'Evening Meditation', points: 5, ticked: false, passed: false, wait: false,
      },
    ],
  },
  {
    date: '08-01-2026',
    active: false,
    tasklist: [
      {
        id: '8', name: 'Morning Exercise', points: 10, ticked: false, passed: true, wait: false,
      },
      {
        id: '9', name: 'Client Call', points: 12, ticked: true, passed: false, wait: false,
      },
      {
        id: '10', name: 'Project Planning', points: 8, ticked: false, passed: false, wait: true,
      },
    ],
  },
];

export const Default = () => ({
  components: { FamilyUserHistory },
  data() {
    return {
      routines: mockRoutines,
    };
  },
  template: '<FamilyUserHistory :routines="routines" />',
});

export const EmptyHistory = () => ({
  components: { FamilyUserHistory },
  data() {
    return {
      routines: [],
    };
  },
  template: '<FamilyUserHistory :routines="routines" />',
});

export const SingleDay = () => ({
  components: { FamilyUserHistory },
  data() {
    return {
      routines: [mockRoutines[0]],
    };
  },
  template: '<FamilyUserHistory :routines="routines" />',
});
