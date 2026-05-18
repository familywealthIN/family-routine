import ListItem from './ListItem.vue';

export default {
  title: 'Molecules/ListItem',
  component: ListItem,
  decorators: [
    () => ({
      template: '<v-list><story /></v-list>',
    }),
  ],
  argTypes: {
    avatar: { control: 'boolean' },
    inactive: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ListItem },
  template: '<ListItem v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  title: 'List Item Title',
  subtitle: 'List item subtitle text',
};

export const TitleOnly = Template.bind({});
TitleOnly.args = {
  title: 'Simple list item',
};

export const WithAvatarImage = Template.bind({});
WithAvatarImage.args = {
  title: 'John Doe',
  subtitle: 'john.doe@example.com',
  avatar: true,
  avatarSrc: 'https://randomuser.me/api/portraits/men/1.jpg',
};

export const WithAvatarIcon = Template.bind({});
WithAvatarIcon.args = {
  title: 'Settings',
  subtitle: 'Configure your preferences',
  avatar: true,
  avatarIcon: 'mdi-cog',
  avatarColor: 'primary',
};

export const WithAvatarText = Template.bind({});
WithAvatarText.args = {
  title: 'Jane Smith',
  subtitle: 'jane.smith@example.com',
  avatar: true,
  avatarText: 'JS',
  avatarColor: 'success',
};

export const Disabled = Template.bind({});
Disabled.args = {
  title: 'Disabled Item',
  subtitle: 'This item is disabled',
  disabled: true,
};

export const Inactive = Template.bind({});
Inactive.args = {
  title: 'Inactive Item',
  subtitle: 'No ripple effect',
  inactive: true,
};

export const WithAction = () => ({
  components: { ListItem },
  template: `
    <ListItem title="Notifications" subtitle="Receive push notifications">
      <template #action>
        <v-switch color="primary" hide-details />
      </template>
    </ListItem>
  `,
});

export const WithIconAction = () => ({
  components: { ListItem },
  template: `
    <ListItem title="Edit Profile" subtitle="Update your personal information">
      <template #action>
        <v-btn icon flat>
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </template>
    </ListItem>
  `,
});

export const WithLeftAction = () => ({
  components: { ListItem },
  template: `
    <ListItem title="Complete task" subtitle="Mark this task as done">
      <template #action-left>
        <v-checkbox color="primary" hide-details />
      </template>
    </ListItem>
  `,
});

export const MultipleItems = () => ({
  components: { ListItem },
  template: `
    <div>
      <ListItem
        title="Profile"
        subtitle="View and edit your profile"
        avatar
        avatarIcon="mdi-account"
        avatarColor="primary"
      />
      <v-divider />
      <ListItem
        title="Settings"
        subtitle="Configure app settings"
        avatar
        avatarIcon="mdi-cog"
        avatarColor="grey"
      />
      <v-divider />
      <ListItem
        title="Notifications"
        subtitle="Manage notifications"
        avatar
        avatarIcon="mdi-bell"
        avatarColor="warning"
      />
      <v-divider />
      <ListItem
        title="Help"
        subtitle="Get help and support"
        avatar
        avatarIcon="mdi-help-circle"
        avatarColor="info"
      />
    </div>
  `,
});

export const NavigationItems = () => ({
  components: { ListItem },
  template: `
    <div>
      <ListItem title="Home" avatar avatarIcon="mdi-home" to="/" />
      <ListItem title="Dashboard" avatar avatarIcon="mdi-view-dashboard" to="/dashboard" />
      <ListItem title="Goals" avatar avatarIcon="mdi-target" to="/goals" />
      <ListItem title="Profile" avatar avatarIcon="mdi-account" to="/profile" />
    </div>
  `,
});
