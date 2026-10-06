<template>
  <!--
    /wizard — onboarding, on the redesign's chassis.

    What changed and why:

    * **No app navigation.** The route now carries `meta: { appShell: true }`, so
      App.vue renders it bare instead of inside MobileLayout / DesktopLayout.
      Before, onboarding sat inside the full app frame: a toolbar with the points
      chip, search and the avatar, a left drawer listing Progress / Groups /
      Agents / Profile / Log out, and a bottom bar whose third tab still read
      "Routine". All of it offered a brand-new user ways out of the one flow they
      were put in, to pages that have nothing in them yet. The wizard draws its
      own top bar and nothing else.

    * **Naming yourself is a step, not a doorway.** The name capture already
      existed for Apple accounts (`needsName`), but it was an interstitial in
      front of the stepper — no step count, no Back, and nothing telling you how
      much was left. It is step 1 of the flow now, counted and reversible, and it
      only appears for the accounts that need it, so Google users still see six
      steps and never meet it.

    * **The frame is the chassis'.** The Vuetify stepper drew six numbered
      circles across the top (at 393px they left ~40px for the content below the
      fold), and each step ended in a flat square-cornered alert bar and an
      ALL-CAPS text button. Now: one progress rail, a scrolling body, and a
      sticky footer holding Back / Next, so the primary action is in the same
      place on every step and in thumb reach on a phone.

    The per-step CONTENT is the same work as before — the same schedule, the same
    activity catalogue, the same clock summary and the same `completeOnboarding`
    mutation. Only the chrome around it moved.
  -->
  <div class="rn-wz" :class="`rn-wz--${shell}`" data-testid="onboarding">
    <header class="rn-wz__top">
      <button
        v-if="canGoBack"
        type="button"
        class="rn-wz__top-back"
        aria-label="Back"
        data-testid="onboarding-top-back"
        @click="previousStep"
      >
        <i class="rn-mi">arrow_back</i>
      </button>
      <div class="rn-wz__head">
        <div class="rn-wz__eyebrow" data-testid="onboarding-step-count">
          Step {{ currentStep }} of {{ steps.length }} · {{ step.label }}
        </div>
        <h1 class="rn-wz__title" data-testid="onboarding-title">{{ step.title }}</h1>
      </div>
    </header>

    <div
      class="rn-wz__track"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(progressPct)"
    >
      <div class="rn-wz__fill" :style="{ width: `${progressPct}%` }"></div>
    </div>

    <main class="rn-wz__body rn-hidescroll">
      <div class="rn-wz__inner">
        <img
          v-if="step.art"
          class="rn-wz__art"
          :src="step.art"
          :alt="step.title"
          loading="lazy"
        />
        <p class="rn-wz__lede">{{ step.lede }}</p>

        <!-- 1 · Your name (Apple accounts, and anyone else arriving nameless) -->
        <template v-if="step.key === 'name'">
          <label class="rn-wz__field">
            <span class="rn-wz__field-label">Your name</span>
            <input
              v-model="displayName"
              class="rn-wz__input"
              type="text"
              autocomplete="name"
              placeholder="e.g. Alex"
              maxlength="60"
              data-testid="onboarding-name"
              @keyup.enter="advance"
            />
          </label>
          <p v-if="nameError" class="rn-wz__error" data-testid="onboarding-name-error">
            {{ nameError }}
          </p>
        </template>

        <!-- Sleep and work are the same shape: two times and what they add up to. -->
        <template v-else-if="step.key === 'sleep' || step.key === 'work'">
          <div class="rn-wz__times">
            <label v-for="field in step.fields" :key="field.model" class="rn-wz__field">
              <span class="rn-wz__field-label">
                <i class="rn-mi rn-wz__field-glyph">{{ field.icon }}</i>{{ field.label }}
              </span>
              <!--
                The native time control, not Vuetify's menu + clock dial. It is
                the OS picker on a phone, it is typable on a desktop, and it
                speaks the same "HH:mm" string the schedule already stores — the
                dial needed a menu, a ref and a save callback per field to do
                the same thing. 16px so iOS does not zoom the page on focus.
              -->
              <input
                v-model="schedule[field.model]"
                class="rn-wz__input rn-wz__input--time"
                type="time"
                :data-testid="`onboarding-${field.model}`"
              />
            </label>
          </div>
          <p class="rn-wz__note rn-wz__note--info">
            <i class="rn-mi rn-wz__note-glyph">{{ step.key === 'sleep' ? 'bedtime' : 'schedule' }}</i>
            <span v-if="step.key === 'sleep'">
              That is about <b>{{ calculateSleepHours() }} hours</b> of sleep a night.
            </span>
            <span v-else>
              That is a <b>{{ calculateWorkHours() }} hour</b> working day.
            </span>
          </p>
        </template>

        <!-- Morning and evening are the same shape: pick activities, see the fit. -->
        <template v-else-if="step.key === 'morning' || step.key === 'evening'">
          <!--
            Toggle buttons, with `toggleSelection` as the only writer. The old
            markup put a `v-model` on the chip GROUP as well as this handler on
            each chip, so every tap wrote the selection twice.
          -->
          <div class="rn-wz__chips" :data-testid="`onboarding-${step.key}-chips`">
            <button
              v-for="activity in step.key === 'morning' ? morningActivities : eveningActivities"
              :key="activity.id"
              type="button"
              class="rn-wz__chip"
              :class="{ 'rn-wz__chip--on': isSelected(step.key, activity.id) }"
              :aria-pressed="isSelected(step.key, activity.id) ? 'true' : 'false'"
              :data-testid="`onboarding-activity-${activity.id}`"
              @click="toggleSelection(step.key, activity.id)"
            >
              <i class="rn-mi rn-wz__chip-glyph">{{ activity.icon }}</i>
              <span class="rn-wz__chip-text">{{ activity.name }}</span>
              <i v-if="isSelected(step.key, activity.id)" class="rn-mi rn-wz__chip-tick">check</i>
            </button>
          </div>

          <section
            v-if="selectedFor(step.key).length"
            class="rn-wz__card"
            :data-testid="`onboarding-${step.key}-plan`"
          >
            <h2 class="rn-wz__card-title">
              {{ step.key === 'morning' ? 'Your morning' : 'Your evening' }}
            </h2>
            <ul class="rn-wz__rows">
              <li
                v-for="activity in getSelectedActivitiesWithTimes(step.key)"
                :key="activity.id"
                class="rn-wz__row"
              >
                <i class="rn-mi rn-wz__row-glyph">{{ activity.icon }}</i>
                <span class="rn-wz__row-name">{{ activity.name }}</span>
                <span class="rn-wz__row-time">{{ activity.startTime }}</span>
                <span class="rn-wz__row-mins">{{ activity.duration }} min</span>
              </li>
            </ul>
            <p
              class="rn-wz__note"
              :class="stepOvertime ? 'rn-wz__note--warn' : 'rn-wz__note--ok'"
            >
              <i class="rn-mi rn-wz__note-glyph">{{ stepOvertime ? 'warning' : 'check_circle' }}</i>
              <span v-if="stepOvertime">
                That is {{ getTotalDuration(step.key) }} minutes of activity in the
                {{ stepAvailableMinutes }} you have between {{ stepWindowLabel }}.
                Drop one, or move the times.
              </span>
              <span v-else>
                {{ getTotalDuration(step.key) }} of {{ stepAvailableMinutes }} minutes used,
                between {{ stepWindowLabel }}.
              </span>
            </p>
          </section>
        </template>

        <!-- Points -->
        <template v-else-if="step.key === 'points'">
          <section
            v-for="card in POINT_CARDS"
            :key="card.title"
            class="rn-wz__card rn-wz__card--point"
          >
            <i class="rn-mi rn-wz__point-glyph" :style="{ color: card.color }">{{ card.icon }}</i>
            <div class="rn-wz__point-text">
              <h2 class="rn-wz__card-title">{{ card.title }}</h2>
              <p class="rn-wz__card-body">{{ card.body }}</p>
            </div>
          </section>
          <p class="rn-wz__note rn-wz__note--info">
            <i class="rn-mi rn-wz__note-glyph">card_giftcard</i>
            <span>
              You start with <b>300 welcome points</b> — enough to rescue your first
              missed tasks while the habit sets.
            </span>
          </p>
        </template>

        <!-- Review -->
        <template v-else-if="step.key === 'review'">
          <div class="rn-wz__clocks">
            <section class="rn-wz__card rn-wz__clock">
              <h2 class="rn-wz__card-title">Sleep</h2>
              <svg width="150" height="150" viewBox="0 0 150 150" class="rn-wz__dial">
                <circle cx="75" cy="75" r="70" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="2" />
                <g v-for="hour in 12" :key="hour">
                  <line
                    :x1="75 + 60 * Math.cos((hour - 3) * Math.PI / 6)"
                    :y1="75 + 60 * Math.sin((hour - 3) * Math.PI / 6)"
                    :x2="75 + 65 * Math.cos((hour - 3) * Math.PI / 6)"
                    :y2="75 + 65 * Math.sin((hour - 3) * Math.PI / 6)"
                    stroke="rgba(0,0,0,.2)"
                    stroke-width="2"
                  />
                  <text
                    :x="75 + 55 * Math.cos((hour - 3) * Math.PI / 6)"
                    :y="75 + 55 * Math.sin((hour - 3) * Math.PI / 6) + 4"
                    text-anchor="middle"
                    font-size="11"
                    fill="rgba(0,0,0,.45)"
                  >{{ hour === 12 ? 12 : hour }}</text>
                </g>
                <path :d="getSleepArcPath()" fill="none" stroke="#288bd5" stroke-width="8" stroke-linecap="round" />
                <circle :cx="75 + 70 * Math.cos(getSleepStartAngle())" :cy="75 + 70 * Math.sin(getSleepStartAngle())" r="6" fill="#288bd5" />
                <circle :cx="75 + 70 * Math.cos(getWakeEndAngle())" :cy="75 + 70 * Math.sin(getWakeEndAngle())" r="6" fill="#4CAF50" />
              </svg>
              <dl class="rn-wz__facts">
                <div class="rn-wz__fact"><dt>Sleep</dt><dd>{{ schedule.sleepTime }}</dd></div>
                <div class="rn-wz__fact"><dt>Wake</dt><dd>{{ schedule.wakeTime }}</dd></div>
                <div class="rn-wz__fact"><dt>Hours</dt><dd>{{ calculateSleepHours() }}</dd></div>
              </dl>
            </section>

            <section class="rn-wz__card rn-wz__clock">
              <h2 class="rn-wz__card-title">Work</h2>
              <svg width="150" height="150" viewBox="0 0 150 150" class="rn-wz__dial">
                <circle cx="75" cy="75" r="70" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="2" />
                <g v-for="hour in 12" :key="hour">
                  <line
                    :x1="75 + 60 * Math.cos((hour - 3) * Math.PI / 6)"
                    :y1="75 + 60 * Math.sin((hour - 3) * Math.PI / 6)"
                    :x2="75 + 65 * Math.cos((hour - 3) * Math.PI / 6)"
                    :y2="75 + 65 * Math.sin((hour - 3) * Math.PI / 6)"
                    stroke="rgba(0,0,0,.2)"
                    stroke-width="2"
                  />
                  <text
                    :x="75 + 55 * Math.cos((hour - 3) * Math.PI / 6)"
                    :y="75 + 55 * Math.sin((hour - 3) * Math.PI / 6) + 4"
                    text-anchor="middle"
                    font-size="11"
                    fill="rgba(0,0,0,.45)"
                  >{{ hour === 12 ? 12 : hour }}</text>
                </g>
                <path :d="getWorkArcPath()" fill="none" stroke="#E68900" stroke-width="8" stroke-linecap="round" />
                <circle :cx="75 + 70 * Math.cos(getWorkStartAngle())" :cy="75 + 70 * Math.sin(getWorkStartAngle())" r="6" fill="#4CAF50" />
                <circle :cx="75 + 70 * Math.cos(getWorkEndAngle())" :cy="75 + 70 * Math.sin(getWorkEndAngle())" r="6" fill="#d32f2f" />
              </svg>
              <dl class="rn-wz__facts">
                <div class="rn-wz__fact"><dt>Start</dt><dd>{{ schedule.workStart }}</dd></div>
                <div class="rn-wz__fact"><dt>End</dt><dd>{{ schedule.workEnd }}</dd></div>
                <div class="rn-wz__fact"><dt>Hours</dt><dd>{{ calculateWorkHours() }}</dd></div>
              </dl>
            </section>
          </div>

          <section v-for="part in ['morning', 'evening']" :key="part" class="rn-wz__card">
            <h2 class="rn-wz__card-title">
              {{ part === 'morning' ? 'Morning' : 'Evening' }} · {{ getTotalDuration(part) }} min
            </h2>
            <ul v-if="getSelectedActivities(part).length" class="rn-wz__rows">
              <li
                v-for="activity in getSelectedActivitiesWithTimes(part)"
                :key="activity.id"
                class="rn-wz__row"
              >
                <i class="rn-mi rn-wz__row-glyph">{{ activity.icon }}</i>
                <span class="rn-wz__row-name">{{ activity.name }}</span>
                <span class="rn-wz__row-time">{{ activity.startTime }}</span>
                <span class="rn-wz__row-mins">{{ activity.duration }} min</span>
              </li>
            </ul>
            <p v-else class="rn-wz__empty">Nothing picked — you can add some later.</p>
          </section>

          <p class="rn-wz__note rn-wz__note--ok">
            <i class="rn-mi rn-wz__note-glyph">star</i>
            <span>
              {{ getTotalPoints('morning') + getTotalPoints('evening') }} points a day
              across these, normalised to 100 when the routine is created.
            </span>
          </p>
          <p class="rn-wz__fineprint">
            We will create these routine items for you. Everything here can be
            changed later in Routines.
          </p>
        </template>
      </div>
    </main>

    <footer class="rn-wz__foot">
      <button
        v-if="canGoBack"
        type="button"
        class="rn-wz__btn rn-wz__btn--ghost"
        data-testid="onboarding-back"
        @click="previousStep"
      >
        Back
      </button>
      <button
        type="button"
        class="rn-wz__btn rn-wz__btn--go"
        :disabled="!canAdvance"
        data-testid="onboarding-next"
        @click="advance"
      >
        {{ advanceLabel }}
      </button>
    </footer>
  </div>
