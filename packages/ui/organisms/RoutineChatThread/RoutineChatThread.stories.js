import RoutineChatThread from './RoutineChatThread.vue';

export default {
  title: 'Organisms/RoutineChatThread',
  component: RoutineChatThread,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    messages: { control: 'object' },
    goalItems: { control: 'object' },
    routineName: { control: 'text' },
    heading: { control: 'text' },
    typing: { control: 'boolean' },
    replaceAddedProposals: { control: 'boolean' },
    quickReplies: { control: 'object' },
  },
};

const goalItems = [
  { id: 'g1', body: 'Ship the pricing page', isComplete: false },
  { id: 'g2', body: 'Draft the onboarding email', isComplete: true },
];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineChatThread },
  template: `
    <div style="box-sizing:border-box;width:412px;background:#fff;padding:12px 16px;border-radius:16px">
      <RoutineChatThread v-bind="$props" @toggle-item="() => {}" @add-proposals="() => {}" @quick-reply="() => {}" @toggle-brief="() => {}" />
    </div>`,
});

export const Empty = Template.bind({});
Empty.args = { messages: [], goalItems, routineName: 'Deep Work' };

export const Conversation = Template.bind({});
Conversation.args = {
  routineName: 'Deep Work',
  goalItems,
  messages: [
    {
      id: 'm1', from: 'routine', kind: 'event', text: 'Routine started · 09:00', tone: 'blue', icon: 'play_circle',
    },
    {
      id: 'm2', from: 'me', kind: 'text', text: 'What is left on my list?',
    },
    {
      id: 'm3', from: 'routine', kind: 'text', text: 'Two goal items are on this routine. One is already done.', items: ['g1', 'g2'],
    },
    {
      id: 'm4', from: 'routine', kind: 'event', text: 'Draft the onboarding email ticked · G +12', tone: 'green', icon: 'check_circle',
    },
  ],
  quickReplies: ['Break it down', 'What next?'],
};

export const Proposals = Template.bind({});
Proposals.args = {
  routineName: 'Deep Work',
  goalItems,
  messages: [
    {
      id: 'p1', from: 'me', kind: 'text', text: 'Break down shipping the pricing page',
    },
    {
      id: 'p2',
      from: 'routine',
      kind: 'text',
      text: 'Here is a way to split it into steps you can tick off.',
      proposals: ['Finalise the plan copy', 'Wire the checkout button', 'Review on mobile'],
    },
  ],
};

export const ProposalsAdded = Template.bind({});
ProposalsAdded.args = {
  routineName: 'Deep Work',
  goalItems,
  messages: [
    {
      id: 'a1',
      from: 'routine',
      kind: 'text',
      text: 'Added three steps to your checklist.',
      proposals: ['Finalise the plan copy', 'Wire the checkout button', 'Review on mobile'],
      added: true,
    },
  ],
};

export const InsightCard = Template.bind({});
InsightCard.args = {
  routineName: 'Jogging',
  goalItems: [],
  messages: [
    {
      id: 'i1', from: 'routine', kind: 'event', text: 'Jogging ticked · K +10', tone: 'green', icon: 'check_circle',
    },
    {
      id: 'i2',
      from: 'routine',
      kind: 'text',
      icon: 'tips_and_updates',
      text: 'Three mornings in a row\nStreaks like this are what turn a run into a habit.\nRight now: Stretch for five minutes while it is fresh.',
    },
  ],
};

export const BriefAndTyping = Template.bind({});
BriefAndTyping.args = {
  routineName: 'Jogging',
  goalItems: [],
  typing: true,
  messages: [
    {
      id: 'b1',
      kind: 'brief',
      from: 'routine',
      open: false,
      subline: 'Health › Fitness · 2 next steps',
      blocks: [],
    },
    {
      id: 'b2', from: 'me', kind: 'text', text: 'How far did I go last week?',
    },
  ],
};
