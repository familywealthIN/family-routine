// molecules/YearGoalSidebar/YearGoalSidebar.stories.js
import YearGoalSidebar from './YearGoalSidebar.vue';

export default {
  title: 'Molecules/YearGoalSidebar',
  component: YearGoalSidebar,
  parameters: {
    layout: 'padded',
  },
};

export const Default = () => ({
  components: { YearGoalSidebar },
  template: '<YearGoalSidebar />',
});

export const WithDescription = () => ({
  components: { YearGoalSidebar },
  template: `
    <div>
      <p><strong>Year Goal Sidebar</strong></p>
      <p>Displays current year goals grouped by category with completion counts.</p>
      <YearGoalSidebar />
    </div>
  `,
});