</template>

<script>
import gql from 'graphql-tag';
import { MeasurementMixin } from '@/utils/measurementMixins';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import { GC_USER_NAME, GC_USER_EMAIL } from '../constants/settings';
import { getSessionItem } from '../token';

/*
 * The flow, in order. `name` is dropped for an account that already has a real
 * one (see `needsName`), so a Google user sees six steps and an Apple user
 * seven — `steps` is what the counter, the rail and nextStep/previousStep all
 * read, never a hardcoded 6.
 *
 * `analytics` keeps the names the old numeric `getStepName` map emitted, so the
 * existing onboarding funnel still lines up after the renumbering.
 */
const STEPS = Object.freeze([
  {
    key: 'name',
    label: 'Name',
    analytics: 'name_capture',
    title: 'What should we call you?',
    lede: 'Just so we can greet you in your routines and reports. You can change it later in Profile.',
    art: '/img/enlightenment.png',
  },
  {
    key: 'sleep',
    label: 'Sleep',
    analytics: 'sleep_schedule',
    title: 'Set your sleep schedule',
    lede: 'Everything else is built around these two times, so start here.',
    art: '/img/night.png',
    fields: [
      { model: 'wakeTime', label: 'Wake', icon: 'wb_sunny' },
      { model: 'sleepTime', label: 'Sleep', icon: 'hotel' },
    ],
  },
  {
    key: 'work',
    label: 'Work',
    analytics: 'work_hours',
    title: 'Set your work hours',
    lede: 'This is the block your morning has to finish before, and your evening starts after.',
    art: '/img/enlightenment.png',
    fields: [
      { model: 'workStart', label: 'Start', icon: 'work' },
      { model: 'workEnd', label: 'End', icon: 'work_off' },
    ],
  },
  {
    key: 'morning',
    label: 'Morning',
    analytics: 'morning_routine',
    title: 'Design your morning',
    lede: 'Pick what you want to do before work. Times and points are worked out for you.',
    art: '/img/morning.jpg',
  },
  {
    key: 'evening',
    label: 'Evening',
    analytics: 'evening_activities',
    title: 'Plan your evening',
    lede: 'Pick how you wind down between work and sleep.',
    art: '/img/relax.jpg',
  },
  {
    key: 'points',
    label: 'Points',
    analytics: 'points_intro',
    title: 'Miss a task? Points save your streak',
    lede: 'Points are the second chance. Here is how they work.',
  },
  {
    key: 'review',
    label: 'Review',
    analytics: 'complete_setup',
    title: 'Your routine is ready',
    lede: 'This is the day we will set up for you.',
  },
]);

