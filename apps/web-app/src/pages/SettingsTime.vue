<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="$apollo.queries.routineItems.loading">
    <atom-card dark flat class="image-card">
      <atom-button absolute bottom color="info" right fab @click="() => {
        trackUserInteraction('add_routine_item_dialog_open', 'button_click', {
          current_items_count: routineItems.length,
        });
        dialog = true;
      }">
        <atom-icon>add</atom-icon>
      </atom-button>
      <atom-container class="py-4">
        <div class="d-flex justify-center">
          <circadian-cycle
            :routine-items="routineItems"
            :size="320"
          />
        </div>
      </atom-container>
    </atom-card>
    <atom-card-text class="image-card-page px-0">

      <atom-data-table :headers="headers" :items="routineItems" class="elevation-0 mt-2" hide-actions>
        <template v-slot:items="props">
          <td>{{ props.item.name }}</td>
          <td class="text-xs-right">{{ props.item.time }}</td>
          <td class="text-xs-right">{{ props.item.points }}</td>
          <td class="text-xs-right" style="width:105px; padding: 0">
            <atom-button flat icon class="mr-0" @click="editItem(props.item)">
              <atom-icon>edit</atom-icon>
            </atom-button>
            <atom-button flat icon class="ml-0" @click="deleteItem(props.item)">
              <atom-icon>delete</atom-icon>
            </atom-button>
          </td>
        </template>
      </atom-data-table>
    </atom-card-text>
    <atom-dialog
      v-model="dialog"
      :fullscreen="isMobile"
      :width="isMobile ? undefined : 600"
      :max-width="isMobile ? undefined : 600"
      :hide-overlay="isMobile"
      :scrollable="!isMobile"
      :transition="isMobile ? 'dialog-bottom-transition' : 'dialog-transition'"
      :content-class="isMobile ? 'routine-item-dialog routine-item-dialog--mobile' : 'routine-item-dialog'"
    >
      <atom-card :class="isMobile ? 'routine-item-drawer' : ''">
        <!-- Mobile drawer header: sticky top with close + title + save -->
        <div v-if="isMobile" class="routine-item-drawer__header">
          <atom-button icon flat @click="close(true)" aria-label="Close">
            <atom-icon>close</atom-icon>
          </atom-button>
          <span class="routine-item-drawer__title">{{ formTitle }}</span>
          <atom-button
            flat
            color="primary"
            class="routine-item-drawer__save"
            :loading="buttonLoading"
            :disabled="!valid"
            @click="save"
          >
            Save
          </atom-button>
        </div>

        <!-- Desktop header -->
        <atom-card-title v-else>
          <span class="headline">{{ formTitle }}</span>
        </atom-card-title>

        <atom-form ref="form" v-model="valid" :class="isMobile ? 'routine-item-drawer__form' : ''">
          <atom-card-text :class="isMobile ? 'routine-item-drawer__body' : ''">
              <atom-layout wrap> <atom-flex xs12 sm12 md12>
                  <atom-text-field v-model="editedItem.name" :rules="nameRules" label="Routine Name"
                    required></atom-text-field>
                </atom-flex>                  <atom-flex xs12 sm12 md12>
                  <atom-textarea :rules="descriptionRules" label="Description"
                    v-model="editedItem.description"></atom-textarea>
                </atom-flex>
                <atom-flex xs12 sm12 md12>
                  <goal-tags-input
                    :goalTags="editedItem.tags"
                    :userTags="userTags"
                    @update-new-tag-items="updateNewTagItems"
                  />
                </atom-flex>
                <div class="steps-section">
                  <atom-list subheader>
                    <atom-subheader>Steps</atom-subheader>
                    <div class="formStep pl-3">
                      <atom-text-field clearable v-model="stepBody" id="newStepBody" name="newStepBody"
                        label="Type your step" class="inputGoal" @keyup.enter="addStep">
                      </atom-text-field>
                      <atom-button
                        color="success"
                        :icon="!isMobile"
                        :fab="!isMobile"
                        :block="isMobile"
                        class="step-add-btn"
                        :loading="buttonLoading"
                        @click="addStep(editedItem.steps)"
                      >
                        <atom-icon :dark="!isMobile" class="step-add-btn-icon">send</atom-icon>
                        <span v-if="isMobile" class="step-add-btn-label">Add Step</span>
                      </atom-button>
                    </div>
                  </atom-list>
                  <draggable v-model="editedItem.steps">
                    <transition-group>
                      <atom-list-tile v-for="step in editedItem.steps" :key="step.id" class="step-row">
                        <atom-list-tile-action class="mr-3">
                          <atom-icon color="grey lighten-1" class="drag-handle">drag_indicator</atom-icon>
                        </atom-list-tile-action>
                        <atom-list-tile-content>
                          <atom-list-tile-title>{{ step.name }}</atom-list-tile-title>
                        </atom-list-tile-content>
                        <atom-list-tile-action @click="removeStep(editedItem.steps, step.id)">
                          <atom-icon color="grey">close</atom-icon>
                        </atom-list-tile-action>
                      </atom-list-tile>
                    </transition-group>
                  </draggable>
                </div>
                <atom-flex xs12 sm12 md12>
                  <atom-text-field type="time" :rules="timeRules" v-model="editedItem.time" step="600" label="Time"
                    required></atom-text-field>
                </atom-flex>
                <atom-flex xs12 sm12 md12>                    <atom-text-field type="number" v-model="editedItem.points" :rules="pointsRules" label="Points"
                    required></atom-text-field>
                  Point Remaining: {{ maxInputPoints() }}
                </atom-flex>
                <atom-flex xs12 sm12 md12>
                  <atom-textarea
                    v-model="editedItem.startEvent"
                    label="Start Event"
                    class="monospace-font"
                    rows="3"
                    auto-grow
                  ></atom-textarea>
                </atom-flex>
                <atom-flex xs12 sm12 md12>
                  <atom-textarea
                    v-model="editedItem.endEvent"
                    label="End Event"
                    class="monospace-font"
                    rows="3"
                    auto-grow
                  ></atom-textarea>
                </atom-flex>
              </atom-layout>
          </atom-card-text>

          <atom-card-actions v-if="!isMobile">
            <atom-spacer></atom-spacer>
            <atom-button color="blue darken-1" flat @click="close(true)">Cancel</atom-button>
            <atom-button color="primary" :loading="buttonLoading" @click="save">
              Save
            </atom-button>
          </atom-card-actions>
        </atom-form>
      </atom-card>
    </atom-dialog>
  </container-box>
