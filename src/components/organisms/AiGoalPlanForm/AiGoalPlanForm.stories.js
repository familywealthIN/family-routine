// organisms/AiGoalPlanForm/AiGoalPlanForm.stories.js
import AiGoalPlanForm from './AiGoalPlanForm.vue';

export default {
  title: 'Organisms/AiGoalPlanForm',
  component: AiGoalPlanForm,
};

const mockRoutines = [
  { taskId: '1', name: 'Morning Routine', tags: ['morning', 'health'] },
  { taskId: '2', name: 'Work Focus', tags: ['work', 'productivity'] },
  { taskId: '3', name: 'Exercise', tags: ['health', 'fitness'] },
  { taskId: '4', name: 'Study Session', tags: ['learning', 'growth'] },
];

const mockGoalItemsRef = [
  { id: 'g1', body: 'Complete Q4 objectives', taskRef: '2' },
  { id: 'g2', body: 'Fitness milestone', taskRef: '3' },
];

const mockMilestoneData = {
  period: 'week',
  title: 'Learn Python Fundamentals',
  isMilestone: false,
  goalRef: null,
  entries: [
    {
      period: 'day',
      periodName: 'Monday',
      date: '23-12-2025',
      title: 'Setup environment',
      description: 'Install Python and VS Code',
    },
    {
      period: 'day',
      periodName: 'Tuesday',
      date: '24-12-2025',
      title: 'Learn variables',
      description: 'Study basic data types',
    },
    {
      period: 'day',
      periodName: 'Wednesday',
      date: '25-12-2025',
      title: 'Control flow',
      description: 'If/else and loops',
    },
  ],
};

export const WeekPlan = () => ({
  components: { AiGoalPlanForm },
  data() {
    return {
      searchQuery: 'Learn Python this week',
      routines: mockRoutines,
      goalItemsRef: mockGoalItemsRef,
      loading: false,
    };
  },
  template: `
    <div style="max-width: 800px; padding: 20px;">
      <AiGoalPlanForm
        :searchQuery="searchQuery"
        :routines="routines"
        :goalItemsRef="goalItemsRef"
        :loading="loading"
        :currentTask="{ id: '4', name: 'Study Session' }"
        @error="handleError"
        @goals-saved="handleSaved"
      />
    </div>
  `,
  methods: {
    handleError(msg) {
      console.error('Error:', msg);
      alert(msg);
    },
    handleSaved(items) {
      console.log('Goals saved:', items);
      alert(`Saved ${items.length} goals!`);
    },
  },
});

export const MonthPlan = () => ({
  components: { AiGoalPlanForm },
  data() {
    return {
      searchQuery: 'Build a full-stack app this month',
      routines: mockRoutines,
      goalItemsRef: mockGoalItemsRef,
      loading: false,
      milestoneData: {
        period: 'month',
        title: 'Full-Stack App Development',
        isMilestone: false,
        goalRef: null,
        entries: [
          {
            period: 'week',
            periodName: 'Week 1',
            date: '2025-W52',
            title: 'Backend API',
            description: '## Goals\n- Setup Express\n- Create REST endpoints\n- Database schema',
          },
          {
            period: 'week',
            periodName: 'Week 2',
            date: '2026-W01',
            title: 'Frontend',
            description: '## Goals\n- React setup\n- Component library\n- State management',
          },
          {
            period: 'week',
            periodName: 'Week 3',
            date: '2026-W02',
            title: 'Integration',
            description: '## Goals\n- Connect frontend to backend\n- Authentication\n- Testing',
          },
          {
            period: 'week',
            periodName: 'Week 4',
            date: '2026-W03',
            title: 'Deployment',
            description: '## Goals\n- Deploy to production\n- CI/CD pipeline\n- Documentation',
          },
        ],
      },
    };
  },
  mounted() {
    // Inject milestone data for demo
    this.$children[0].milestoneData = this.milestoneData;
    this.$children[0].selectedRoutine = '2';
    this.$children[0].selectedGoalPeriod = 'month';
  },
  template: `
    <div style="max-width: 800px; padding: 20px;">
      <AiGoalPlanForm
        :searchQuery="searchQuery"
        :routines="routines"
        :goalItemsRef="goalItemsRef"
        :loading="loading"
        :currentTask="{ id: '2', name: 'Work Focus' }"
        @error="handleError"
        @goals-saved="handleSaved"
      />
    </div>
  `,
  methods: {
    handleError(msg) {
      console.error('Error:', msg);
    },
    handleSaved(items) {
      console.log('Goals saved:', items);
    },
  },
});

