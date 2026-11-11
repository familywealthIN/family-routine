import AboutHeroCard from './AboutHeroCard.vue';

// Storybook serves no /img folder, so the app mark is an inline placeholder.
const LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#288bd5"/><path d="M26 50l15 15 29-34" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
)}`;

export default {
  title: 'Molecules/AboutHeroCard',
  component: AboutHeroCard,
  argTypes: {
    version: { control: 'text' },
    logo: { control: 'text' },
    belief: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AboutHeroCard },
  template: '<div style="max-width: 412px"><AboutHeroCard v-bind="$props" /></div>',
});

export const Default = Template.bind({});
Default.args = {
  version: '1.2.3',
  logo: LOGO,
};

export const UnknownVersion = Template.bind({});
UnknownVersion.args = {
  version: '',
  logo: LOGO,
};

export const CustomBelief = Template.bind({});
CustomBelief.args = {
  version: '1.2.3',
  logo: LOGO,
  belief: 'Small, repeated days are the only plan that survives contact with real life.',
};
