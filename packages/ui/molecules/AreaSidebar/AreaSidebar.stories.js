// molecules/AreaSidebar/AreaSidebar.stories.js
import AreaSidebar from './AreaSidebar.vue';

export default {
  title: 'Molecules/AreaSidebar',
  component: AreaSidebar,
  parameters: {
    layout: 'padded',
  },
};

const sampleAreaTags = [
  'area:health',
  'area:health:fitness',
  'area:health:nutrition',
  'area:work',
  'area:work:projects',
  'area:personal',
  'area:family',
  'area:learning',
];

export const Default = () => ({
  components: { AreaSidebar },
  data() {
    return { areaTags: sampleAreaTags };
  },
  template: '<AreaSidebar :areaTags="areaTags" />',
});

export const FlatAreas = () => ({
  components: { AreaSidebar },
  data() {
    return {
      areaTags: ['area:health', 'area:work', 'area:personal', 'area:family'],
    };
  },
  template: '<AreaSidebar :areaTags="areaTags" />',
});

export const WithDescription = () => ({
  components: { AreaSidebar },
  data() {
    return { areaTags: sampleAreaTags };
  },
  template: `
    <div>
      <p><strong>Area Sidebar</strong></p>
      <p>Displays collapsible list of user areas. Areas with sub-areas (area:health:fitness) are shown as nested groups.</p>
      <AreaSidebar :areaTags="areaTags" />
    </div>
  `,
});
