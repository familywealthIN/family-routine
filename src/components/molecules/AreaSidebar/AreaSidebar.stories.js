// molecules/AreaSidebar/AreaSidebar.stories.js
import AreaSidebar from './AreaSidebar.vue';

export default {
  title: 'Molecules/AreaSidebar',
  component: AreaSidebar,
  parameters: {
    layout: 'padded',
  },
};

export const Default = () => ({
  components: { AreaSidebar },
  template: '<AreaSidebar />',
});

export const WithDescription = () => ({
  components: { AreaSidebar },
  template: `
    <div>
      <p><strong>Area Sidebar</strong></p>
      <p>Displays collapsible list of user areas fetched from GraphQL API.</p>
      <AreaSidebar />
    </div>
  `,
});
