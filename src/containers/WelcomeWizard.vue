<template>
  <v-stepper v-model="currentStep">
    <v-stepper-header>
      <v-stepper-step :complete="currentStep > 1" step="1">Sleep Schedule</v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step :complete="currentStep > 2" step="2">Work Hours</v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step :complete="currentStep > 3" step="3">Morning Routine</v-stepper-step>

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

          <v-layout row wrap>
            <v-flex xs6>
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
            </v-flex>

            <v-flex xs6>
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
            </v-flex>
          </v-layout>

          <v-alert v-if="schedule.sleepTime && schedule.wakeTime" type="info" class="mt-3">
            You'll get approximately {{ calculateSleepHours() }} hours of sleep.
          </v-alert>
        </div>

        <div class="text-xs-right mb-3">
          <v-btn color="primary" @click="nextStep()">Next</v-btn>
        </div>
      </v-stepper-content>

      <!-- Step 3: Morning Routine -->
      <v-stepper-content step="3">
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
                  v-for="activity in getSelectedActivitiesWithTimes('morning')"
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
                    {{ activity.startTime }}
                  </td>
                </tr>
              </tbody>
            </table>

            <v-alert :type="isMorningRoutineOvertime() ? 'warning' : 'success'" class="mt-3">
              <div v-if="isMorningRoutineOvertime()">
                ⚠️ Routine takes {{ getTotalDuration('morning') }} minutes but you only have
                {{ getAvailableMorningTime() }} minutes available ({{ getMorningStartTime() }} - {{ schedule.workStart }})
              </div>
              <div v-else>
                ✅ Total: {{ getTotalDuration('morning') }} minutes • Available: {{ getAvailableMorningTime() }} minutes
                ({{ getMorningStartTime() }} - {{ schedule.workStart }})
              </div>
            </v-alert>
          </div>
        </div>

        <div class="text-xs-right">
          <v-btn text @click="previousStep()">Back</v-btn>
          <v-btn color="primary" @click="nextStep()">Next</v-btn>
        </div>
      </v-stepper-content>

      <!-- Step 2: Work Hours -->
      <v-stepper-content step="2">
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

          <v-layout row wrap>
            <v-flex xs6>
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
            </v-flex>

            <v-flex xs6>
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
            </v-flex>
          </v-layout>

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
                  v-for="activity in getSelectedActivitiesWithTimes('evening')"
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
                    {{ activity.startTime }}
                  </td>
                </tr>
              </tbody>
            </table>

            <v-alert :type="isEveningRoutineOvertime() ? 'warning' : 'success'" class="mt-3">
              <div v-if="isEveningRoutineOvertime()">
                ⚠️ Routine takes {{ getTotalDuration('evening') }} minutes but you only have
                {{ getAvailableEveningTime() }} minutes available ({{ getEveningStartTime() }} - {{ schedule.sleepTime }})
              </div>
              <div v-else>
                ✅ Total: {{ getTotalDuration('evening') }} minutes • Available: {{ getAvailableEveningTime() }} minutes
                ({{ getEveningStartTime() }} - {{ schedule.sleepTime }})
              </div>
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
            <v-card-title>
              <v-icon class="mr-2">schedule</v-icon>
              Your Daily Schedule Summary
            </v-card-title>
            <v-card-text>
              <!-- Clock Visual Row -->
              <v-layout row wrap class="mb-4">
                <v-flex xs12 sm6 class="clock-section">
                  <h4 class="mb-3 clock-title">
                    <v-icon class="mr-2" small>hotel</v-icon>
                    Sleep Schedule
                  </h4>
                  <div class="clock-container">
                    <svg width="150" height="150" viewBox="0 0 150 150" class="clock-svg">
                      <!-- Clock face -->
                      <circle cx="75" cy="75" r="70" fill="none" stroke="#e0e0e0" stroke-width="2"/>

                      <!-- Hour markers -->
                      <g v-for="hour in 12" :key="hour" class="hour-marker">
                        <line
                          :x1="75 + 60 * Math.cos((hour - 3) * Math.PI / 6)"
                          :y1="75 + 60 * Math.sin((hour - 3) * Math.PI / 6)"
                          :x2="75 + 65 * Math.cos((hour - 3) * Math.PI / 6)"
                          :y2="75 + 65 * Math.sin((hour - 3) * Math.PI / 6)"
                          stroke="#bdbdbd"
                          stroke-width="2"
                        />
                        <text
                          :x="75 + 55 * Math.cos((hour - 3) * Math.PI / 6)"
                          :y="75 + 55 * Math.sin((hour - 3) * Math.PI / 6) + 4"
                          text-anchor="middle"
                          font-size="12"
                          fill="#757575"
                        >
                          {{ hour === 12 ? 12 : hour }}
                        </text>
                      </g>

                      <!-- Sleep arc -->
                      <path
                        :d="getSleepArcPath()"
                        fill="none"
                        stroke="#3f51b5"
                        stroke-width="8"
                        stroke-linecap="round"
                      />

                      <!-- Sleep start marker -->
                      <circle
                        :cx="75 + 70 * Math.cos(getSleepStartAngle())"
                        :cy="75 + 70 * Math.sin(getSleepStartAngle())"
                        r="6"
                        fill="#3f51b5"
                      />

                      <!-- Wake end marker -->
                      <circle
                        :cx="75 + 70 * Math.cos(getWakeEndAngle())"
                        :cy="75 + 70 * Math.sin(getWakeEndAngle())"
                        r="6"
                        fill="#4caf50"
                      />

                      <!-- Center icon -->
                      <circle cx="75" cy="75" r="20" fill="#f5f5f5" stroke="#e0e0e0" stroke-width="1"/>
                      <text x="75" y="82" text-anchor="middle" font-family="Material Icons" font-size="20" fill="#757575">hotel</text>
                    </svg>
                    <div class="clock-details mt-2">
                      <p class="mb-1">
                        <v-icon class="mr-1" small color="primary">bedtime</v-icon>
                        Sleep: {{ schedule.sleepTime }}
                      </p>
                      <p class="mb-1">
                        <v-icon class="mr-1" small color="success">wb_sunny</v-icon>
                        Wake: {{ schedule.wakeTime }}
                      </p>
                      <p class="mb-0">
                        <v-icon class="mr-1" small>timer</v-icon>
                        {{ calculateSleepHours() }} hours
                      </p>
                    </div>
                  </div>
                </v-flex>

                <v-flex xs12 sm6 class="clock-section">
                  <h4 class="mb-3 clock-title">
                    <v-icon class="mr-2" small>work</v-icon>
                    Work Hours
                  </h4>
                  <div class="clock-container">
                    <svg width="150" height="150" viewBox="0 0 150 150" class="clock-svg">
                      <!-- Clock face -->
                      <circle cx="75" cy="75" r="70" fill="none" stroke="#e0e0e0" stroke-width="2"/>

                      <!-- Hour markers -->
                      <g v-for="hour in 12" :key="hour" class="hour-marker">
                        <line
                          :x1="75 + 60 * Math.cos((hour - 3) * Math.PI / 6)"
                          :y1="75 + 60 * Math.sin((hour - 3) * Math.PI / 6)"
                          :x2="75 + 65 * Math.cos((hour - 3) * Math.PI / 6)"
                          :y2="75 + 65 * Math.sin((hour - 3) * Math.PI / 6)"
                          stroke="#bdbdbd"
                          stroke-width="2"
                        />
                        <text
                          :x="75 + 55 * Math.cos((hour - 3) * Math.PI / 6)"
                          :y="75 + 55 * Math.sin((hour - 3) * Math.PI / 6) + 4"
                          text-anchor="middle"
                          font-size="12"
                          fill="#757575"
                        >
                          {{ hour === 12 ? 12 : hour }}
                        </text>
                      </g>

                      <!-- Work arc -->
                      <path
                        :d="getWorkArcPath()"
                        fill="none"
                        stroke="#ff9800"
                        stroke-width="8"
                        stroke-linecap="round"
                      />

                      <!-- Work start marker -->
                      <circle
                        :cx="75 + 70 * Math.cos(getWorkStartAngle())"
                        :cy="75 + 70 * Math.sin(getWorkStartAngle())"
                        r="6"
                        fill="#4caf50"
                      />

                      <!-- Work end marker -->
                      <circle
                        :cx="75 + 70 * Math.cos(getWorkEndAngle())"
                        :cy="75 + 70 * Math.sin(getWorkEndAngle())"
                        r="6"
                        fill="#f44336"
                      />

                      <!-- Center icon -->
                      <circle cx="75" cy="75" r="20" fill="#f5f5f5" stroke="#e0e0e0" stroke-width="1"/>
                      <text x="75" y="82" text-anchor="middle" font-family="Material Icons" font-size="20" fill="#757575">work</text>
                    </svg>
                    <div class="clock-details mt-2">
                      <p class="mb-1">
                        <v-icon class="mr-1" small color="success">play_arrow</v-icon>
                        Start: {{ schedule.workStart }}
                      </p>
                      <p class="mb-1">
                        <v-icon class="mr-1" small color="error">stop</v-icon>
                        End: {{ schedule.workEnd }}
                      </p>
                      <p class="mb-0">
                        <v-icon class="mr-1" small>timer</v-icon>
                        {{ calculateWorkHours() }} hours
                      </p>
                    </div>
                  </div>
                </v-flex>
              </v-layout>

              <v-divider class="my-3"></v-divider>

              <v-layout row wrap>
                <v-flex xs12 sm6 class="pl-2 pr-2">
                  <h4>
                    <v-icon class="mr-2" small>wb_sunny</v-icon>
                    Morning Routine ({{ getTotalDuration('morning') }} min)
                  </h4>
                  <table v-if="getSelectedActivities('morning').length > 0" class="borderless-table">
                    <tbody>
                      <tr
                        v-for="activity in getSelectedActivitiesWithTimes('morning')"
                        :key="activity.id"
                      >
                        <td class="text-xs-left pa-2">
                          <v-icon class="mr-2" small>{{ activity.icon }}</v-icon>
                          {{ activity.name }}
                        </td>
                        <td class="text-xs-right pa-2">
                          {{ activity.duration }}min
                        </td>
                        <td class="text-xs-right pa-2">
                          {{ activity.startTime }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-else class="text-xs-center grey--text">No morning activities selected</p>
                </v-flex>
                <v-flex xs12 sm6 class="pl-2 pr-2">
                  <h4>
                    <v-icon class="mr-2" small>nights_stay</v-icon>
                    Evening Routine ({{ getTotalDuration('evening') }} min)
                  </h4>
                  <table v-if="getSelectedActivities('evening').length > 0" class="borderless-table">
                    <tbody>
                      <tr
                        v-for="activity in getSelectedActivitiesWithTimes('evening')"
                        :key="activity.id"
                      >
                        <td class="text-xs-left pa-2">
                          <v-icon class="mr-2" small>{{ activity.icon }}</v-icon>
                          {{ activity.name }}
                        </td>
                        <td class="text-xs-right pa-2">
                          {{ activity.duration }}min
                        </td>
                        <td class="text-xs-right pa-2">
                          {{ activity.startTime }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-else class="text-xs-center grey--text">No evening activities selected</p>
                </v-flex>
              </v-layout>

              <v-alert type="success" class="mt-3">
                <v-icon class="mr-2">star</v-icon>
                Total Daily Points: {{ getTotalPoints('morning') + getTotalPoints('evening') }} points
                <span class="text-caption">(will be normalized to 100 points when created)</span>
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
          id: 'jogging', name: 'Jogging', icon: 'directions_run', duration: 25, points: 45,
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
          id: 'workout', name: 'Workout', icon: 'fitness_center', duration: 40, points: 50,
        },
        {
          id: 'dinner', name: 'Dinner', icon: 'restaurant', duration: 30, points: 25,
        },
        {
          id: 'family-time', name: 'Family Time', icon: 'group', duration: 45, points: 40,
        },
        {
          id: 'tea-time', name: 'Herbal Tea', icon: 'local_cafe', duration: 10, points: 15,
        },
        {
          id: 'reading-evening', name: 'Reading', icon: 'menu_book', duration: 30, points: 35,
        },
        {
          id: 'meditation-evening', name: 'Meditation', icon: 'self_improvement', duration: 15, points: 30,
        },
        {
          id: 'light-stretch', name: 'Light Stretching', icon: 'self_improvement', duration: 15, points: 25,
        },
        {
          id: 'skincare', name: 'Skincare Routine', icon: 'face', duration: 15, points: 20,
        },
        {
          id: 'gratitude', name: 'Gratitude Practice', icon: 'favorite', duration: 10, points: 20,
        },
        {
          id: 'prepare-tomorrow', name: 'Prepare for Tomorrow', icon: 'event', duration: 15, points: 25,
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

    getSelectedActivitiesWithTimes(type) {
      const selectedActivities = this.getSelectedActivities(type);
      if (type === 'morning') {
        let currentTime = this.timeToMinutes(this.schedule.wakeTime) + 15; // Start 15 min after wake up
        return selectedActivities.map((activity) => {
          const startTime = this.minutesToTime(currentTime);
          currentTime += activity.duration;
          return {
            ...activity,
            startTime,
          };
        });
      }
      if (type === 'evening') {
        let currentTime = this.timeToMinutes(this.schedule.workEnd) + 60; // 1 hour after work
        return selectedActivities.map((activity) => {
          const startTime = this.minutesToTime(currentTime);
          currentTime += activity.duration;
          return {
            ...activity,
            startTime,
          };
        });
      }
      return selectedActivities;
    },

    getAvailableMorningTime() {
      if (!this.schedule.wakeTime || !this.schedule.workStart) return 0;
      const wake = this.timeToMinutes(this.schedule.wakeTime) + 15; // Start 15 min after wake up
      const work = this.timeToMinutes(this.schedule.workStart);
      return work - wake;
    },

    getMorningStartTime() {
      if (!this.schedule.wakeTime) return '';
      const wakeTime = this.timeToMinutes(this.schedule.wakeTime) + 15;
      return this.minutesToTime(wakeTime);
    },

    getAvailableEveningTime() {
      if (!this.schedule.workEnd || !this.schedule.sleepTime) return 0;
      const workEnd = this.timeToMinutes(this.schedule.workEnd) + 60; // 1 hour after work
      const sleep = this.timeToMinutes(this.schedule.sleepTime);
      return sleep - workEnd;
    },

    isMorningRoutineOvertime() {
      return this.getTotalDuration('morning') > this.getAvailableMorningTime();
    },

    isEveningRoutineOvertime() {
      return this.getTotalDuration('evening') > this.getAvailableEveningTime();
    },

    getEveningStartTime() {
      if (!this.schedule.workEnd) return '';
      const workEnd = this.timeToMinutes(this.schedule.workEnd) + 60;
      return this.minutesToTime(workEnd);
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
      let currentTime = this.timeToMinutes(this.schedule.wakeTime) + 15; // Start 15 min after wake up

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

      // Normalize points to sum up to 100
      this.normalizePointsTo100(routineItems);

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

    // Normalize points to sum up to exactly 100
    normalizePointsTo100(routineItems) {
      if (routineItems.length === 0) return;

      // Calculate current total points
      const currentTotal = routineItems.reduce((sum, item) => sum + item.points, 0);

      if (currentTotal === 0) {
        // If no points assigned, distribute evenly
        const evenPoints = Math.floor(100 / routineItems.length);
        const remainder = 100 % routineItems.length;

        routineItems.forEach((item, index) => {
          // eslint-disable-next-line no-param-reassign
          item.points = evenPoints + (index < remainder ? 1 : 0);
        });
      } else {
        // Scale existing points proportionally to sum to 100
        const scaleFactor = 100 / currentTotal;
        let totalAssigned = 0;

        // Apply scaling and round down, keeping track of total
        routineItems.forEach((item, index) => {
          if (index === routineItems.length - 1) {
            // Last item gets remainder to ensure exact total of 100
            // eslint-disable-next-line no-param-reassign
            item.points = 100 - totalAssigned;
          } else {
            // eslint-disable-next-line no-param-reassign
            item.points = Math.floor(item.points * scaleFactor);
            totalAssigned += item.points;
          }

          // Ensure minimum of 1 point per item
          if (item.points < 1) {
            // eslint-disable-next-line no-param-reassign
            item.points = 1;
          }
        });

        // If we exceeded 100 due to minimum point requirements, redistribute
        const finalTotal = routineItems.reduce((sum, item) => sum + item.points, 0);
        if (finalTotal > 100) {
          const excess = finalTotal - 100;
          // Remove excess from items with highest points first
          const sortedIndices = routineItems
            .map((item, index) => ({ points: item.points, index }))
            .sort((a, b) => b.points - a.points)
            .map(({ index }) => index);

          let remainingExcess = excess;

          sortedIndices.forEach((itemIndex) => {
            if (remainingExcess <= 0) return;
            const item = routineItems[itemIndex];
            if (item.points > 1) {
              const reduction = Math.min(remainingExcess, item.points - 1);
              // eslint-disable-next-line no-param-reassign
              item.points -= reduction;
              remainingExcess -= reduction;
            }
          });
        }
      }
    },

    // Clock visualization methods
    getSleepStartAngle() {
      const hours = parseInt(this.schedule.sleepTime.split(':')[0], 10);
      const minutes = parseInt(this.schedule.sleepTime.split(':')[1], 10);
      return ((hours % 12) + (minutes / 60) - 3) * (Math.PI / 6);
    },

    getWakeEndAngle() {
      const hours = parseInt(this.schedule.wakeTime.split(':')[0], 10);
      const minutes = parseInt(this.schedule.wakeTime.split(':')[1], 10);
      return ((hours % 12) + (minutes / 60) - 3) * (Math.PI / 6);
    },

    getSleepArcPath() {
      const startAngle = this.getSleepStartAngle();
      const endAngle = this.getWakeEndAngle();
      const radius = 70;
      const centerX = 75;
      const centerY = 75;

      const startX = centerX + (radius * Math.cos(startAngle));
      const startY = centerY + (radius * Math.sin(startAngle));
      const endX = centerX + (radius * Math.cos(endAngle));
      const endY = centerY + (radius * Math.sin(endAngle));

      // Calculate angle difference considering sleep spans across midnight
      let angleDiff = endAngle - startAngle;
      if (angleDiff <= 0) {
        angleDiff += 2 * Math.PI; // Sleep spans across midnight
      }

      const largeArcFlag = angleDiff > Math.PI ? 1 : 0;

      return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
    },

    getWorkStartAngle() {
      const hours = parseInt(this.schedule.workStart.split(':')[0], 10);
      const minutes = parseInt(this.schedule.workStart.split(':')[1], 10);
      return ((hours % 12) + (minutes / 60) - 3) * (Math.PI / 6);
    },

    getWorkEndAngle() {
      const hours = parseInt(this.schedule.workEnd.split(':')[0], 10);
      const minutes = parseInt(this.schedule.workEnd.split(':')[1], 10);
      return ((hours % 12) + (minutes / 60) - 3) * (Math.PI / 6);
    },

    getWorkArcPath() {
      const startAngle = this.getWorkStartAngle();
      const endAngle = this.getWorkEndAngle();
      const radius = 70;
      const centerX = 75;
      const centerY = 75;

      // Ensure we have a valid arc (minimum 15 minutes)
      let adjustedEndAngle = endAngle;
      if (Math.abs(endAngle - startAngle) < (15 / 60) * (Math.PI / 6)) {
        adjustedEndAngle = startAngle + (15 / 60) * (Math.PI / 6);
      }

      const startX = centerX + (radius * Math.cos(startAngle));
      const startY = centerY + (radius * Math.sin(startAngle));
      const endX = centerX + (radius * Math.cos(adjustedEndAngle));
      const endY = centerY + (radius * Math.sin(adjustedEndAngle));

      // Calculate if we need a large arc flag
      let angleDiff = adjustedEndAngle - startAngle;
      if (angleDiff < 0) {
        angleDiff += 2 * Math.PI;
      }
      const largeArcFlag = angleDiff > Math.PI ? 1 : 0;

      return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
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

.clock-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
}

.clock-title {
  text-align: center;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clock-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  max-width: 250px;
  margin: 0 auto;
}

.clock-svg {
  display: block;
  margin: 0 auto 16px auto;
}

.clock-details {
  font-size: 14px;
  line-height: 1.4;
  width: 100%;
  text-align: left;
}

.clock-details p {
  margin: 4px 0;
  display: flex;
  align-items: center;
}

.hour-marker text {
  font-family: Arial, sans-serif;
  font-weight: 500;
}
</style>
