<template>
  <container-box>
    <atom-card-text>
      <h2>About Routine Notes</h2>
      <p>
        Routine Notes is built on one belief: incremental daily achievement compounds into outcomes
        that seemed impossible. Instead of another backlog to tidy, it measures whether you actually
        <em>moved</em> today — across Discipline, Kinetics and Geniuses — and rolls your daily wins up
        into week, month and year outcomes automatically.
      </p>

      <h2>Main features</h2>
      <atom-tabs
        v-model="featureTab"
        grow
        show-arrows
        slider-color="primary"
        class="features-tabs"
      >
        <atom-tab v-for="feature in features" :key="feature.key">
          <v-icon small class="mr-2">{{ feature.icon }}</v-icon>
          {{ feature.label }}
        </atom-tab>
      </atom-tabs>

      <atom-tabs-items v-model="featureTab" class="features-items">
        <atom-tab-item v-for="feature in features" :key="feature.key">
          <div class="feature-panel">
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.lead }}</p>
            <ul>
              <li v-for="(point, index) in feature.points" :key="index">
                <template v-if="point.term"><strong>{{ point.term }}</strong> — </template>{{ point.text }}
              </li>
            </ul>
            <p v-if="feature.link" class="feature-link">
              <a :href="feature.link" target="_blank" rel="noopener noreferrer">{{ feature.linkLabel }} →</a>
            </p>
          </div>
        </atom-tab-item>
      </atom-tabs-items>

      <h2>Getting started</h2>
      <p>
        Set up your daily routines with honest start times — morning first, where Discipline is
        cheapest. Write one year goal and cascade it down to a day goal you can schedule, then link
        that day goal to a routine. Show up on time, earn your points, and watch the loop compound.
      </p>
    </atom-card-text>
  </container-box>
</template>

<script>
/* eslint-disable max-len */
import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import {
  AtomCardText,
  AtomTabs,
  AtomTab,
  AtomTabsItems,
  AtomTabItem,
} from '@routine-notes/ui/atoms';

export default {
  components: {
    ContainerBox,
    AtomCardText,
    AtomTabs,
    AtomTab,
    AtomTabsItems,
    AtomTabItem,
  },
  data() {
    return {
      featureTab: 0,
      features: [
        {
          key: 'routines',
          label: 'Routines',
          icon: 'schedule',
          title: 'Your day, time-boxed',
          lead: 'Routine Notes lays your day on a timeline, keeps score on punctuality, and never lets a missed check-in silently disappear.',
          points: [
            { term: 'Punctuality window', text: 'each routine opens a window around its start time — tick inside it and the check-in counts as on time.' },
            { term: 'Quick tasks', text: 'drop one-off work into the current routine slot, so improvised work still lands in a time box.' },
            { term: 'Past, not gone', text: 'miss the window and the routine moves to Past with a redeem button — check in late with points, streak intact.' },
            { term: 'Skip Day', text: 'pause the loop for travel or a sick day without wrecking your history.' },
          ],
        },
        {
          key: 'goals',
          label: 'Goals',
          icon: 'assignment',
          title: 'The year → day cascade',
          lead: 'Turn one yearly ambition into month, week and day milestones — then let your daily wins roll back up.',
          points: [
            { text: 'Break a year goal into month and week milestones, each decomposing into schedulable day goals.' },
            { term: 'Link days to routines', text: 'a day goal attached to a routine shows on the Dashboard card, so the plan and the timeline are the same object.' },
            { term: 'Wins roll up', text: 'five day wins complete a week, three weeks a month, nine months a year — you never mark a year done, you arrive at it.' },
            { text: 'A calendar view prints each day’s goal count, so gaps are visible before they become months.' },
          ],
        },
        {
          key: 'priority',
          label: 'Priority',
          icon: 'view_module',
          title: 'A self-sorting Do / Plan / Delegate / Automate matrix',
          lead: 'You never pick a quadrant. How and where you create a task decides it, so the matrix mirrors the shape of your day on its own.',
          points: [
            { term: 'Do', text: 'anything you start — or create — for today.' },
            { term: 'Plan', text: 'anything you schedule for a future day.' },
            { term: 'Delegate', text: '@mention a person in the task and it hands off.' },
            { term: 'Automate', text: 'kick a task off with an agent and it lands here.' },
            { text: 'Four scorecards read the shape of your day back at a glance — keep Do-now to three.' },
          ],
        },
        {
          key: 'agents',
          label: 'Agents',
          icon: 'smart_toy',
          title: 'Automation attached to routines',
          lead: 'An agent is a worker glued to a routine — start the task and it fires, work and it listens, finish and it reports success or failure.',
          points: [
            { text: 'Bind an agent to a routine; the routine’s schedule becomes the agent’s schedule.' },
            { term: 'Wire the events', text: 'point a start event (and optional end event) at any URL — your webhook, n8n flow, or own endpoint — with the goal id substituted in.' },
            { term: 'Auditable lifecycle', text: 'idle → listening → finished, with success and failure counts per agent.' },
            { text: 'Redeem a late check-in and its agents still fire — automation shouldn’t punish a late human.' },
          ],
        },
        {
          key: 'evolution',
          label: 'Evolution',
          icon: 'military_tech',
          title: 'The point system — a soldier taking the mountain',
          lead: 'Picture a soldier ordered to take an enemy-held mountain. Three things decide whether he makes it — and they are the three ways you earn points: 100 each, 300 a day.',
          points: [
            { term: 'Discipline', text: 'be present. The soldier has to show up on schedule; you earn it by ticking routines inside their punctuality window — and a discipline once established isn’t easily undone.' },
            { term: 'Kinetics', text: 'put in the work. Showing up isn’t enough — the soldier drills his shooting and dodging; you earn it by clearing the steps and quick tasks in every slot.' },
            { term: 'Geniuses', text: 'plan the campaign. The soldier needs smaller goals that uprank him to position; you earn it by planning week, month and year milestones and linking them to today.' },
            { text: 'Points settle overnight and fund your AI agents — show up daily and AI stays free.' },
          ],
          link: 'https://blog.familywealth.in/2022/01/point-system-of-family-routine.html',
          linkLabel: 'Read the full soldier analogy',
        },
      ],
    };
  },
};
</script>

<style scoped>
>>> .elevation-1 {
  width: 100%;
}

>>> .v-card__text h2 {
  color: var(--v-primary-base);
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
}

>>> .v-card__text h2:first-child {
  margin-top: 0;
}

>>> .v-card__text h3 {
  color: var(--v-primary-base);
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 1.15rem;
}

>>> .v-card__text p {
  margin-bottom: 16px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.87);
}

>>> .v-card__text ul {
  margin-bottom: 16px;
  padding-left: 24px;
}

>>> .v-card__text ul li {
  margin-bottom: 8px;
  line-height: 1.5;
}

>>> .v-card__text ul li strong {
  color: var(--v-primary-base);
  font-weight: 600;
}

.features-tabs {
  margin-bottom: 8px;
}

.feature-panel {
  padding-top: 24px;
}

.feature-link {
  margin-top: 4px;
}

.feature-link a {
  color: var(--v-primary-base);
  font-weight: 600;
  text-decoration: none;
}

.feature-link a:hover {
  text-decoration: underline;
}
</style>
