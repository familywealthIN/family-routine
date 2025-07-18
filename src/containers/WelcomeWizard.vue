<template>
  <v-stepper v-model="currentStep">
    <v-stepper-header>
      <v-stepper-step :complete="currentStep > 1" step="1">Sleep Schedule</v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step :complete="currentStep > 2" step="2">Morning Routine</v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step :complete="currentStep > 3" step="3">Work Hours</v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step :complete="currentStep > 4" step="4">Evening Activities</v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step step="5">Complete Setup</v-stepper-step>
    </v-stepper-header>

    <v-stepper-items>
      <!-- Step 1: Sleep Schedule -->
      <v-stepper-content step="1">
        <div style="max-width: 500px; margin: 0 auto;">
          <h2 class="text-xs-center mt-4 mb-3">Set Your Sleep Schedule</h2>
          <div class="mb-3" style="max-width: 192px; margin: 0 auto;">
            <v-img :src="`/img/night.png`" alt="Sleep Schedule">
              <template v-slot:placeholder>
                <v-layout fill-height align-center justify-center ma-0>
                  <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                </v-layout>
              </template>
            </v-img>
          </div>

          <p class="text-center mb-4">Let's start by setting your ideal sleep and wake times to build a healthy routine around them.</p>

          <v-row>
            <v-col cols="6">
              <v-menu
                ref="wakeMenu"
                v-model="wakeMenu"
                :close-on-content-click="false"
                :nudge-right="40"
                :return-value.sync="schedule.wakeTime"
                transition="scale-transition"
                offset-y
                max-width="290px"
                min-width="290px"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="schedule.wakeTime"
                    label="Wake Time"
                    prepend-icon="wb_sunny"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-time-picker
                  v-if="wakeMenu"
                  v-model="schedule.wakeTime"
                  full-width
                  @click:minute="$refs.wakeMenu.save(schedule.wakeTime)"
                ></v-time-picker>
              </v-menu>
            </v-col>

            <v-col cols="6">
              <v-menu
                ref="sleepMenu"
                v-model="sleepMenu"
                :close-on-content-click="false"
                :nudge-right="40"
                :return-value.sync="schedule.sleepTime"
                transition="scale-transition"
                offset-y
                max-width="290px"
                min-width="290px"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="schedule.sleepTime"
                    label="Sleep Time"
                    prepend-icon="hotel"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-time-picker
                  v-if="sleepMenu"
                  v-model="schedule.sleepTime"
                  full-width
                  @click:minute="$refs.sleepMenu.save(schedule.sleepTime)"
                ></v-time-picker>
              </v-menu>
            </v-col>
          </v-row>

          <v-alert v-if="schedule.sleepTime && schedule.wakeTime" type="info" class="mt-3">
            You'll get approximately {{ calculateSleepHours() }} hours of sleep.
          </v-alert>
        </div>

        <div class="text-xs-right mb-3">
          <v-btn color="primary" @click="nextStep()">Next</v-btn>
        </div>
      </v-stepper-content>

      <!-- Step 2: Morning Routine -->
      <v-stepper-content step="2">
        <div style="max-width: 600px; margin: 0 auto;">
          <h2 class="text-xs-center mt-4 mb-3">Design Your Morning Routine</h2>
          <div class="mb-3" style="max-width: 192px; margin: 0 auto;">
            <v-img :src="`/img/morning.jpg`" alt="Morning">
              <template v-slot:placeholder>
                <v-layout fill-height align-center justify-center ma-0>
                  <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                </v-layout>
              </template>
            </v-img>
          </div>

          <p class="text-center mb-4">Select activities for your morning routine. We'll automatically estimate time and points for each activity.</p>

          <div class="mb-4">
            <h3 class="mb-2">Available Morning Activities:</h3>
            <v-chip-group
              v-model="selectedMorningActivities"
              multiple
              column
              active-class="primary--text"
            >
              <v-chip
                v-for="activity in morningActivities"
                :key="activity.id"
                :value="activity.id"
                filter
                outlined
                :color="selectedMorningActivities.includes(activity.id) ? 'primary' : ''"
                :text-color="selectedMorningActivities.includes(activity.id) ? 'white' : ''"
                @click="toggleSelection('morning', activity.id)"
              >
                <v-icon left>{{ activity.icon }}</v-icon>
                {{ activity.name }}
              </v-chip>
            </v-chip-group>
          </div>

          <div v-if="selectedMorningActivities.length > 0" class="mb-4">
            <h3 class="mb-2">Your Morning Schedule:</h3>
            <table class="borderless-table">
              <tbody>
                <tr
                  v-for="activity in getSelectedActivities('morning')"
                  :key="activity.id"
                >
                  <td class="text-xs-left pa-2">
                    <v-icon class="mr-2">{{ activity.icon }}</v-icon>
                    {{ activity.name }}
                  </td>
                  <td class="text-xs-right pa-2">
                    {{ activity.duration }} minutes
                  </td>
                  <td class="text-xs-right pa-2">
                    {{ activity.points }} points
                  </td>
                </tr>
              </tbody>
            </table>

            <v-alert type="success" class="mt-3">
              Total: {{ getTotalDuration('morning') }} minutes • {{ getTotalPoints('morning') }} points
            </v-alert>
          </div>
        </div>

        <div class="text-xs-right">
          <v-btn text @click="previousStep()">Back</v-btn>
          <v-btn color="primary" @click="nextStep()">Next</v-btn>
        </div>
      </v-stepper-content>

      <!-- Step 3: Work Hours -->
      <v-stepper-content step="3">
        <div style="max-width: 500px; margin: 0 auto;">
          <h2 class="text-xs-center mt-4 mb-3">Set Your Work Hours</h2>
          <div class="mb-3" style="max-width: 192px; margin: 0 auto;">
            <v-img :src="`/img/enlightenment.png`" alt="Work">
              <template v-slot:placeholder>
                <v-layout fill-height align-center justify-center ma-0>
                  <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                </v-layout>
              </template>
            </v-img>
          </div>

          <p class="text-center mb-4">Define your work schedule to help structure your day effectively.</p>

          <v-row>
            <v-col cols="6">
              <v-menu
                ref="workStartMenu"
                v-model="workStartMenu"
                :close-on-content-click="false"
                :nudge-right="40"
                :return-value.sync="schedule.workStart"
                transition="scale-transition"
                offset-y
                max-width="290px"
                min-width="290px"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="schedule.workStart"
                    label="Work Start Time"
                    prepend-icon="work"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-time-picker
                  v-if="workStartMenu"
                  v-model="schedule.workStart"
                  full-width
                  @click:minute="$refs.workStartMenu.save(schedule.workStart)"
                ></v-time-picker>
              </v-menu>
            </v-col>

            <v-col cols="6">
              <v-menu
                ref="workEndMenu"
                v-model="workEndMenu"
                :close-on-content-click="false"
                :nudge-right="40"
                :return-value.sync="schedule.workEnd"
                transition="scale-transition"
                offset-y
                max-width="290px"
                min-width="290px"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="schedule.workEnd"
                    label="Work End Time"
                    prepend-icon="work_off"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-time-picker
                  v-if="workEndMenu"
                  v-model="schedule.workEnd"
                  full-width
                  @click:minute="$refs.workEndMenu.save(schedule.workEnd)"
                ></v-time-picker>
              </v-menu>
            </v-col>
          </v-row>

          <v-alert v-if="schedule.workStart && schedule.workEnd" type="info" class="mt-3">
            Work duration: {{ calculateWorkHours() }} hours
          </v-alert>
        </div>

        <div class="text-xs-right">
          <v-btn text @click="previousStep()">Back</v-btn>
          <v-btn color="primary" @click="nextStep()">Next</v-btn>
        </div>
      </v-stepper-content>

      <!-- Step 4: Evening Activities -->
      <v-stepper-content step="4">
        <div style="max-width: 600px; margin: 0 auto;">
          <h2 class="text-xs-center mt-4 mb-3">Plan Your Evening Activities</h2>
          <div class="mb-3" style="max-width: 192px; margin: 0 auto;">
            <v-img :src="`/img/relax.jpg`" alt="Evening">
              <template v-slot:placeholder>
                <v-layout fill-height align-center justify-center ma-0>
                  <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                </v-layout>
              </template>
            </v-img>
          </div>

          <p class="text-center mb-4">Choose activities to wind down and prepare for the next day.</p>

          <div class="mb-4">
            <h3 class="mb-2">Available Evening Activities:</h3>
            <v-chip-group
              v-model="selectedEveningActivities"
              multiple
              column
              active-class="primary--text"
            >
              <v-chip
                v-for="activity in eveningActivities"
                :key="activity.id"
                :value="activity.id"
                filter
                outlined
                :color="selectedEveningActivities.includes(activity.id) ? 'primary' : ''"
                :text-color="selectedEveningActivities.includes(activity.id) ? 'white' : ''"
                @click="toggleSelection('evening', activity.id)"
              >
                <v-icon left>{{ activity.icon }}</v-icon>
                {{ activity.name }}
              </v-chip>
            </v-chip-group>
          </div>

          <div v-if="selectedEveningActivities.length > 0" class="mb-4">
            <h3 class="mb-2">Your Evening Schedule:</h3>
            <table class="borderless-table">
              <tbody>
                <tr
                  v-for="activity in getSelectedActivities('evening')"
                  :key="activity.id"
                >
                  <td class="text-xs-left pa-2">
                    <v-icon class="mr-2">{{ activity.icon }}</v-icon>
                    {{ activity.name }}
                  </td>
                  <td class="text-xs-right pa-2">
                    {{ activity.duration }} minutes
                  </td>
                  <td class="text-xs-right pa-2">
                    {{ activity.points }} points
                  </td>
                </tr>
              </tbody>
            </table>

            <v-alert type="success" class="mt-3">
              Total: {{ getTotalDuration('evening') }} minutes • {{ getTotalPoints('evening') }} points
            </v-alert>
          </div>
        </div>

        <div class="text-xs-right">
          <v-btn text @click="previousStep()">Back</v-btn>
          <v-btn color="primary" @click="nextStep()">Next</v-btn>
        </div>
      </v-stepper-content>

      <!-- Step 5: Complete Setup -->
      <v-stepper-content step="5">
        <div style="max-width: 600px; margin: 0 auto;">
          <h2 class="text-xs-center mt-4 mb-3">Your Routine is Ready!</h2>
          <div class="mb-3" style="max-width: 192px; margin: 0 auto;">
            <v-img :src="`/img/enlightenment.png`" alt="Complete">
              <template v-slot:placeholder>
                <v-layout fill-height align-center justify-center ma-0>
                  <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                </v-layout>
              </template>
            </v-img>
          </div>

          <v-card class="mb-4">
            <v-card-title>Your Daily Schedule Summary</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <h4>Sleep Schedule</h4>
                  <p>Sleep: {{ schedule.sleepTime }}</p>
                  <p>Wake: {{ schedule.wakeTime }}</p>
                  <p>Sleep Duration: {{ calculateSleepHours() }} hours</p>
                </v-col>
                <v-col cols="6">
                  <h4>Work Hours</h4>
                  <p>Start: {{ schedule.workStart }}</p>
                  <p>End: {{ schedule.workEnd }}</p>
                  <p>Work Duration: {{ calculateWorkHours() }} hours</p>
                </v-col>
              </v-row>

              <v-divider class="my-3"></v-divider>

              <v-row>
                <v-col cols="6">
                  <h4>Morning Routine ({{ getTotalDuration('morning') }} min)</h4>
                  <ul>
                    <li v-for="activity in getSelectedActivities('morning')" :key="activity.id">
                      {{ activity.name }} ({{ activity.duration }}min)
                    </li>
                  </ul>
                </v-col>
                <v-col cols="6">
                  <h4>Evening Routine ({{ getTotalDuration('evening') }} min)</h4>
                  <ul>
                    <li v-for="activity in getSelectedActivities('evening')" :key="activity.id">
                      {{ activity.name }} ({{ activity.duration }}min)
                    </li>
                  </ul>
                </v-col>
              </v-row>

              <v-alert type="success" class="mt-3">
                Total Daily Points Available: {{ getTotalPoints('morning') + getTotalPoints('evening') }} points
              </v-alert>
            </v-card-text>
          </v-card>

          <p class="text-center">
            We'll create your routine items automatically. You can always modify them later in the settings.
            <br><br>
            <strong>Ready to start your journey to a better routine?</strong>
          </p>
        </div>

        <div class="text-xs-right">
          <v-btn text @click="previousStep()">Back</v-btn>
          <v-btn color="primary" @click="completeOnboarding()" :loading="creating">
            {{ creating ? 'Creating Routine...' : 'Complete Setup' }}
          </v-btn>
        </div>
      </v-stepper-content>
    </v-stepper-items>
  </v-stepper>
