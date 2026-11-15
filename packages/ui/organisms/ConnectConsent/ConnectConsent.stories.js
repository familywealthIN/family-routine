import ConnectConsent from './ConnectConsent.vue';

export default {
  title: 'Organisms/ConnectConsent',
  component: ConnectConsent,
  argTypes: {
    status: { control: { type: 'select', options: ['loading', 'ready', 'working', 'invalid'] } },
    clientName: { control: 'text' },
    redirectHost: { control: 'text' },
    email: { control: 'text' },
    message: { control: 'text' },
    logo: { control: 'text' },
  },
  parameters: { layout: 'fullscreen' },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ConnectConsent },
  template: '<ConnectConsent v-bind="$props" @allow="log(\'allow\')" @cancel="log(\'cancel\')" @switch-account="log(\'switch\')" @back="log(\'back\')" />',
  methods: {
    log(what) {
      console.log(what);
    },
  },
});

// Self-contained, so the story needs no static files from the web app.
const LOGO = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="22" fill="#288bd5"/><path d="M26 50l15 15 30-34" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>')}`;

const READY = {
  logo: LOGO,
  status: 'ready',
  clientName: 'Claude',
  redirectHost: 'claude.ai',
  email: 'alex@example.com',
};

export const Claude = Template.bind({});
Claude.args = READY;

// A client that registered no name: the return host stands in for it.
export const Unnamed = Template.bind({});
Unnamed.args = { ...READY, clientName: '', redirectHost: 'n8n.example.com' };

export const Allowing = Template.bind({});
Allowing.args = { ...READY, status: 'working' };

export const Loading = Template.bind({});
Loading.args = { ...READY, status: 'loading' };

export const Invalid = Template.bind({});
Invalid.args = { ...READY, status: 'invalid' };
