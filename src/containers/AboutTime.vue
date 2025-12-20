<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box>
    <v-card-text>
      <h2>About Routine Notes</h2>
      <p>
        Routine Notes is a comprehensive productivity and habit-tracking application designed to help individuals and families
        build sustainable daily routines, achieve meaningful goals, and track their progress over time. Our platform combines
        time-based routine management with goal-setting capabilities to create a holistic approach to personal development.
      </p>

      <h2>Daily Routines</h2>
      <p>
        Our routine system is built around time-sensitive activities that encourage punctuality and consistency. Each routine
        item becomes available for completion when you're close to its scheduled time, promoting timely execution of your daily
        tasks. This innovative approach helps you build better time management habits by:
      </p>
      <ul>
        <li>Enabling routine items only when their scheduled time approaches</li>
        <li>Encouraging early completion to maximize efficiency points</li>
        <li>Automatically disabling missed routines after 30 minutes to maintain accountability</li>
        <li>Tracking punctuality and providing performance insights</li>
      </ul>

      <h2>Goal Management</h2>
      <p>
        Set and track goals across multiple time horizons - daily, weekly, monthly, yearly, and lifetime objectives.
        Our intelligent goal system allows you to:
      </p>
      <ul>
        <li><strong>Create hierarchical milestones:</strong> Break down larger goals into smaller, achievable steps</li>
        <li><strong>Convert goals to milestones:</strong> Transform daily goals into weekly milestones, weekly into monthly, and so on</li>
        <li><strong>Link goals to routines:</strong> Connect your objectives with daily habits for consistent progress</li>
        <li><strong>Track progress analytics:</strong> Monitor your efficiency and success rates over time</li>
        <li><strong>Build sustainable habits:</strong> Create lasting change through structured, measurable actions</li>
      </ul>

      <h2>Key Features</h2>
      <ul>
        <li><strong>Smart Time Management:</strong> Time-based routine activation for optimal scheduling</li>
        <li><strong>Progress Tracking:</strong> Detailed analytics and efficiency scoring</li>
        <li><strong>Flexible Goal Setting:</strong> Multi-timeframe goal creation with milestone conversion</li>
        <li><strong>Family-Friendly:</strong> Designed for individual or family use</li>
        <li><strong>Data Security:</strong> Advanced encryption to protect your personal information</li>
        <li><strong>Cross-Platform:</strong> Accessible on desktop and mobile devices</li>
      </ul>

      <h2>Getting Started</h2>
      <p>
        Begin by setting up your daily routines with specific times, then create goals that align with your personal or family
        objectives. Link your routines to your goals where applicable, and start building the habits that will lead to lasting
        success. Monitor your progress through our analytics dashboard and adjust your approach as needed.
      </p>
    </v-card-text>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import ContainerBox from '../components/ContainerBox.vue';

export default {
  components: { ContainerBox },
  apollo: {
    routineItems: gql`
      query routineItems {
        routineItems {
          id
          name
          time
          points
          ticked
          passed
        }
      }
    `,
  },
  data() {
    return {};
  },
};
</script>

<style>
.elevation-1 {
  width: 100%;
}

.v-card__text h2 {
  color: var(--v-primary-base);
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
}

.v-card__text h2:first-child {
  margin-top: 0;
}

.v-card__text p {
  margin-bottom: 16px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.87);
}

.v-card__text ul {
  margin-bottom: 16px;
  padding-left: 24px;
}

.v-card__text ul li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.v-card__text ul li strong {
  color: var(--v-primary-base);
  font-weight: 600;
}
</style>