</template>

<script>
import gql from 'graphql-tag';

export default {
  data() {
    return {
      currentStep: 1,
      creating: false,

      // Menu states
      sleepMenu: false,
      wakeMenu: false,
      workStartMenu: false,
      workEndMenu: false,

      // Schedule data
      schedule: {
        sleepTime: '23:00',
        wakeTime: '06:00',
        workStart: '09:00',
        workEnd: '17:00',
      },

      // Activity selections
      selectedMorningActivities: [],
      selectedEveningActivities: [],

      // Activity options
      morningActivities: [
        {
          id: 'wake-up', name: 'Wake Up', icon: 'wb_sunny', duration: 5, points: 10,
        },
        {
          id: 'meditation', name: 'Meditation', icon: 'self_improvement', duration: 15, points: 30,
        },
        {
          id: 'exercise', name: 'Exercise', icon: 'fitness_center', duration: 30, points: 50,
        },
        {
          id: 'yoga', name: 'Yoga', icon: 'self_improvement', duration: 20, points: 40,
        },
        {
          id: 'shower', name: 'Shower', icon: 'shower', duration: 15, points: 20,
        },
        {
          id: 'breakfast', name: 'Breakfast', icon: 'restaurant', duration: 20, points: 25,
        },
        {
          id: 'journal', name: 'Journaling', icon: 'book', duration: 10, points: 20,
        },
        {
          id: 'reading', name: 'Reading', icon: 'menu_book', duration: 20, points: 30,
        },
        {
          id: 'planning', name: 'Day Planning', icon: 'today', duration: 10, points: 25,
        },
      ],

      eveningActivities: [
        {
          id: 'dinner', name: 'Dinner', icon: 'restaurant', duration: 30, points: 25,
        },
        {
          id: 'family-time', name: 'Family Time', icon: 'group', duration: 45, points: 40,
        },
        {
          id: 'reading-evening', name: 'Reading', icon: 'menu_book', duration: 30, points: 35,
        },
        {
          id: 'meditation-evening', name: 'Meditation', icon: 'self_improvement', duration: 15, points: 30,
        },
        {
          id: 'skincare', name: 'Skincare Routine', icon: 'face', duration: 15, points: 20,
        },
        {
          id: 'prepare-tomorrow', name: 'Prepare for Tomorrow', icon: 'event', duration: 15, points: 25,
        },
        {
          id: 'gratitude', name: 'Gratitude Practice', icon: 'favorite', duration: 10, points: 20,
        },
        {
          id: 'light-stretch', name: 'Light Stretching', icon: 'self_improvement', duration: 15, points: 25,
        },
        {
          id: 'tea-time', name: 'Herbal Tea', icon: 'local_cafe', duration: 10, points: 15,
        },
      ],
    };
  },
  methods: {
    nextStep() {
      if (this.currentStep < 5) {
        this.currentStep += 1;
      }
    },

    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep -= 1;
      }
    },

    calculateSleepHours() {
      if (!this.schedule.sleepTime || !this.schedule.wakeTime) return '0';

      const sleep = this.timeToMinutes(this.schedule.sleepTime);
      const wake = this.timeToMinutes(this.schedule.wakeTime);

      let sleepDuration;
      if (wake > sleep) {
        // Same day
        sleepDuration = wake - sleep;
      } else {
        // Next day
        sleepDuration = (24 * 60) - sleep + wake;
      }

      const hours = Math.floor(sleepDuration / 60);
      const minutes = sleepDuration % 60;

      if (minutes === 0) {
        return `${hours}`;
      }
      return `${hours}h ${minutes}m`;
    },

    calculateWorkHours() {
      if (!this.schedule.workStart || !this.schedule.workEnd) return '0';

      const start = this.timeToMinutes(this.schedule.workStart);
      const end = this.timeToMinutes(this.schedule.workEnd);

      const duration = end > start ? end - start : 0;
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;

      if (minutes === 0) {
        return `${hours}`;
      }
      return `${hours}h ${minutes}m`;
    },

    timeToMinutes(timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    },

    getSelectedActivities(type) {
      const activities = type === 'morning' ? this.morningActivities : this.eveningActivities;
      const selected = type === 'morning' ? this.selectedMorningActivities : this.selectedEveningActivities;

      return activities.filter((activity) => selected.includes(activity.id));
    },

    getTotalDuration(type) {
      return this.getSelectedActivities(type).reduce((total, activity) => total + activity.duration, 0);
    },

    getTotalPoints(type) {
      return this.getSelectedActivities(type).reduce((total, activity) => total + activity.points, 0);
    },

    toggleSelection(type, activityId) {
      const selectedArray = type === 'morning' ? this.selectedMorningActivities : this.selectedEveningActivities;
      const index = selectedArray.indexOf(activityId);

      if (index > -1) {
        // Remove if already selected
        selectedArray.splice(index, 1);
      } else {
        // Add if not selected
        selectedArray.push(activityId);
      }
    },

    async completeOnboarding() {
      this.creating = true;

      try {
        // Create routine items with AI enhancement
        const createdItems = await this.createRoutineItems();

        // Redirect to home page
        this.$router.push('/home');

        // Show success message
        this.$store.dispatch('showSnackbar', {
          message: `Your routine has been created successfully with ${createdItems.length} activities!`,
          color: 'success',
        });
      } catch (error) {
        console.error('Error creating routine:', error);
        this.$store.dispatch('showSnackbar', {
          message: 'Error creating routine. Please try again.',
          color: 'error',
        });
      } finally {
        this.creating = false;
      }
    },

    async createRoutineItems() {
      const routineItems = [];

      // Create sleep schedule items
      routineItems.push({
        name: 'Sleep Time',
        time: this.schedule.sleepTime,
        type: 'sleep',
        points: 20,
        duration: 0,
        tags: ['onboarding', 'sleep'],
      });

      routineItems.push({
        name: 'Wake Up',
        time: this.schedule.wakeTime,
        type: 'wake',
        points: 30,
        duration: 5,
        tags: ['onboarding', 'morning'],
      });

      // Create morning routine items
      const morningActivities = this.getSelectedActivities('morning');
      let currentTime = this.timeToMinutes(this.schedule.wakeTime);

      morningActivities.forEach((activity) => {
        const timeStr = this.minutesToTime(currentTime);
        routineItems.push({
          name: activity.name,
          time: timeStr,
          type: 'morning',
          points: activity.points,
          duration: activity.duration,
          tags: ['onboarding', 'morning'],
        });
        currentTime += activity.duration;
      });

      // Create evening routine items
      const eveningActivities = this.getSelectedActivities('evening');
      let eveningTime = this.timeToMinutes(this.schedule.workEnd) + 60; // 1 hour after work

      eveningActivities.forEach((activity) => {
        const timeStr = this.minutesToTime(eveningTime);
        routineItems.push({
          name: activity.name,
          time: timeStr,
          type: 'evening',
          points: activity.points,
          duration: activity.duration,
          tags: ['onboarding', 'evening'],
        });
        eveningTime += activity.duration;
      });

      // Use GraphQL mutation to create all routine items with AI enhancement
      const result = await this.$apollo.mutate({
        mutation: gql`
          mutation bulkAddRoutineItems($routineItems: [RoutineItemInput!]!) {
            bulkAddRoutineItems(routineItems: $routineItems) {
              id
              name
              description
              time
              points
              steps {
                id
                name
              }
              tags
            }
          }
        `,
        variables: {
          routineItems,
        },
      });

      return result.data.bulkAddRoutineItems;
    },

    minutesToTime(minutes) {
      const hours = Math.floor(minutes / 60) % 24;
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    },

    redirectToSettings() {
      this.$router.push('/settings');
    },
  },
};
</script>

<style scoped>
.borderless-table {
  width: 100%;
  border-collapse: collapse;
  border: none !important;
}

.borderless-table tbody tr {
  border: none !important;
}

.borderless-table td {
  border: none !important;
  border-bottom: none !important;
  padding: 8px;
}

.borderless-table td.pa-2 {
  padding: 8px;
}
</style>
