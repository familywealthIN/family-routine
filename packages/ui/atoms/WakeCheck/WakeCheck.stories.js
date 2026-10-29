// atoms/WakeCheck/WakeCheck.stories.js
import WakeCheck from './WakeCheck.vue';

// WakeCheck renders only on an iPad (it reads the user agent), so the stories
// show it as an iPad sees it; on any other device it renders nothing.
const OnIPad = {
  extends: WakeCheck,
  data: () => ({ isIPad: true }),
};

export default {
  title: 'Atoms/WakeCheck',
  component: WakeCheck,
  parameters: {
    layout: 'centered',
  },
};

export const Default = () => ({
  components: { WakeCheck: OnIPad },
  template: '<WakeCheck />',
});

export const WithDescription = () => ({
  components: { WakeCheck: OnIPad },
  template: `
    <div>
      <p><strong>Wake Check</strong></p>
      <p>iOS/iPad wake lock switch to prevent screen sleep during routine tracking.</p>
      <WakeCheck />
    </div>
  `,
});