/** The three things the points step explains, in the chassis' palette. */
const POINT_CARDS = Object.freeze([
  {
    icon: 'check_circle',
    color: '#4CAF50',
    title: 'Earn every day',
    body: 'Ticking routine tasks, completing goals and hitting milestones earns Discipline, Kinetics and Geniuses points — up to 300 a day.',
  },
  {
    icon: 'nights_stay',
    color: '#288bd5',
    title: 'They settle overnight',
    body: "Today's earnings become spendable tomorrow. Your balance sits in the header, always in reach.",
  },
  {
    icon: 'diamond',
    color: '#E68900',
    title: 'Rescue a missed task',
    body: "When a task's time passes, its button turns into a diamond — tap it to check the task off using points.",
  },
]);

export default {
  name: 'WelcomeWizard',

  mixins: [MeasurementMixin],
  data() {
    return {
      currentStep: 1,
      creating: false,

      /** Step 1 for an account with no usable name — see `needsName`. */
      displayName: '',
      /** The name rule only speaks up once Next has been pressed on that step. */
      nameTouched: false,

      POINT_CARDS,

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
  computed: {
    /**
     * True when the signed-in account doesn't have a real display name.
     * Triggered for Apple users (placeholder "Apple User" or email-local
     * fallback) and as a safety net for anyone arriving without a name.
     * Google sign-in always returns a real name so this is a no-op there.
     */
    needsName() {
      const rawName = (getSessionItem(GC_USER_NAME) || '').trim();
      const rawEmail = (getSessionItem(GC_USER_EMAIL) || '').toLowerCase();
      if (!rawName) return true;
      if (rawName.toLowerCase() === 'apple user') return true;
      // Apple private relay addresses indicate the account came through
      // Sign in with Apple — if the name happens to be the email-local
      // part (the server fallback) ask anyway.
      if (rawEmail.endsWith('@privaterelay.appleid.com')) {
        const localPart = rawEmail.split('@')[0];
        if (rawName.toLowerCase() === localPart) return true;
      }
      return false;
    },

    /** The ONE breakpoint rule — `resolveShell`, never a second scheme. */
    shell() {
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },

    /** The flow, minus the name step for an account that already has one. */
    steps() {
      return STEPS.filter((step) => step.key !== 'name' || this.needsName);
    },

    step() {
      return this.steps[this.currentStep - 1] || this.steps[0];
    },

    progressPct() {
      return (this.currentStep / this.steps.length) * 100;
    },

    canGoBack() {
      return this.currentStep > 1;
    },

    isLastStep() {
      return this.currentStep >= this.steps.length;
    },

    /** 2-60 characters, the same bounds the Vuetify rules enforced. */
    nameValid() {
      const trimmed = (this.displayName || '').trim();
      return trimmed.length >= 2 && trimmed.length <= 60;
    },

    nameError() {
      if (!this.nameTouched || this.nameValid) return '';
      const trimmed = (this.displayName || '').trim();
      if (!trimmed) return 'Please enter your name.';
      if (trimmed.length < 2) return 'That is a little short — two characters or more.';
      return 'That is longer than 60 characters.';
    },

    /*
     * Only a save in flight disables the button. The name step validates on
     * press instead of greying Next out: a disabled primary action on the very
     * first screen of the app says "no" without saying why, and the message
     * under the field does.
     */
    canAdvance() {
      return !this.creating;
    },

    advanceLabel() {
      if (this.creating) return 'Creating your routine…';
      return this.isLastStep ? 'Create my routine' : 'Next';
    },

    /* The morning and evening steps share one body, so the window they have to
       fit into is resolved by step rather than duplicated per branch. */
    stepOvertime() {
      if (this.step.key === 'morning') return this.isMorningRoutineOvertime();
      if (this.step.key === 'evening') return this.isEveningRoutineOvertime();
      return false;
    },

    stepAvailableMinutes() {
      if (this.step.key === 'morning') return this.getAvailableMorningTime();
      if (this.step.key === 'evening') return this.getAvailableEveningTime();
      return 0;
    },

    stepWindowLabel() {
      if (this.step.key === 'morning') {
        return `${this.getMorningStartTime()} and ${this.schedule.workStart}`;
      }
      if (this.step.key === 'evening') {
        return `${this.getEveningStartTime()} and ${this.schedule.sleepTime}`;
      }
      return '';
    },
  },
  methods: {
    selectedFor(type) {
      return type === 'morning' ? this.selectedMorningActivities : this.selectedEveningActivities;
    },

    isSelected(type, activityId) {
      return this.selectedFor(type).indexOf(activityId) > -1;
    },

    /** The footer's one button: Next everywhere, the save on the last step. */
    advance() {
      if (this.step.key === 'name') {
        this.nameTouched = true;
        if (!this.nameValid) return;
        this.displayName = this.displayName.trim();
        this.trackUserInteraction('onboarding_name_submitted', 'form_submit', {
          name_length: this.displayName.length,
        });
      }
      if (!this.canAdvance) return;
      if (this.isLastStep) {
        this.completeOnboarding();
        return;
      }
      this.nextStep();
    },

    nextStep() {
      if (this.currentStep < this.steps.length) {
        // Track step progression
        this.trackUserInteraction('onboarding_step_next', 'button_click', {
          from_step: this.currentStep,
          to_step: this.currentStep + 1,
          step_name: this.getStepName(this.currentStep + 1),
        });
        this.currentStep += 1;
      }
    },

    previousStep() {
      if (this.currentStep > 1) {
        // Track step backward navigation
        this.trackUserInteraction('onboarding_step_back', 'button_click', {
          from_step: this.currentStep,
          to_step: this.currentStep - 1,
          step_name: this.getStepName(this.currentStep - 1),
        });
        this.currentStep -= 1;
      }
    },

    /* Off the steps array, not a numeric map: the numbers shift by one for an
       account that gets the name step, and the funnel should not shift with
       them. */
    getStepName(stepNumber) {
      const step = this.steps[stepNumber - 1];
      return (step && step.analytics) || 'unknown';
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
        this.trackUserInteraction('activity_deselected', 'checkbox_toggle', {
          activity_type: type,
          activity_id: activityId,
          current_selections: selectedArray.length,
          step: this.currentStep,
        });
      } else {
        // Add if not selected
        selectedArray.push(activityId);
        this.trackUserInteraction('activity_selected', 'checkbox_toggle', {
          activity_type: type,
          activity_id: activityId,
          current_selections: selectedArray.length,
          step: this.currentStep,
        });
      }
    },

    async completeOnboarding() {
      this.creating = true;

      // Track onboarding completion attempt
      this.trackBusinessEvent('onboarding_completion_attempted', {
        sleep_time: this.schedule.sleepTime,
        wake_time: this.schedule.wakeTime,
        work_start: this.schedule.workStart,
        work_end: this.schedule.workEnd,
        morning_activities_count: this.selectedMorningActivities.length,
        evening_activities_count: this.selectedEveningActivities.length,
        sleep_hours: this.calculateSleepHours(),
      });

      try {
        // Create routine items with AI enhancement
        const createdItems = await this.createRoutineItems();

        // Mark user as no longer new. Pass the captured name when the
        // user entered one in the pre-wizard screen — the server will
        // ignore blanks and the "Apple User" placeholder, so this is safe
        // to send even when the step was skipped.
        const submittedName = (this.displayName || '').trim();
        const onboardingResult = await this.$apollo.mutate({
          mutation: gql`
            mutation completeOnboarding($name: String) {
              completeOnboarding(name: $name) {
                name
                needsOnboarding
              }
            }
          `,
          variables: {
            name: submittedName || null,
          },
        });

        // Keep local identity in sync with the server's authoritative name
        // so the dashboard greeting updates without a reload.
        const savedName = onboardingResult
          && onboardingResult.data
          && onboardingResult.data.completeOnboarding
          && onboardingResult.data.completeOnboarding.name;
        if (savedName) {
          try {
            localStorage.setItem(GC_USER_NAME, savedName);
            if (window.userData) {
              window.userData[GC_USER_NAME] = savedName;
              window.userData.name = savedName;
            }
            if (this.$root && this.$root.$data) {
              this.$root.$data.name = savedName;
            }
          } catch (storageErr) {
            console.warn('Failed to persist onboarding name locally:', storageErr);
          }
        }

        // Track successful onboarding completion
        this.trackBusinessEvent('onboarding_completed', {
          created_items_count: createdItems.length,
          total_steps_completed: 5,
          sleep_hours: this.calculateSleepHours(),
          work_hours: this.calculateWorkHours(),
        });

        // Track navigation to dashboard
        this.trackUserInteraction('onboarding_complete_redirect', 'navigation', {
          from_page: 'wizard',
          to_page: 'home',
          items_created: createdItems.length,
        });

        // Redirect to home page
        this.$router.push('/home');

        // Show success message
        this.$store.dispatch('showSnackbar', {
          message: `Your routine has been created successfully with ${createdItems.length} activities!`,
          color: 'success',
        });
      } catch (error) {
        console.error('Error creating routine:', error);

        // Track onboarding failure
        this.trackError('onboarding_completion_error', error, {
          step: 'complete_setup',
          has_morning_activities: this.selectedMorningActivities.length > 0,
          has_evening_activities: this.selectedEveningActivities.length > 0,
        });

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
        tags: ['time:sleep'],
      });

      routineItems.push({
        name: 'Wake Up',
        time: this.schedule.wakeTime,
        type: 'wake',
        points: 30,
        duration: 5,
        tags: ['time:morning'],
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
          tags: ['time:morning'],
        });
        currentTime += activity.duration;
      });

      // Create work start routine item
      routineItems.push({
        name: 'Start Work',
        time: this.schedule.workStart,
        type: 'work',
        points: 25,
        duration: 0,
        tags: ['time:work'],
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
          tags: ['time:evening'],
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
  mounted() {
    // Track wizard page view
    this.trackPageView('onboarding_wizard');

    // Track onboarding start
    this.trackBusinessEvent('onboarding_started', {
      user_type: 'new_user',
      entry_step: this.currentStep,
      source: 'login_redirect',
    });
  },
};
</script>

<style scoped>
/*
  Three rows, pinned: top bar, progress rail, scrolling body, sticky footer.
  `100dvh` rather than `100vh` because the mobile browser's URL bar counts
  against vh and the footer would sit under it; the `100vh` line before it is
  the fallback for engines without dvh.
*/
.rn-wz {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: #f4f4f4;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-wz__top {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 0 0 auto;
  padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 10px;
  background: #fff;
}

.rn-wz__top-back {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 18px;
  background: rgba(0, 0, 0, .05);
  color: rgba(0, 0, 0, .7);
  cursor: pointer;
}

.rn-wz__head {
  min-width: 0;
}

.rn-wz__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: #1f6fab;
}

.rn-wz__title {
  margin: 2px 0 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.rn-wz--tablet .rn-wz__title,
.rn-wz--desktop .rn-wz__title {
  font-size: 26px;
}

/* One rail instead of the stepper's six numbered circles. The circles cost
   ~70px of a 393px-tall fold and still only said "6", while the rail says how
   far along you are and the eyebrow above says which step by name. */
.rn-wz__track {
  flex: 0 0 auto;
  height: 3px;
  background: rgba(0, 0, 0, .08);
}

.rn-wz__fill {
  height: 100%;
  background: #288bd5;
  transition: width .3s cubic-bezier(.3, 1.1, .5, 1);
}

.rn-wz__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
}

.rn-wz__inner {
  display: grid;
  gap: 12px;
  align-content: start;
  max-width: 560px;
  margin: 0 auto;
  min-width: 0;
}

.rn-wz--desktop .rn-wz__inner {
  max-width: 720px;
}

/* Two of the illustrations are JPGs with a white background, so on the grey
   canvas they show as a white rectangle unless they are given a corner. */
.rn-wz__art {
  display: block;
  width: 100%;
  max-width: 128px;
  margin: 0 auto;
  border-radius: 12px;
}

.rn-wz__lede {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .6);
}

