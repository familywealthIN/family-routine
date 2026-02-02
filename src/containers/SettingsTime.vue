<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="$apollo.queries.routineItems.loading">
    <v-card dark flat class="image-card">
      <v-btn absolute bottom color="info" right fab @click="() => {
        trackUserInteraction('add_routine_item_dialog_open', 'button_click', {
          current_items_count: routineItems.length,
        });
        dialog = true;
      }">
        <v-icon>add</v-icon>
      </v-btn>
      <v-container class="py-4">
        <div class="d-flex justify-center">
          <circadian-cycle
            :routine-items="routineItems"
            :size="320"
          />
        </div>
      </v-container>
    </v-card>
    <v-card-text class="image-card-page px-0">

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
    <v-dialog width="600" v-model="dialog" persistent>
      <v-card>
        <v-card-title>
          <span class="headline">{{ formTitle }}</span>
        </v-card-title>
        <v-form ref="form" v-model="valid">
          <v-card-text>
              <v-layout wrap> <v-flex xs12 sm12 md12>
                  <v-text-field v-model="editedItem.name" :rules="nameRules" label="Routine Name"
                    required></v-text-field>
                </v-flex>                  <v-flex xs12 sm12 md12>
                  <v-textarea :rules="descriptionRules" label="Description"
                    v-model="editedItem.description"></v-textarea>
                </v-flex>
                <v-flex xs12 sm12 md12>
                  <goal-tags-input
                    :goalTags="editedItem.tags"
                    :userTags="userTags"
                    @update-new-tag-items="updateNewTagItems"
                  />
                </v-flex>
                <div>
                  <v-list subheader>
                    <v-subheader>Steps</v-subheader>
                    <div class="formStep pl-3">
                      <v-text-field clearable v-model="stepBody" id="newStepBody" name="newStepBody"
                        label="Type your step" class="inputGoal" @keyup.enter="addStep">
                      </v-text-field>
                      <v-btn icon color="success" fab class="ml-3 mr-0" :loading="buttonLoading"
                        @click="addStep(editedItem.steps)">
                        <v-icon dark>send</v-icon>
                      </v-btn>
                    </div>
                  </v-list>
                  <draggable v-model="editedItem.steps">
                    <transition-group>
                      <v-list-tile v-for="step in editedItem.steps" :key="step.id">
                        <v-list-tile-action class="mr-3">
                          <v-icon color="grey lighten-1" class="drag-handle">drag_indicator</v-icon>
                        </v-list-tile-action>
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
                  <v-text-field type="time" :rules="timeRules" v-model="editedItem.time" step="600" label="Time"
                    required></v-text-field>
                </v-flex>
                <v-flex xs12 sm12 md12>                    <v-text-field type="number" v-model="editedItem.points" :rules="pointsRules" label="Points"
                    required></v-text-field>
                  Point Remaining: {{ maxInputPoints() }}
                </v-flex>
                <v-flex xs12 sm12 md12>
                  <v-textarea
                    v-model="editedItem.startEvent"
                    label="Start Event"
                    class="monospace-font"
                    rows="3"
                    auto-grow
                  ></v-textarea>
                </v-flex>
                <v-flex xs12 sm12 md12>
                  <v-textarea
                    v-model="editedItem.endEvent"
                    label="End Event"
                    class="monospace-font"
                    rows="3"
                    auto-grow
                  ></v-textarea>
                </v-flex>
              </v-layout>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" flat @click="close(true)">Cancel</v-btn>
            <v-btn color="primary" :loading="buttonLoading" @click="save">
              Save
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </container-box>
</template>

<script>
/* eslint-disable max-len */
import gql from 'graphql-tag';
import { MeasurementMixin } from '@/utils/measurementMixins';

import ContainerBox from '../components/templates/ContainerBox/ContainerBox.vue';
import draggable from 'vuedraggable';
import CircadianCycle from '../components/organisms/CircadianCycle/CircadianCycle.vue';
import GoalTagsInput from '../components/molecules/GoalTagsInput/GoalTagsInput.vue';
import getJSON from '../utils/getJSON';

