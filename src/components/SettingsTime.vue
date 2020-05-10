<template>
  <v-container style="max-width: 480px">
    <v-layout wrap>
      <v-dialog v-model="dialog" max-width="500px">
        <template v-slot:activator="{ on }">
          <v-btn color="primary" dark class="mb-2" v-on="on">New Item</v-btn>
        </template>
        <v-card>
          <v-card-title>
            <span class="headline">{{ formTitle }}</span>
          </v-card-title>
          <v-form ref="form" v-model="valid">
            <v-card-text>
              <v-container grid-list-md>
                <v-layout wrap>
                  <v-flex xs12 sm12 md12>
                    <v-text-field
                      v-model="editedItem.name"
                      :rules="nameRules"
                      label="Routine Name"
                      required
                    ></v-text-field>
                  </v-flex>
                  <v-flex xs12 sm12 md12>
                    <v-textarea
                      :rules="descriptionRules"
                      label="Description"
                      v-model="editedItem.description"
                    ></v-textarea>
                  </v-flex>
                  <v-flex xs12 sm12 md12>
                    <v-text-field
                      type="time"
                      :rules="timeRules"
                      v-model="editedItem.time"
                      step="600"
                      label="Time"
                      required
                    ></v-text-field>
                  </v-flex>
                  <v-flex xs12 sm12 md12>
                    <v-text-field
                      type="number"
                      v-model="editedItem.points"
                      :rules="pointsRules"
                      label="Points"
                      required
                    ></v-text-field>
                    Point Remaining: {{maxInputPoints()}}
                  </v-flex>
                </v-layout>
              </v-container>
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue darken-1" flat @click="close(true)">Cancel</v-btn>
              <v-btn color="primary" dark @click="save">Save</v-btn>
            </v-card-actions>
          </v-form>
        </v-card>
      </v-dialog>
      <v-data-table :headers="headers" :items="routineItems" class="elevation-1" hide-actions>
        <template v-slot:items="props">
          <td>{{ props.item.name }}</td>
          <td class="text-xs-right">{{ props.item.time }}</td>
          <td class="text-xs-right">{{ props.item.points }}</td>
          <td class="text-xs-right" style="width:105px; padding: 0">
            <v-btn flat icon color="pink" class="mr-0" @click="editItem(props.item)">
              <v-icon>edit</v-icon>
            </v-btn>
            <v-btn flat icon color="pink" class="ml-0" @click="deleteItem(props.item)">
              <v-icon>delete</v-icon>
            </v-btn>
          </td>
        </template>
      </v-data-table>
      <p>Note: New Entires will be updated tomorrow.</p>
    </v-layout>
  </v-container>
</template>

<script>
import gql from 'graphql-tag';

import redirectOnError from '../utils/redirectOnError';

