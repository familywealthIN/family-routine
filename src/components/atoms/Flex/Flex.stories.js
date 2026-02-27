import Flex from './Flex.vue';

export default {
  title: 'Atoms/Flex',
  component: Flex,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Flex },
  template: `
    <v-layout row wrap style="background: #f5f5f5;">
      <Flex v-bind="$props" style="background: #1976d2; color: white; padding: 16px;">
        Flex Item
      </Flex>
    </v-layout>
  `,
});

export const Xs12 = Template.bind({});
Xs12.args = {
  xs12: true,
};

export const Xs6 = Template.bind({});
Xs6.args = {
  xs6: true,
};

export const ResponsiveGrid = () => ({
  components: { Flex },
  template: `
    <v-layout row wrap style="background: #f5f5f5; gap: 8px;">
      <Flex xs12 sm6 md4 lg3 style="background: #1976d2; color: white; padding: 16px;">
        Item 1
      </Flex>
      <Flex xs12 sm6 md4 lg3 style="background: #1976d2; color: white; padding: 16px;">
        Item 2
      </Flex>
      <Flex xs12 sm6 md4 lg3 style="background: #1976d2; color: white; padding: 16px;">
        Item 3
      </Flex>
      <Flex xs12 sm6 md4 lg3 style="background: #1976d2; color: white; padding: 16px;">
        Item 4
      </Flex>
    </v-layout>
  `,
});

export const WithOffset = () => ({
  components: { Flex },
  template: `
    <v-layout row wrap style="background: #f5f5f5;">
      <Flex xs6 offset-xs3 style="background: #1976d2; color: white; padding: 16px;">
        Centered Item (xs6 with offset-xs3)
      </Flex>
    </v-layout>
  `,
});