/* ---- fields ---- */

.rn-wz__times {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.rn-wz__field {
  display: block;
  min-width: 0;
}

.rn-wz__field-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .55);
}

.rn-wz__field-glyph {
  font-size: 15px;
}

/* 16px is not a style choice: iOS zooms the whole page when a focused input
   renders below it (same rule as commit 4ed0905). */
.rn-wz__input {
  width: 100%;
  min-width: 0;
  height: 48px;
  padding: 0 12px;
  border: 1px solid rgba(0, 0, 0, .12);
  border-radius: 12px;
  background: #fff;
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, .87);
  box-sizing: border-box;
}

.rn-wz__input:focus {
  outline: none;
  border-color: #288bd5;
  box-shadow: 0 0 0 3px rgba(40, 139, 213, .12);
}

/* Safari gives `input[type=time]` an intrinsic width and centres its text;
   both have to be overridden or the two fields stop sharing the row evenly. */
.rn-wz__input--time {
  -webkit-appearance: none;
  appearance: none;
  text-align: left;
}

.rn-wz__error {
  margin: -4px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #d32f2f;
}

/* ---- activity chips ---- */

.rn-wz__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rn-wz__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(0, 0, 0, .12);
  border-radius: 19px;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, .75);
  cursor: pointer;
}

.rn-wz__chip--on {
  border-color: #288bd5;
  background: rgba(40, 139, 213, .1);
  color: #1f6fab;
}

