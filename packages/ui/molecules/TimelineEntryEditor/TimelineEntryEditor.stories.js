// molecules/TimelineEntryEditor/TimelineEntryEditor.stories.js
import TimelineEntryEditor from './TimelineEntryEditor.vue';

export default {
  title: 'Molecules/TimelineEntryEditor',
  component: TimelineEntryEditor,
  argTypes: {
    title: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
    periodName: {
      control: 'text',
    },
    date: {
      control: 'text',
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'success', 'warning', 'error', 'info'],
    },
  },
  decorators: [
    () => ({
      template: '<v-timeline dense><story /></v-timeline>',
    }),
  ],
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TimelineEntryEditor },
  data() {
    return {
      entryTitle: args.title || '',
      entryDescription: args.description || '',
    };
  },
  template: `
    <TimelineEntryEditor
      :title.sync="entryTitle"
      :description.sync="entryDescription"
      v-bind="$props"
    />
  `,
});

export const WeekEntry = Template.bind({});
WeekEntry.args = {
  title: 'Complete project setup',
  description: 'Initialize repository, configure build tools, and set up development environment',
  periodName: 'Week 1',
  date: '2025-W01',
  color: 'primary',
  editorKey: 0,
};

export const MonthEntry = Template.bind({});
MonthEntry.args = {
  title: 'Launch MVP',
  description: '## Goals\n\n- Complete core features\n- User testing\n- Deploy to production',
  periodName: 'January',
  date: '2025-01',
  color: 'success',
  editorKey: 0,
};

export const YearEntry = Template.bind({});
YearEntry.args = {
  title: 'Master full-stack development',
  description: 'Learn:\n\n1. Frontend frameworks\n2. Backend APIs\n3. Database design\n4. DevOps basics',
  periodName: '2025',
  date: '2025',
  color: 'info',
  editorKey: 0,
};

export const Empty = Template.bind({});
Empty.args = {
  title: '',
  description: '',
  periodName: 'Week 2',
  date: '2025-W02',
  color: 'primary',
  editorKey: 0,
};

export const MultipleEntries = () => ({
  components: { TimelineEntryEditor },
  data() {
    return {
      entries: [
        {
          id: 1,
          title: 'Week 1: Foundation',
          description: 'Set up development environment',
          periodName: 'Week 1',
          date: '2025-W01',
          color: 'primary',
        },
        {
          id: 2,
          title: 'Week 2: Core Features',
          description: 'Implement main functionality',
          periodName: 'Week 2',
          date: '2025-W02',
          color: 'success',
        },
        {
          id: 3,
          title: 'Week 3: Testing',
          description: 'Write tests and fix bugs',
          periodName: 'Week 3',
          date: '2025-W03',
          color: 'warning',
        },
        {
          id: 4,
          title: 'Week 4: Deployment',
          description: 'Deploy to production',
          periodName: 'Week 4',
          date: '2025-W04',
          color: 'info',
        },
      ],
    };
  },
  template: `
    <div style="padding: 20px;">
      <v-timeline dense>
        <TimelineEntryEditor
          v-for="entry in entries"
          :key="entry.id"
          :title.sync="entry.title"
          :description.sync="entry.description"
          :periodName="entry.periodName"
          :date="entry.date"
          :color="entry.color"
          :editorKey="entry.id"
        />
      </v-timeline>
    </div>
  `,
});

export const LongDescription = Template.bind({});
LongDescription.args = {
  title: 'Learn Python Programming',
  description: `# Python Learning Path

## Phase 1: Fundamentals
- Variables and data types
- Control structures (if/else, loops)
- Functions and modules

## Phase 2: Intermediate
- Object-oriented programming
- File handling
- Error handling

## Phase 3: Advanced
- Decorators
- Generators
- Context managers

## Phase 4: Projects
Build 3 portfolio projects:
1. CLI task manager
2. Web scraper
3. REST API`,
  periodName: 'Q1 2025',
  date: '2025-Q1',
  color: 'primary',
  editorKey: 0,
};
