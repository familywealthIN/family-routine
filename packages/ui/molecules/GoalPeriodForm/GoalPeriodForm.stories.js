import GoalPeriodForm from './GoalPeriodForm.vue';

// The body of the year-goal create / edit sheet: one line of text, the period
// chip, the locked parent chip and the Add / Save button.
export default {
  title: 'Molecules/GoalPeriodForm',
  component: GoalPeriodForm,
  argTypes: {
    draft: { control: 'object' },
    value: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalPeriodForm },
  template: '<div style="max-width: 412px; background: #fff; padding: 16px;"><GoalPeriodForm v-bind="$props" /></div>',
});

const draft = {
  kind: 'week',
  period: 'week',
  date: '18-09-2026',
  goalRef: 'm9',
  parentLabel: 'Launch mobile dashboard',
  periodIcon: 'view_week',
  periodLabel: 'Week 38 · 13 – 19 Sep',
  placeholder: 'e.g. Beta feedback triage',
  title: 'New week goal',
};

export const Default = Template.bind({});
Default.args = { draft, value: '' };

export const Typed = Template.bind({});
Typed.args = { draft, value: 'Beta feedback triage' };

export const Editing = Template.bind({});
Editing.args = { draft: { ...draft, edit: 'w1' }, value: 'Beta feedback triage' };

export const NoParent = Template.bind({});
NoParent.args = {
  draft: {
    ...draft, kind: 'month', period: 'month', parentLabel: '', periodIcon: 'event', periodLabel: 'September 2026',
  },
  value: '',
};