.rn-wz__chip-glyph {
  font-size: 17px;
}

.rn-wz__chip-text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.rn-wz__chip-tick {
  font-size: 15px;
}

/* ---- cards ---- */

.rn-wz__card {
  min-width: 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .06), 0 8px 18px -12px rgba(0, 0, 0, .12);
}

.rn-wz__card--point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.rn-wz__point-glyph {
  flex: 0 0 auto;
  font-size: 30px;
}

.rn-wz__point-text {
  min-width: 0;
}

.rn-wz__card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.rn-wz__card-body {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(0, 0, 0, .6);
}

/* Rows, not a <table>: the old summary was a borderless table whose three
   columns could not wrap, so a long activity name pushed the minutes off the
   card on a phone. */
.rn-wz__rows {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.rn-wz__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-top: 1px solid rgba(0, 0, 0, .06);
  font-size: 13px;
}

.rn-wz__row-glyph {
  flex: 0 0 auto;
  font-size: 17px;
  color: rgba(0, 0, 0, .45);
}

.rn-wz__row-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-weight: 600;
}

.rn-wz__row-time {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
  color: rgba(0, 0, 0, .6);
}

.rn-wz__row-mins {
  flex: 0 0 auto;
  min-width: 52px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: rgba(0, 0, 0, .45);
}

