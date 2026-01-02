// organisms/PendingList/PendingList.stories.js
import PendingList from './PendingList.vue';

export default {
  title: 'Organisms/PendingList',
  component: PendingList,
  parameters: {
    layout: 'padded',
  },
};

export const Default = () => ({
  components: { PendingList },
  template: '<PendingList />',
});

export const WithDescription = () => ({
  components: { PendingList },
  template: `
    <div>
      <p><strong>Pending List</strong></p>
      <p>Displays pending goals and tasks fetched from GraphQL with quick creation.</p>
      <PendingList />
    </div>
  `,
});
