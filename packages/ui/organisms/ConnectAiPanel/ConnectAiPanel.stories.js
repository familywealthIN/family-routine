import ConnectAiPanel from './ConnectAiPanel.vue';

// Fake credentials on example.com; the real secret is issued by the server and
// masked by the panel until the eye is pressed.
const SERVER_URL = 'https://mcp.example.com';
const SECRET = 'frt_secret_exampleexampleexample3f2a';

export default {
  title: 'Organisms/ConnectAiPanel',
  component: ConnectAiPanel,
  argTypes: {
    connected: { control: 'boolean' },
    serverUrl: { control: 'text' },
    clientId: { control: 'text' },
    clientSecret: { control: 'text' },
    copiedKey: { control: { type: 'select', options: ['', 'url', 'cid', 'sec'] } },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ConnectAiPanel },
  template: '<div style="max-width: 412px"><ConnectAiPanel ref="panel" v-bind="$props" @copy="onCopy" /></div>',
  methods: {
    onCopy(payload) {
      console.log('copy', payload.label);
    },
  },
});

export const NotConnected = Template.bind({});
NotConnected.args = {
  connected: false,
  serverUrl: SERVER_URL,
  clientSecret: SECRET,
};

export const Connected = Template.bind({});
Connected.args = {
  connected: true,
  serverUrl: SERVER_URL,
  clientSecret: SECRET,
};

export const CopiedUrl = Template.bind({});
CopiedUrl.args = {
  connected: true,
  serverUrl: SERVER_URL,
  clientSecret: SECRET,
  copiedKey: 'url',
};

// No credentials issued yet: em dashes, and the copy buttons are disabled.
export const NoCredentials = Template.bind({});
NoCredentials.args = {
  connected: false,
  serverUrl: '',
  clientId: '',
  clientSecret: '',
};
