// atoms/WakeCheck/WakeCheck.stories.js
import WakeCheck from './WakeCheck.vue';

export default {
  title: 'Atoms/WakeCheck',
  component: WakeCheck,
  parameters: {
    layout: 'centered',
  },
};

export const Default = () => ({
  components: { WakeCheck },
  template: '<WakeCheck />',
});

export const WithDescription = () => ({
  components: { WakeCheck },
  template: `
    <div>
      <p><strong>Wake Check</strong></p>
      <p>iOS/iPad wake lock switch to prevent screen sleep during routine tracking.</p>
      <WakeCheck />
    </div>
  `,
});