export const YearPlan = () => ({
  components: { AiGoalPlanForm },
  data() {
    return {
      searchQuery: 'Career growth plan for this year',
      routines: mockRoutines,
      goalItemsRef: mockGoalItemsRef,
      loading: false,
      milestoneData: {
        period: 'year',
        title: 'Professional Development 2025',
        isMilestone: false,
        goalRef: null,
        entries: [
          {
            period: 'month',
            periodName: 'Q1',
            date: '2025-03',
            title: 'Master TypeScript',
            description: 'Complete advanced TypeScript course',
          },
          {
            period: 'month',
            periodName: 'Q2',
            date: '2025-06',
            title: 'Build 3 projects',
            description: 'Portfolio-worthy full-stack projects',
          },
          {
            period: 'month',
            periodName: 'Q3',
            date: '2025-09',
            title: 'System design',
            description: 'Study scalable architectures',
          },
          {
            period: 'month',
            periodName: 'Q4',
            date: '2025-12',
            title: 'Job search',
            description: 'Apply to senior positions',
          },
        ],
      },
    };
  },
  mounted() {
    this.$children[0].milestoneData = this.milestoneData;
    this.$children[0].selectedRoutine = '2';
    this.$children[0].selectedGoalPeriod = 'year';
  },
  template: `
    <div style="max-width: 800px; padding: 20px;">
      <AiGoalPlanForm
        :searchQuery="searchQuery"
        :routines="routines"
        :goalItemsRef="goalItemsRef"
        :loading="loading"
        :currentTask="{ id: '2', name: 'Work Focus' }"
      />
    </div>
  `,
});

export const WithMilestoneLink = () => ({
  components: { AiGoalPlanForm },
  data() {
    return {
      searchQuery: 'Monthly workout plan',
      routines: mockRoutines,
      goalItemsRef: [
        { id: 'g1', body: 'Get fit this year', taskRef: '3' },
        { id: 'g2', body: 'Build strength', taskRef: '3' },
      ],
      loading: false,
      milestoneData: {
        period: 'month',
        title: 'December Workout Plan',
        isMilestone: true,
        goalRef: 'g1',
        entries: [
          {
            period: 'week',
            periodName: 'Week 1',
            date: '2025-W51',
            title: 'Cardio focus',
            description: 'Running and cycling',
          },
          {
            period: 'week',
            periodName: 'Week 2',
            date: '2025-W52',
            title: 'Strength training',
            description: 'Upper body workouts',
          },
        ],
      },
    };
  },
  mounted() {
    this.$children[0].milestoneData = this.milestoneData;
    this.$children[0].selectedRoutine = '3';
    this.$children[0].selectedGoalPeriod = 'month';
  },
  template: `
    <div style="max-width: 800px; padding: 20px;">
      <AiGoalPlanForm
        :searchQuery="searchQuery"
        :routines="routines"
        :goalItemsRef="goalItemsRef"
        :loading="loading"
        :currentTask="{ id: '3', name: 'Exercise' }"
      />
    </div>
  `,
});

export const Loading = () => ({
  components: { AiGoalPlanForm },
  data() {
    return {
      searchQuery: 'Learn data structures',
      routines: mockRoutines,
      goalItemsRef: mockGoalItemsRef,
      loading: true,
    };
  },
  template: `
    <div style="max-width: 800px; padding: 20px;">
      <AiGoalPlanForm
        :searchQuery="searchQuery"
        :routines="routines"
        :goalItemsRef="goalItemsRef"
        :loading="loading"
      />
      <div style="text-align: center; margin-top: 20px; color: #666;">
        Simulating AI generation...
      </div>
    </div>
  `,
});