</template>

<script>
/* eslint-disable max-len */
import gql from 'graphql-tag';
import { MeasurementMixin } from '@/utils/measurementMixins';

import ContainerBox from '@family-routine/ui/templates/ContainerBox/ContainerBox.vue';
import draggable from 'vuedraggable';
import CircadianCycle from '@family-routine/ui/organisms/CircadianCycle/CircadianCycle.vue';
import GoalTagsInput from '@family-routine/ui/molecules/GoalTagsInput/GoalTagsInput.vue';
import getJSON from '../utils/getJSON';
import {
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomCardTitle,
  AtomContainer,
  AtomDataTable,
  AtomDialog,
  AtomFlex,
  AtomForm,
  AtomIcon,
  AtomLayout,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileTitle,
  AtomSpacer,
  AtomSubheader,
  AtomTextarea,
  AtomTextField,
} from '@family-routine/ui/atoms';

export default {
  mixins: [MeasurementMixin],
  components: {
    ContainerBox,
    draggable,
    CircadianCycle,
    GoalTagsInput,
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomCardTitle,
    AtomContainer,
    AtomDataTable,
    AtomDialog,
    AtomFlex,
    AtomForm,
    AtomIcon,
    AtomLayout,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileTitle,
    AtomSpacer,
    AtomSubheader,
    AtomTextarea,
    AtomTextField,
  },
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
    isMobile() {
      return this.$vuetify && this.$vuetify.breakpoint && this.$vuetify.breakpoint.xs;
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

<style scoped>
.inputGoal {
  display: inline-block;
  flex-shrink: 0;
  flex-grow: 1;
}

.steps-section {
  width: 100%;
}

.formStep {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding-right: 12px;
}

.step-add-btn {
  margin-left: 0;
  margin-right: 0;
  flex-shrink: 0;
}

.step-add-btn-label {
  margin-left: 8px;
}

.step-row >>> .v-list__tile__title {
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.3;
}

.drag-handle {
  cursor: move;
}

>>> .v-list__tile--active {
  background: #f5f5f5;
}

.monospace-font >>> textarea {
  font-family: 'Courier New', Courier, monospace !important;
  font-size: 16px;
}

@media (max-width: 600px) {
  .routine-item-drawer__header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    padding-top: calc(6px + env(safe-area-inset-top));
    min-height: 56px;
    background: #fff;
    border-bottom: 1px solid #e2e7ef;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .routine-item-drawer__title {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 17px;
    font-weight: 600;
    color: #151a23;
    text-align: left;
    padding: 0 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .routine-item-drawer__save {
    margin: 0 !important;
    flex-shrink: 0;
  }

  .routine-item-drawer__form {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }

  .routine-item-drawer__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: calc(24px + env(safe-area-inset-bottom));
  }

  .formStep {
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    padding-right: 0;
    padding-left: 0 !important;
  }

  .formStep .inputGoal {
    width: 100%;
  }

  .step-add-btn {
    width: 100%;
    min-height: 40px;
    border-radius: 10px !important;
  }

  .step-add-btn-icon {
    margin-right: 0;
  }

  .step-row >>> .v-list__tile {
    min-height: 44px;
    padding-left: 8px;
    padding-right: 8px;
  }
}
</style>

<style>
/* v-dialog teleports content to document.body, so these rules must be
   unscoped — the dialog wrapper never receives the component's data-v attr. */
.routine-item-dialog {
  overflow: hidden;
}

.routine-item-dialog .v-card {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 96px);
  overflow: hidden;
}

.routine-item-dialog .v-form {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.routine-item-dialog .v-card__text {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 600px) {
  .routine-item-dialog--mobile {
    align-self: stretch;
    margin: 0 !important;
    max-width: 100% !important;
    width: 100vw;
    height: 100vh;
  }

  .routine-item-dialog--mobile .v-card.routine-item-drawer {
    border-radius: 0;
    max-height: 100vh;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
}
</style>
