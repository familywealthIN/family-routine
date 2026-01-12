// atoms/LoadingIndicator/LoadingIndicator.stories.js
import LoadingIndicator from './LoadingIndicator.vue';

export default {
  title: 'Atoms/LoadingIndicator',
  component: LoadingIndicator,
  argTypes: {
    loading: {
      control: 'boolean',
    },
    message: {
      control: 'text',
    },
    size: {
      control: {
        type: 'number', min: 20, max: 100, step: 10,
      },
    },
    width: {
      control: {
        type: 'number', min: 2, max: 10, step: 1,
      },
    },
  },
  parameters: {
    layout: 'centered',
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { LoadingIndicator },
  template: '<LoadingIndicator v-bind="$props" />',
});

export const Loading = Template.bind({});
Loading.args = {
  loading: true,
  message: '',
  size: 40,
  width: 4,
};

export const LoadingWithMessage = Template.bind({});
LoadingWithMessage.args = {
  loading: true,
  message: 'Loading your data...',
  size: 40,
  width: 4,
};

export const LoadingAI = Template.bind({});
LoadingAI.args = {
  loading: true,
  message: 'AI is analyzing your request...',
  size: 50,
  width: 4,
};

export const Small = Template.bind({});
Small.args = {
  loading: true,
  message: 'Loading...',
  size: 24,
  width: 3,
};

export const Large = Template.bind({});
Large.args = {
  loading: true,
  message: 'Processing large dataset...',
  size: 64,
  width: 6,
};

export const NotLoading = Template.bind({});
NotLoading.args = {
  loading: false,
  message: 'This will not display',
  size: 40,
  width: 4,
};

export const InCard = () => ({
  components: { LoadingIndicator },
  data() {
    return {
      loading: true,
    };
  },
  template: `
    <v-card width="400" height="300">
      <v-card-title>Data Overview</v-card-title>
      <v-card-text>
        <LoadingIndicator
          :loading="loading"
          message="Fetching latest data..."
        />
      </v-card-text>
      <v-card-actions>
        <v-btn @click="loading = !loading">
          Toggle Loading
        </v-btn>
      </v-card-actions>
    </v-card>
  `,
});