.rn-wz__empty {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(0, 0, 0, .45);
}

/* ---- notes (what the flat full-bleed v-alert bars were) ---- */

.rn-wz__note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.45;
}

.rn-wz__inner > .rn-wz__note {
  margin: 0;
}

.rn-wz__note-glyph {
  flex: 0 0 auto;
  font-size: 17px;
}

.rn-wz__note--info {
  background: rgba(40, 139, 213, .1);
  color: #1f6fab;
}

.rn-wz__note--ok {
  background: rgba(76, 175, 80, .12);
  color: #2e7d32;
}

.rn-wz__note--warn {
  background: rgba(255, 152, 0, .14);
  color: #a35b00;
}

/* ---- review clocks ---- */

.rn-wz__clocks {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.rn-wz--tablet .rn-wz__clocks,
.rn-wz--desktop .rn-wz__clocks {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.rn-wz__clock {
  text-align: center;
}

.rn-wz__dial {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 8px auto 4px;
}

.rn-wz__facts {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 0;
}

.rn-wz__fact dt {
  font-size: 11px;
  font-weight: 600;
  color: rgba(0, 0, 0, .45);
}

.rn-wz__fact dd {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.rn-wz__fineprint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .45);
}

/* ---- footer ---- */

/* Sticky, so Next is in the same place on every step and within thumb reach;
   the old buttons sat at the end of each step's content, which on the review
   step meant scrolling past two clocks and two lists to find "Complete Setup". */
.rn-wz__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex: 0 0 auto;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(0, 0, 0, .06);
  background: #fff;
}

