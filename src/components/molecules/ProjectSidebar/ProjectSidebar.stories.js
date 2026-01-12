// molecules/ProjectSidebar/ProjectSidebar.stories.js
import ProjectSidebar from './ProjectSidebar.vue';

export default {
  title: 'Molecules/ProjectSidebar',
  component: ProjectSidebar,
  parameters: {
    layout: 'padded',
  },
};

export const Default = () => ({
  components: { ProjectSidebar },
  template: '<ProjectSidebar />',
});

export const WithDescription = () => ({
  components: { ProjectSidebar },
  template: `
    <div>
      <p><strong>Project Sidebar</strong></p>
      <p>Displays collapsible list of user projects fetched from GraphQL API.</p>
      <ProjectSidebar />
    </div>
  `,
});
