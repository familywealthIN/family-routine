import DataTable from './DataTable.vue';

export default {
  title: 'Atoms/DataTable',
  component: DataTable,
  argTypes: {
    hideActions: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
};

const defaultHeaders = [
  { text: 'Name', value: 'name' },
  { text: 'Time', value: 'time', align: 'right' },
  { text: 'Points', value: 'points', align: 'right' },
];

const defaultItems = [
  { name: 'Morning Routine', time: '06:00', points: 10 },
  { name: 'Exercise', time: '07:00', points: 15 },
  { name: 'Work Session', time: '09:00', points: 20 },
  { name: 'Lunch Break', time: '12:00', points: 5 },
  { name: 'Evening Wind Down', time: '20:00', points: 10 },
];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { DataTable },
  template: `
    <v-card style="max-width: 600px;">
      <DataTable v-bind="$props" />
    </v-card>
  `,
});

export const Default = Template.bind({});
Default.args = {
  headers: defaultHeaders,
  items: defaultItems,
};

export const HideActions = Template.bind({});
HideActions.args = {
  headers: defaultHeaders,
  items: defaultItems,
  hideActions: true,
};

export const Loading = Template.bind({});
Loading.args = {
  headers: defaultHeaders,
  items: [],
  loading: true,
};

export const WithSlots = () => ({
  components: { DataTable },
  data() {
    return {
      headers: [
        { text: 'Name', value: 'name' },
        { text: 'Time', value: 'time', align: 'right' },
        {
          text: 'Actions', value: 'actions', align: 'right', sortable: false,
        },
      ],
      items: defaultItems,
    };
  },
  template: `
    <v-card style="max-width: 600px;">
      <DataTable :headers="headers" :items="items" hide-actions>
        <template v-slot:items="props">
          <td>{{ props.item.name }}</td>
          <td class="text-xs-right">{{ props.item.time }}</td>
          <td class="text-xs-right">
            <v-btn flat icon small><v-icon>edit</v-icon></v-btn>
            <v-btn flat icon small><v-icon>delete</v-icon></v-btn>
          </td>
        </template>
      </DataTable>
    </v-card>
  `,
});