export default {
  mixins: [MeasurementMixin],
  components: { ContainerBox, draggable, CircadianCycle, GoalTagsInput },
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
            tags
            time
            points
            ticked
            passed
            startEvent
            endEvent
            tags
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
      editedItem: {
        id: '',
        name: '',
        steps: [],
        description: '',
        time: '00:00',
        points: 0,
        startEvent: '',
        endEvent: '',
        tags: [],
      },
      defaultItem: {
        id: '',
        name: '',
        steps: [],
        description: '',
        time: '00:00',
        points: 0,
        startEvent: '',
        endEvent: '',
        tags: [],
      },
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
      goalRules: [(v) => !!v || 'At least one goal is required'],
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
      userTags: getJSON(localStorage.getItem('userTags'), []),
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

      // Track routine item edit
      this.trackUserInteraction('routine_item_edit_opened', 'button_click', {
        item_id: item.id,
        item_name: item.name,
        has_steps: item.steps && item.steps.length > 0,
        steps_count: item.steps ? item.steps.length : 0,
      });
    },

    deleteItem(item) {
      const index = this.routineItems.indexOf(item);
      if (confirm('Are you sure you want to delete this item?')) {
        // Track routine item deletion
        this.trackUserInteraction('routine_item_delete_confirmed', 'button_click', {
          item_id: item.id,
          item_name: item.name,
          has_steps: item.steps && item.steps.length > 0,
          steps_count: item.steps ? item.steps.length : 0,
        });
        this.deleteRoutineItem(item, index);
      } else {
        // Track deletion cancellation
        this.trackUserInteraction('routine_item_delete_cancelled', 'dialog_cancel', {
          item_id: item.id,
        });
      }
    },

    updateNewTagItems(tags) {
      this.editedItem.tags = tags;
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

      // Track routine item creation
      this.trackBusinessEvent('routine_item_created', {
        item_name: item.name,
        has_description: !!item.description,
        time: item.time,
        points: Number(item.points),
        steps_count: item.steps ? item.steps.length : 0,
        has_start_event: !!item.startEvent,
        has_end_event: !!item.endEvent,
        tags_count: item.tags ? item.tags.length : 0,
      });

      this.$apollo.mutate({
        mutation: gql`
          mutation addRoutineItem(
            $name: String!
            $description: String!
            $time: String!
            $points: Int!
            $steps: [StepInputItem]!
            $startEvent: String
            $endEvent: String
            $tags: [String]!
          ) {
            addRoutineItem(
              name: $name
              description: $description
              time: $time
              points: $points
              steps: $steps
              startEvent: $startEvent
              endEvent: $endEvent
              tags: $tags
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
              startEvent
              endEvent
              tags
            }
          }
        `,
        variables: {
          name: item.name,
          description: item.description,
          time: item.time,
          points: Number(item.points),
          steps: item.steps.map((step) => ({ id: step.id, name: step.name })),
          startEvent: item.startEvent,
          endEvent: item.endEvent,
          tags: item.tags || [],
        },
        update: () => {
          // Track successful routine item creation
          this.trackBusinessEvent('routine_item_creation_success', {
            item_name: item.name,
            total_items: this.routineItems.length + 1,
          });

          // Refetch the routineItems query to ensure data consistency
          this.$apollo.queries.routineItems.refetch();
          this.buttonLoading = false;
          this.close(false);
          this.resetEditItem();
        },
      }).catch((error) => {
          // Track routine item creation error
          this.trackError('routine_item_creation_error', error, {
            item_name: item.name,
            steps_count: item.steps ? item.steps.length : 0,
          });

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
        mutation: gql`          mutation updateRoutineItem(
            $id: ID!
            $name: String!
            $description: String!
            $time: String!
            $points: Int!
            $steps: [StepInputItem]!
            $startEvent: String
            $endEvent: String
            $tags: [String]!
          ) {
            updateRoutineItem(
              id: $id
              name: $name
              steps: $steps
              description: $description
              time: $time
              points: $points
              startEvent: $startEvent
              endEvent: $endEvent
              tags: $tags
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
              tags
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
          startEvent: item.startEvent,
          endEvent: item.endEvent,
          tags: item.tags || [],
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
  mounted() {
    // Track settings page view
    this.trackPageView('routine_settings');

    // Track settings page access
    this.trackUserInteraction('settings_page_accessed', 'navigation', {
      routine_items_count: this.routineItems ? this.routineItems.length : 0,
    });
  },
};
</script>

<style>
.elevation-1 {
  width: 100%;
}

.inputGoal {
  display: inline-block;
  flex-shrink: 0;
  flex-grow: 1;
}

.drag-handle {
  cursor: move;
}

.v-list__tile--active {
  background: #f5f5f5;
}

.monospace-font >>> textarea {
  font-family: 'Courier New', Courier, monospace !important;
  font-size: 14px;
}
</style>
