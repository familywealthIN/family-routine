import TitleOptions from './TitleOptions.vue';

// The dashboard's day header: the date, and on today the skip-day switch and
// refresh (plus the wake toggle on an iPad); on any other day only refresh.
export default {
  title: 'Organisms/TitleOptions',
  component: TitleOptions,
  argTypes: {
    title: { control: 'text' },
    isToday: { control: 'boolean' },
    skipDay: { control: 'boolean' },
    refreshing: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TitleOptions },
  template: '<div style="max-width: 412px; background: #fff;"><TitleOptions v-bind="$props" /></div>',
});

export const Today = Template.bind({});
Today.args = { title: 'Thursday, 29 October', isToday: true, skipDay: false };

export const TodaySkipped = Template.bind({});
TodaySkipped.args = { title: 'Thursday, 29 October', isToday: true, skipDay: true };

export const OtherDay = Template.bind({});
OtherDay.args = { title: 'Tuesday, 27 October', isToday: false };

export const Refreshing = Template.bind({});
Refreshing.args = { title: 'Thursday, 29 October', isToday: true, refreshing: true };
