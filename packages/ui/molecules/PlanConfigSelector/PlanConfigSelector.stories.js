// molecules/PlanConfigSelector/PlanConfigSelector.stories.js
import PlanConfigSelector from './PlanConfigSelector.vue';

export default {
  title: 'Molecules/PlanConfigSelector',
  component: PlanConfigSelector,
  argTypes: {
    selectedRoutine: {
      control: 'text',
    },
    selectedPeriod: {
      control: { type: 'select' },
      options: ['week', 'month', 'year'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PlanConfigSelector },
  data() {
    return {
      routine: args.selectedRoutine || null,
      period: args.selectedPeriod || null,
      routinesList: args.routines || [
        { taskId: '1', name: 'Morning Routine' },
        { taskId: '2', name: 'Work Focus' },
        { taskId: '3', name: 'Exercise' },
        { taskId: '4', name: 'Study Session' },
        { taskId: '5', name: 'Evening Wind Down' },
      ],
    };
  },
  template: `
    <div style="max-width: 600px; padding: 20px;">
      <PlanConfigSelector
        :routines="routinesList"
        :selectedRoutine.sync="routine"
        :selectedPeriod.sync="period"
        v-bind="$props"
      />
      <div style="margin-top: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <strong>Selected Values:</strong><br>
        Routine: {{ routine || 'None' }}<br>
        Period: {{ period || 'None' }}
      </div>
    </div>
  `,
});

export const Default = Template.bind({});
Default.args = {
  routines: [
    { taskId: '1', name: 'Morning Routine' },
    { taskId: '2', name: 'Work Focus' },
    { taskId: '3', name: 'Exercise' },
    { taskId: '4', name: 'Study Session' },
    { taskId: '5', name: 'Evening Wind Down' },
  ],
  selectedRoutine: null,
  selectedPeriod: null,
  disabled: false,
};

export const WithSelection = Template.bind({});
WithSelection.args = {
  routines: [
    { taskId: '1', name: 'Morning Routine' },
    { taskId: '2', name: 'Work Focus' },
    { taskId: '3', name: 'Exercise' },
    { taskId: '4', name: 'Study Session' },
  ],
  selectedRoutine: '3',
  selectedPeriod: 'week',
  disabled: false,
};

export const Disabled = Template.bind({});
Disabled.args = {
  routines: [
    { taskId: '1', name: 'Morning Routine' },
    { taskId: '2', name: 'Work Focus' },
  ],
  selectedRoutine: null,
  selectedPeriod: null,
  disabled: true,
};

export const EmptyRoutines = Template.bind({});
EmptyRoutines.args = {
  routines: [],
  selectedRoutine: null,
  selectedPeriod: null,
  disabled: false,
};

export const CustomPeriodOptions = () => ({
  components: { PlanConfigSelector },
  data() {
    return {
      routine: null,
      period: null,
      customRoutines: [
        { taskId: '1', name: 'Daily Standup' },
        { taskId: '2', name: 'Code Review' },
      ],
      customPeriods: [
        { text: 'Sprint Goals', value: 'sprint' },
        { text: 'Quarter Goals', value: 'quarter' },
        { text: 'Annual Goals', value: 'year' },
      ],
    };
  },
  template: `
    <div style="max-width: 600px; padding: 20px;">
      <PlanConfigSelector
        :routines="customRoutines"
        :selectedRoutine.sync="routine"
        :selectedPeriod.sync="period"
        :periodOptions="customPeriods"
      />
      <div style="margin-top: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <strong>Selected Values:</strong><br>
        Routine: {{ routine || 'None' }}<br>
        Period: {{ period || 'None' }}
      </div>
    </div>
  `,
});