.rn-wz__btn {
  height: 46px;
  padding: 0 22px;
  border: 0;
  border-radius: 23px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.rn-wz__btn--ghost {
  background: transparent;
  color: rgba(0, 0, 0, .6);
}

.rn-wz__btn--go {
  flex: 1 1 auto;
  max-width: 260px;
  background: #288bd5;
  color: #fff;
}

.rn-wz__btn--go:disabled {
  background: rgba(0, 0, 0, .12);
  color: rgba(0, 0, 0, .35);
  cursor: default;
}

/*
  The bars stay full-bleed white, but their CONTENTS line up with the centred
  content column — otherwise on a 1440px screen the title sits against the far
  left edge and Next against the far right, with the fields they belong to
  stranded in a 720px column in the middle. The gutter is whatever is left
  either side of that column, never less than the 16px the phone uses.
*/
.rn-wz--tablet .rn-wz__top,
.rn-wz--tablet .rn-wz__foot {
  padding-left: max(16px, calc((100% - 560px) / 2));
  padding-right: max(16px, calc((100% - 560px) / 2));
}

.rn-wz--desktop .rn-wz__top,
.rn-wz--desktop .rn-wz__foot {
  padding-left: max(16px, calc((100% - 720px) / 2));
  padding-right: max(16px, calc((100% - 720px) / 2));
}

/* The back chevron hangs in that gutter rather than pushing the title in, so
   the title stays on the column's left edge whether or not it is there. */
.rn-wz--tablet .rn-wz__top-back,
.rn-wz--desktop .rn-wz__top-back {
  margin-left: -44px;
}
</style>
