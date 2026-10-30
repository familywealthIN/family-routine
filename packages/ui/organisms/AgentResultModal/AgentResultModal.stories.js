import AgentResultModal from './AgentResultModal.vue';

// A self-contained transcript, as an agent's end event would save it.
const TRANSCRIPT = `<!doctype html><html><body style="font-family:Roboto,Arial,sans-serif;margin:24px;color:#222">
<h2 style="margin:0 0 4px">PR Summarizer</h2>
<p style="margin:0 0 16px;color:#666">Run on 25-10-2026 &middot; Start Work &middot; finished in 4.2s</p>
<ul>
  <li><b>3</b> pull requests merged since yesterday</li>
  <li><b>1</b> awaiting review: "Add week-goal streak guard"</li>
  <li>CI is green on <code>develop</code></li>
</ul>
<p style="color:#2e7d32">End event returned 200 and the result was saved to the goal item.</p>
</body></html>`;

export default {
  title: 'Organisms/AgentResultModal',
  component: AgentResultModal,
  argTypes: {
    html: { control: 'text' },
    title: { control: 'text' },
  },
};

// The wrapper is a bottom sheet on a phone-width viewport and a 900px dialog
// above it, so resize the canvas to see both.
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AgentResultModal },
  template: '<AgentResultModal v-bind="$props" :value="open" @input="open = $event" />',
  data() {
    return { open: false };
  },
  mounted() {
    this.$nextTick(() => { this.open = true; });
  },
});

export const Transcript = Template.bind({});
Transcript.args = {
  title: 'PR Summarizer · run transcript',
  html: TRANSCRIPT,
};

export const NoContent = Template.bind({});
NoContent.args = {
  title: 'Agent result',
  html: '',
};
