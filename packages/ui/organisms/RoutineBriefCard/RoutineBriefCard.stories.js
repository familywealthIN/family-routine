import RoutineBriefCard from './RoutineBriefCard.vue';

export default {
  title: 'Organisms/RoutineBriefCard',
  component: RoutineBriefCard,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    blocks: { control: 'object' },
    subline: { control: 'text' },
    open: { control: 'boolean' },
  },
};

const fitness = {
  tag: 'area:health:fitness',
  kind: 'AREA',
  icon: 'dashboard',
  color: '#288bd5',
  segments: ['Health', 'Fitness'],
  breadcrumb: 'Health › Fitness',
  description: 'About 5 km every other morning toward Run a half marathon.',
  stat: '2/3 recent',
  steps: [
    { text: 'Try the river loop', added: false },
    { text: 'Log shoe mileage', added: true },
    { text: 'Stretch for ten minutes after', added: false },
  ],
  activity: [
    { date: 'Fri', text: '5.2 km', done: true },
    { date: 'Wed', text: '5.0 km', done: true },
    { date: 'Mon', text: 'Missed · rain', done: false },
  ],
};

const pricing = {
  tag: 'project:pricing-page',
  kind: 'PROJECT',
  icon: 'folder',
  color: '#2196F3',
  segments: ['Work', 'Pricing page'],
  breadcrumb: 'Work › Pricing page',
  description: 'Ship the pricing page before the October release.',
  stat: '1/2 recent',
  steps: [
    { text: 'Ship the pricing page', added: false },
    { text: 'Draft the onboarding email', added: false },
  ],
  activity: [
    { date: 'Fri', text: 'Wireframes approved', done: true },
    { date: 'Thu', text: 'Copy review slipped', done: false },
  ],
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineBriefCard },
  template: '<div style="box-sizing:border-box;width:412px;background:#fff;padding:12px;border-radius:16px"><RoutineBriefCard v-bind="$props" @toggle="() => {}" @add-step="() => {}" /></div>',
});

export const Open = Template.bind({});
Open.args = {
  blocks: [fitness],
  subline: 'Health › Fitness · 2 next steps',
  open: true,
};

export const Collapsed = Template.bind({});
Collapsed.args = {
  blocks: [fitness],
  subline: 'Health › Fitness · 2 next steps',
  open: false,
};

export const AreaAndProject = Template.bind({});
AreaAndProject.args = {
  blocks: [fitness, pricing],
  subline: 'Health › Fitness · Work › Pricing page · 4 next steps',
  open: true,
};

export const Pending = Template.bind({});
Pending.args = {
  blocks: [{
    ...pricing, description: '', stat: '', steps: [], activity: [], pending: true,
  }],
  subline: 'Work › Pricing page',
  open: true,
};