export default {
  apollo: {
    routineItems: {
      query: gql`
        query routineItems {
          routineItems {
            id
            name
            description
            time
            points
            ticked
            passed
          }
        }
      `,
      error(error) {
        redirectOnError(this.$router, error);
      },
    },
  },
  data() {
    return {
      dialog: false,
      valid: true,
      editedIndex: -1,
      routineItems: [],
      nameRules: [
        (v) => !!v || 'Name is required',
        (v) => (v && v.length <= 100) || 'Name must be less than 100 characters',
      ],
      descriptionRules: [
        (v) => !!v || 'Description is required',
        (v) => (v && v.length <= 255)
          || 'Description must be less than 255 characters',
      ],
      pointsRules: [
        (v) => !!v || 'points is required',
        (v) => (v && Number(v) <= this.maxInputPoints())
          || `Name must be less than ${this.maxInputPoints()} characters`,
      ],
      timeRules: [(v) => !!v || 'Time is required'],
      headers: [
        {
          text: 'Task',
          align: 'left',
          sortable: false,
          value: 'name',
        },
        {
          text: 'Time',
          align: 'right',
          value: 'time',
          sortable: true,
        },
        {
          text: 'Points',
          align: 'right',
          value: 'points',
          sortable: false,
        },
        {
          text: 'Action',
          align: 'right',
          sortable: false,
        },
      ],
      editedItem: {
        id: '',
        name: '',
        description: '',
        time: '00:00',
        points: 0,
      },
      defaultItem: {
        id: '',
        name: '',
        description: '',
        time: '00:00',
        points: 0,
      },
    };
  },
  computed: {
    formTitle() {
      return this.editedIndex === -1 ? 'New Item' : 'Edit Item';
    },
  },

  watch: {
    dialog(val) {
      if (!val) {
        this.close(false);
      }
    },
  },
  methods: {
    editItem(item) {
      this.editedIndex = this.routineItems.indexOf(item);
      this.editedItem = { ...item };
      this.dialog = true;
    },

    deleteItem(item) {
      const index = this.routineItems.indexOf(item);
      if (confirm('Are you sure you want to delete this item?')) {
        this.deleteRoutineItem(item, index);
      }
    },

    deleteRoutineItem(item, index) {
      this.$apollo.mutate({
        mutation: gql`
          mutation deleteRoutineItem($id: ID!) {
            deleteRoutineItem(id: $id) {
              id
            }
          }
        `,
        variables: {
          id: item.id,
        },
        update: () => {
          this.routineItems.splice(index, 1);
        },
        error: (error) => {
          redirectOnError(this.$router, error);
        },
      });
    },

    close(auto = true) {
      this.dialog = false;
      if (auto) {
        setTimeout(() => this.resetEditItem(), 100);
      }
    },

    save() {
      this.$refs.form.validate();
      if (this.valid) {
        if (this.editedIndex > -1) {
          this.updateRoutineItem();
        } else {
          this.addRoutineItem();
        }
        this.close(false);
      }
    },

    resetEditItem() {
      this.$refs.form.reset();
      this.editedItem = { ...this.defaultItem };
      this.editedIndex = -1;
    },

    addRoutineItem() {
      const item = this.editedItem;
      this.$apollo.mutate({
        mutation: gql`
          mutation addRoutineItem(
            $name: String!
            $description: String!
            $time: String!
            $points: Int!
          ) {
            addRoutineItem(
              name: $name
              description: $description
              time: $time
              points: $points
            ) {
              id
              name
              description
              time
              points
            }
          }
        `,
        variables: {
          name: item.name,
          description: item.description,
          time: item.time,
          points: Number(item.points),
        },
        update: (scope, { data: { addRoutineItem } }) => {
          this.routineItems.push(addRoutineItem);
          this.resetEditItem();
        },
        error: (error) => {
          this.resetEditItem();
          redirectOnError(this.$router, error);
        },
      });
    },

    getPointsTotal() {
      return Array.isArray(this.routineItems)
        ? this.routineItems.reduce((total, { points }) => total + points, 0)
        : 0;
    },

    maxInputPoints() {
      const { editedIndex, routineItems } = this;
      const editPoints = routineItems
        && routineItems[editedIndex]
        && Number(routineItems[editedIndex].points) > 0
        ? Number(routineItems[editedIndex].points)
        : 0;
      return 100 - (this.getPointsTotal() - editPoints);
    },

    updateRoutineItem() {
      const item = this.editedItem;
      this.$apollo.mutate({
        mutation: gql`
          mutation updateRoutineItem(
            $id: ID!
            $name: String!
            $description: String!
            $time: String!
            $points: Int!
          ) {
            updateRoutineItem(
              id: $id
              name: $name
              description: $description
              time: $time
              points: $points
            ) {
              id
              name
              description
              time
              points
            }
          }
        `,
        variables: {
          id: item.id,
          name: item.name,
          description: item.description,
          time: item.time,
          points: Number(item.points),
        },
        update: () => {
          Object.assign(this.routineItems[this.editedIndex], this.editedItem);
          this.resetEditItem();
        },
        error: (error) => {
          this.resetEditItem();
          redirectOnError(this.$router, error);
        },
      });
    },
  },
};
</script>

<style>
.elevation-1 {
  width: 100%;
}
</style>
