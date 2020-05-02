<template>
  <v-stepper v-model="e1">
    <v-stepper-header>
      <v-stepper-step :complete="e1 > 1" step="1">Welcome</v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step :complete="e1 > 2" step="2">Morning Routine</v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step :complete="e1 > 3" step="3">Hobby Habit</v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step step="4">Night Routine</v-stepper-step>
    </v-stepper-header>

    <v-stepper-items>
      <v-stepper-content step="1">
        <div style="max-width: 400px; margin: 0 auto;">
          <h2 class="text-xs-center mt-4 mb-3">Welcome!</h2>
          <div class="mb-3" style="max-width: 192px; margin: 0 auto;">
            <v-img :src="`/img/enlightenment.png`" alt="Enlightened">
              <template v-slot:placeholder>
                <v-layout fill-height align-center justify-center ma-0>
                  <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                </v-layout>
              </template>
            </v-img>
          </div>
          <p>
            This app is designed to help you get on track of your puntuality that
            lets you create your daily routine ticks whenever your task time approaches nearer.<br/>
            How it Works:
          </p>
          <ul class="mb-3">
            <li>Create a task that you perform daily.</li>
            <li>Tick it on time.</li>
            <li>Earn Points.</li>
          </ul>
          <p>You get a time window not before 1 hour to tick task. And if you are 30 minutes late, the item gets expired</p>
        </div>
        <div class="text-xs-right mb-3">
          <v-btn color="primary" @click="e1 = 2">Next</v-btn>
        </div>
      </v-stepper-content>

      <v-stepper-content step="2">
        <div style="max-width: 400px; margin: 0 auto;">
          <h2 class="text-xs-center mt-4 mb-3">Give Your Morning Fresh Start!</h2>
          <div class="mb-3" style="max-width: 192px; margin: 0 auto;">
            <v-img :src="`/img/morning.jpg`" alt="Morning">
              <template v-slot:placeholder>
                <v-layout fill-height align-center justify-center ma-0>
                  <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                </v-layout>
              </template>
            </v-img>
          </div>
          <p>
            Be a morning person and join the rich people 5 A.M Club
            Create following task to create perfect morning:
          </p>
          <ul class="mb-3">
            <li>Wake Up</li>
            <li>Yoga</li>
            <li>Excercise</li>
            <li>Breakfast</li>
            <li>Write Blog</li>
            <li>Reach Office</li>
          </ul>
        </div>
        <div class="text-xs-right">
          <v-btn color="primary" @click="e1 = 3">Next</v-btn>
        </div>
      </v-stepper-content>

      <v-stepper-content step="3">
        <div style="max-width: 400px; margin: 0 auto;">
          <h2 class="text-xs-center mt-4 mb-3">Invest time in yourself</h2>
          <div class="mb-3" style="max-width: 192px; margin: 0 auto;">
            <v-img :src="`/img/hobbies.jpg`" alt="Morning">
              <template v-slot:placeholder>
                <v-layout fill-height align-center justify-center ma-0>
                  <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                </v-layout>
              </template>
            </v-img>
          </div>
          <p>
            Create habits on your hobbies to give you the joy and happiness for the time spent towards yourself
          </p>
        </div>
        <div class="text-xs-right">
          <v-btn color="primary" @click="e1 = 4">Next</v-btn>
        </div>
      </v-stepper-content>

      <v-stepper-content step="4">
        <div style="max-width: 400px; margin: 0 auto;">
          <h2 class="text-xs-center mt-4 mb-3">Prepare for next day</h2>
          <div class="mb-3" style="max-width: 192px; margin: 0 auto;">
            <v-img :src="`/img/night.png`" alt="Morning">
              <template v-slot:placeholder>
                <v-layout fill-height align-center justify-center ma-0>
                  <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                </v-layout>
              </template>
            </v-img>
          </div>
          <p>Create an after Dinner program to spend time with your family, healthy activities, before bed routine and reading to sleep. <b>Finally, its most important to be hosnest to yourself</b></p>
          <p>If this app works for you invite your family members as well to get scored on puntuality</p>
        </div>
        <div class="text-xs-right">
          <v-btn color="primary" @click="redirectToSettings()">Finish</v-btn>
        </div>
      </v-stepper-content>
    </v-stepper-items>
  </v-stepper>
</template>

<script>
export default {
  data() {
    return {
      e1: 1
    };
  },
  methods: {
    redirectToSettings() {
      this.$router.push('settings')
    }
  }
};
</script>