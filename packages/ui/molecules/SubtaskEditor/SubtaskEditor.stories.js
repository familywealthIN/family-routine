import SubtaskEditor from './SubtaskEditor.vue';

export default {
  title: 'Molecules/SubtaskEditor',
  component: SubtaskEditor,
  argTypes: {
    subtasks: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { SubtaskEditor },
  template: `
    <div style="width:360px;padding:16px;background:#fff;border-radius:16px">
      <SubtaskEditor
        v-bind="$props"
        @add="log('add', $event)"
        @rename="log('rename', $event)"
        @toggle="log('toggle', $event)"
        @move-up="log('move-up', $event)"
        @remove="log('remove', $event)"
      />
    </div>`,
  methods: {
    log(name, payload) {
      console.log('subtask editor', name, payload);
    },
  },
});

export const InProgress = Template.bind({});
InProgress.args = {
  subtasks: [
    { id: 's1', body: 'Draft the three plan cards', isComplete: true },
    { id: 's2', body: 'Wire up the checkout link', isComplete: true },
    { id: 's3', body: 'Write the pricing FAQ', isComplete: false },
    { id: 's4', body: 'Ask two beta users to review', isComplete: false },
  ],
};

export const Empty = Template.bind({});
Empty.args = {
  subtasks: [],
};

export const AllDone = Template.bind({});
AllDone.args = {
  subtasks: [
    { id: 's1', body: 'Course 1: Foundations of UX design', isComplete: true },
    { id: 's2', body: 'Course 2: Start the UX design process', isComplete: true },
    { id: 's3', body: 'Course 3: Build wireframes and low-fidelity prototypes', isComplete: true },
  ],
};

export const LongNames = Template.bind({});
LongNames.args = {
  subtasks: [
    { id: 's1', body: 'Interview five people who already track their routines in a notes app and write up what they do on a missed day', isComplete: false },
    { id: 's2', body: 'Run 5 km', isComplete: true },
  ],
};
