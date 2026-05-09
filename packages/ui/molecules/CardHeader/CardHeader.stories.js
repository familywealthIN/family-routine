import CardHeader from './CardHeader.vue';

export default {
  title: 'Molecules/CardHeader',
  component: CardHeader,
  argTypes: {
    flat: { control: 'boolean' },
    tile: { control: 'boolean' },
    showActions: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { CardHeader },
  template: `
    <CardHeader v-bind="$props">
      <p>Card content goes here. This is the main body of the card.</p>
    </CardHeader>
  `,
});

export const Default = Template.bind({});
Default.args = {
  title: 'Card Title',
};

export const WithActions = () => ({
  components: { CardHeader },
  template: `
    <CardHeader title="Tasks" showActions>
      <template #actions>
        <v-btn icon small>
          <v-icon small>mdi-plus</v-icon>
        </v-btn>
        <v-btn icon small>
          <v-icon small>mdi-dots-vertical</v-icon>
        </v-btn>
      </template>
      <p>Your tasks will appear here.</p>
    </CardHeader>
  `,
});

export const WithFooter = () => ({
  components: { CardHeader },
  template: `
    <CardHeader title="Confirm Action">
      <p>Are you sure you want to proceed with this action?</p>
      <template #footer>
        <v-spacer />
        <v-btn flat>Cancel</v-btn>
        <v-btn color="primary">Confirm</v-btn>
      </template>
    </CardHeader>
  `,
});

export const Flat = Template.bind({});
Flat.args = {
  title: 'Flat Card',
  flat: true,
};

export const Tile = Template.bind({});
Tile.args = {
  title: 'Tile Card (No Border Radius)',
  tile: true,
};

export const CustomTitleSlot = () => ({
  components: { CardHeader },
  template: `
    <CardHeader>
      <template #title>
        <v-icon left>mdi-star</v-icon>
        <span class="headline">Featured Item</span>
        <v-chip small color="primary" class="ml-2">New</v-chip>
      </template>
      <p>This card has a custom title with icon and chip.</p>
    </CardHeader>
  `,
});

export const DashboardCard = () => ({
  components: { CardHeader },
  template: `
    <CardHeader title="Today's Progress" showActions>
      <template #actions>
        <v-btn icon small>
          <v-icon small>mdi-refresh</v-icon>
        </v-btn>
      </template>
      <div style="text-align: center; padding: 24px;">
        <div style="font-size: 48px; font-weight: bold; color: #1976d2;">75%</div>
        <div style="color: #666;">Tasks Completed</div>
      </div>
    </CardHeader>
  `,
});

export const SettingsCard = () => ({
  components: { CardHeader },
  template: `
    <CardHeader title="Notification Settings">
      <v-list>
        <v-list-tile>
          <v-list-tile-content>
            <v-list-tile-title>Push Notifications</v-list-tile-title>
          </v-list-tile-content>
          <v-list-tile-action>
            <v-switch color="primary" />
          </v-list-tile-action>
        </v-list-tile>
        <v-list-tile>
          <v-list-tile-content>
            <v-list-tile-title>Email Notifications</v-list-tile-title>
          </v-list-tile-content>
          <v-list-tile-action>
            <v-switch color="primary" />
          </v-list-tile-action>
        </v-list-tile>
      </v-list>
    </CardHeader>
  `,
});

export const Multiple = () => ({
  components: { CardHeader },
  template: `
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <CardHeader title="Card 1">
        <p>First card content</p>
      </CardHeader>
      <CardHeader title="Card 2" showActions>
        <template #actions>
          <v-btn icon small><v-icon small>mdi-pencil</v-icon></v-btn>
        </template>
        <p>Second card content with action</p>
      </CardHeader>
      <CardHeader title="Card 3">
        <p>Third card content</p>
        <template #footer>
          <v-btn flat small>Learn More</v-btn>
        </template>
      </CardHeader>
    </div>
  `,
});
