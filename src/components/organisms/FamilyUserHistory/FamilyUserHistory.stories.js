// organisms/FamilyUserHistory/FamilyUserHistory.stories.js
import FamilyUserHistory from './FamilyUserHistory.vue';

export default {
  title: 'Organisms/FamilyUserHistory',
  component: FamilyUserHistory,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => ({
  components: { FamilyUserHistory },
  template: '<FamilyUserHistory />',
});
