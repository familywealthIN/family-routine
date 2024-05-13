<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="$apollo.queries.routineItems.loading">
    <v-card
      dark
      flat
      class="image-card"
    >
      <v-btn
        absolute
        bottom
        color="info"
        right
        fab
        @click="dialog = true"
      >
        <v-icon>add</v-icon>
      </v-btn>
      <v-img
        src="https://cdn.vuetifyjs.com/images/cards/forest.jpg"
        gradient="to top, rgba(0,0,0,.44), rgba(0,0,0,.44)"
      >
        <v-container fill-height>
          <v-layout align-center>
            <strong class="display-4 font-weight-regular mr-4">{{routineItems && routineItems.length}}</strong>
            <v-layout column justify-end>
              <div class="headline font-weight-light">Routine Items</div>
            </v-layout>
          </v-layout>
        </v-container>
      </v-img>
    </v-card>
    <v-card-text class="image-card-page px-0">
      <v-dialog v-model="dialog" >
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
                  <div>
                    <v-list subheader>
                      <v-subheader>Steps</v-subheader>
                      <div class="formStep pl-3">
                        <v-text-field
                          clearable
                          v-model="stepBody"
                          id="newStepBody"
                          name="newStepBody"
                          label="Type your step"
                          class="inputGoal"
                          @keyup.enter="addStep"
                        >
                        </v-text-field>
                        <v-btn
                          icon
                          color="success"
                          fab
                          class="ml-3 mr-0"
                          :loading="buttonLoading"
                          @click="addStep(editedItem.steps)"
                        >
                          <v-icon dark>send</v-icon>
                        </v-btn>
                      </div>
                    </v-list>
                    <draggable v-model="editedItem.steps">
                      <transition-group>
                        <v-list-tile v-for="step in editedItem.steps" :key="step.id">
                          <v-list-tile-content>
                            <v-list-tile-title>{{ step.name }}</v-list-tile-title>
                          </v-list-tile-content>
                          <v-list-tile-action @click="removeStep(editedItem.steps, step.id)">
                            <v-icon color="grey">close</v-icon>
                          </v-list-tile-action>
                        </v-list-tile>
                      </transition-group>
                  </draggable>
                  </div>
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
              <v-btn
                color="primary"
                :loading="buttonLoading"
                @click="save"
              >
                Save
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card>
      </v-dialog>
      <v-data-table :headers="headers" :items="routineItems" class="elevation-0 mt-2" hide-actions>
        <template v-slot:items="props">
          <td>{{ props.item.name }}</td>
          <td class="text-xs-right">{{ props.item.time }}</td>
          <td class="text-xs-right">{{ props.item.points }}</td>
          <td class="text-xs-right" style="width:105px; padding: 0">
            <v-btn flat icon class="mr-0" @click="editItem(props.item)">
              <v-icon>edit</v-icon>
            </v-btn>
            <v-btn flat icon class="ml-0" @click="deleteItem(props.item)">
              <v-icon>delete</v-icon>
            </v-btn>
          </td>
        </template>
      </v-data-table>
    </v-card-text>
  </container-box>
</template>

<script>
/* eslint-disable max-len */
import gql from 'graphql-tag';

import ContainerBox from '../components/ContainerBox.vue';
import draggable from 'vuedraggable'

export default {
  components: { ContainerBox, draggable },
  apollo: {
    routineItems: {
      query: gql`
        query routineItems {
          routineItems {
            id
            name
            steps {
              id
              name
            }
            description
            time
            points
            ticked
            passed
          }
        }
      `,
    },
  },
  data() {
    return {
      dialog: false,
      valid: true,
      buttonLoading: false,
      editedIndex: -1,
      stepBody: '',
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
        steps: [],
        description: '',
        time: '00:00',
        points: 0,
      },
      defaultItem: {
        id: '',
        name: '',
        steps: [],
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
    addStep(steps) {
      this.stepBody = this.stepBody.trim();
      if (this.stepBody && Array.isArray(steps)) {
        this.editedItem.steps = [
          ...steps,
          {
            id: window.crypto.randomUUID(),
            name: this.stepBody,
          },
        ];
        this.stepBody = '';
      }
    },

    removeStep(steps, id) {
      if (Array.isArray(steps)) {
        this.editedItem.steps = steps.filter((step) => step.id !== id);
      }
    },
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
      }).catch(() => {
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
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
        this.buttonLoading = true;
        if (this.editedIndex > -1) {
          this.updateRoutineItem();
        } else {
          this.addRoutineItem();
        }
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
            $steps: [StepInputItem]!
          ) {
            addRoutineItem(
              name: $name
              description: $description
              time: $time
              points: $points
              steps: $steps
            ) {
              id
              name
              steps {
                id
                name
              }
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
          steps: item.steps.map((step) => ({ id: step.id, name: step.name })),
        },
        update: (scope, { data: { addRoutineItem } }) => {
          this.routineItems.push(addRoutineItem);
          this.buttonLoading = false;
          this.close(false);
          this.resetEditItem();
        },
      }).catch((error) => {
          this.resetEditItem();
          this.buttonLoading = false;
          this.close(false);
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },

    getPointsTotal() {
      return Array.isArray(this.routineItems)
        ? this.routineItems.reduce((total, { points }) => +total + +points, 0)
        : 0;
    },

    maxInputPoints() {
      const { editedIndex, routineItems } = this;
      const editPoints = routineItems
        && routineItems[editedIndex]
        && Number(routineItems[editedIndex].points) > 0
        ? Number(routineItems[editedIndex].points)
        : 0;
      return +100 - +(this.getPointsTotal() - editPoints);
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
            $steps: [StepInputItem]!
          ) {
            updateRoutineItem(
              id: $id
              name: $name
              steps: $steps
              description: $description
              time: $time
              points: $points
            ) {
              id
              name
              steps {
                id
                name
              }
              description
              time
              points
            }
          }
        `,
        variables: {
          id: item.id,
          name: item.name,
          steps: item.steps.map((step) => ({ id: step.id, name: step.name })),
          description: item.description,
          time: item.time,
          points: Number(item.points),
        },
        update: () => {
          Object.assign(this.routineItems[this.editedIndex], this.editedItem);
          this.resetEditItem();
          this.buttonLoading = false;
          this.close(false);
        },
      }).catch((error) => {
        console.log('error', error);
          this.resetEditItem();
          this.buttonLoading = false;
          this.close(false);
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
  },
};
</script>

<style>
.elevation-1 {
  width: 100%;
}

.inputGoal {
  display:inline-block;
  flex-shrink: 0;
  flex-grow: 1;
}
</style>
