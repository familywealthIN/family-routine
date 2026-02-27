import MenuButton from './MenuButton.vue';

export default {
  title: 'Molecules/MenuButton',
  component: MenuButton,
  argTypes: {
    iconButton: { control: 'boolean' },
    flat: { control: 'boolean' },
    small: { control: 'boolean' },
    large: { control: 'boolean' },
    dense: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

const defaultItems = [
  { text: 'Edit', icon: 'mdi-pencil', value: 'edit' },
  { text: 'Duplicate', icon: 'mdi-content-copy', value: 'duplicate' },
  { text: 'Share', icon: 'mdi-share', value: 'share' },
  { divider: true },
  {
    text: 'Delete', icon: 'mdi-delete', iconColor: 'error', value: 'delete',
  },
];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { MenuButton },
  template: '<MenuButton v-bind="$props" @item-click="handleClick" />',
  methods: {
    handleClick(item) {
      console.log('Clicked:', item);
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  items: defaultItems,
};

export const WithText = Template.bind({});
WithText.args = {
  items: defaultItems,
  buttonText: 'Actions',
  icon: 'mdi-chevron-down',
  iconButton: false,
};

export const Dense = Template.bind({});
Dense.args = {
  items: defaultItems,
  dense: true,
};

export const Small = Template.bind({});
Small.args = {
  items: defaultItems,
  small: true,
};

export const CustomIcon = Template.bind({});
CustomIcon.args = {
  items: defaultItems,
  icon: 'mdi-menu',
};

export const WithHeaders = Template.bind({});
WithHeaders.args = {
  items: [
    { header: 'Actions' },
    { text: 'Edit', icon: 'mdi-pencil' },
    { text: 'Delete', icon: 'mdi-delete' },
    { header: 'Share' },
    { text: 'Copy Link', icon: 'mdi-link' },
    { text: 'Email', icon: 'mdi-email' },
  ],
};

export const WithSubtitles = Template.bind({});
WithSubtitles.args = {
  items: [
    { text: 'Profile', subtitle: 'View your profile', icon: 'mdi-account' },
    { text: 'Settings', subtitle: 'Configure preferences', icon: 'mdi-cog' },
    { text: 'Logout', subtitle: 'Sign out of your account', icon: 'mdi-logout' },
  ],
};

export const WithDisabledItems = Template.bind({});
WithDisabledItems.args = {
  items: [
    { text: 'Available Action', icon: 'mdi-check' },
    { text: 'Disabled Action', icon: 'mdi-close', disabled: true },
    { text: 'Another Available', icon: 'mdi-check' },
  ],
};

export const FilterMenu = () => ({
  components: { MenuButton },
  data() {
    return {
      items: [
        { text: 'All Tasks', value: 'all' },
        { text: 'Active', value: 'active' },
        { text: 'Completed', value: 'completed' },
        { divider: true },
        { text: 'High Priority', value: 'high' },
        { text: 'Medium Priority', value: 'medium' },
        { text: 'Low Priority', value: 'low' },
      ],
    };
  },
  template: `
    <MenuButton
      :items="items"
      buttonText="Filter"
      icon="mdi-filter"
      :iconButton="false"
      flat
    />
  `,
});

export const SortMenu = () => ({
  components: { MenuButton },
  data() {
    return {
      items: [
        { text: 'Date Created', icon: 'mdi-sort-calendar-ascending' },
        { text: 'Date Modified', icon: 'mdi-sort-calendar-descending' },
        { text: 'Name (A-Z)', icon: 'mdi-sort-alphabetical-ascending' },
        { text: 'Name (Z-A)', icon: 'mdi-sort-alphabetical-descending' },
        { text: 'Priority', icon: 'mdi-sort-numeric-ascending' },
      ],
    };
  },
  template: `
    <MenuButton
      :items="items"
      icon="mdi-sort"
    />
  `,
});

export const CustomActivator = () => ({
  components: { MenuButton },
  data() {
    return {
      items: [
        { text: 'View Profile', icon: 'mdi-account' },
        { text: 'Settings', icon: 'mdi-cog' },
        { divider: true },
        { text: 'Logout', icon: 'mdi-logout' },
      ],
    };
  },
  template: `
    <MenuButton :items="items">
      <template #activator="{ on }">
        <v-chip v-on="on" color="primary" dark>
          <v-avatar left>
            <v-icon>mdi-account</v-icon>
          </v-avatar>
          John Doe
          <v-icon right>mdi-menu-down</v-icon>
        </v-chip>
      </template>
    </MenuButton>
  `,
});
