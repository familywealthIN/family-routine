<template>
    <span class="pt-2 streak-checks"
        style="display: flex;align-items: flex-start;justify-content: center;"
    >
        <template v-for="(node, index) in nodes">
          <span :key="`node-${node.date}`" class="streak-checks__node" :title="node.title">
            <AtomAvatar size="24">
              <AtomIcon :color="node.color" size="24">{{ iconFor(node, index) }}</AtomIcon>
            </AtomAvatar>
            <span class="caption streak-checks__label">{{ node.label }}</span>
          </span>
          <AtomDivider
            :key="`divider-${node.date}`"
            v-if="index !== nodes.length - 1"
            :divider-class="isLinkUnbroken(index)
              ? 'streak-checks__link--unbroken'
              : 'streak-checks__link--broken'"
          />
        </template>
    </span>
</template>

<script>
import moment from 'moment';
import { AtomAvatar, AtomDivider, AtomIcon } from '../../atoms';

// How each calendar day of the streak is drawn. Incomplete days were all green
// outlines, which read as "done" at a glance and hid the break entirely.
const STATUS_VISUALS = {
  complete: { icon: 'check_circle', color: 'green', title: 'completed' },
  missed: { icon: 'cancel', color: 'red', title: 'missed' },
  upcoming: { icon: 'radio_button_unchecked', color: 'grey', title: 'still to do' },
  none: { icon: 'remove', color: 'grey lighten-1', title: 'no milestone' },
};

export default {
  name: 'MoleculeStreakChecks',
  components: {
    AtomAvatar,
    AtomDivider,
    AtomIcon,
  },
  props: {
    /**
     * One entry per calendar day of the period, in calendar order, as published
     * by the server's `milestoneDays`: { date: 'DD-MM-YYYY', status }. A count
     * cannot be used here — it packs the wins to the left and makes a broken
     * week look unbroken.
     */
    days: {
      type: Array,
      default: () => [],
    },
    animate: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      animateComplete: false,
    };
  },
  computed: {
    nodes() {
      return (this.days || []).map((day) => {
        const visual = STATUS_VISUALS[day.status] || STATUS_VISUALS.none;
        const date = moment(day.date, 'DD-MM-YYYY');
        const label = date.isValid() ? date.format('dd D') : day.date;

        return {
          date: day.date,
          status: day.status || 'none',
          icon: visual.icon,
          color: visual.color,
          label,
          title: `${date.isValid() ? date.format('ddd D MMM YYYY') : day.date} — ${visual.title}`,
        };
      });
    },
    /** The newest win, the one the animation belongs to. */
    latestCompleteIndex() {
      return this.nodes.map((node) => node.status).lastIndexOf('complete');
    },
  },
  mounted() {
    if (this.animate) {
      setTimeout(() => {
        this.animateComplete = true;
      }, 500);
    }
  },
  methods: {
    iconFor(node, index) {
      if (this.animate && !this.animateComplete && index === this.latestCompleteIndex) {
        return 'check_circle_outline';
      }
      return node.icon;
    },
    /** A connector is only unbroken when the days it joins were both completed. */
    isLinkUnbroken(index) {
      return this.nodes[index].status === 'complete'
        && this.nodes[index + 1].status === 'complete';
    },
  },
};
</script>

<style scoped>
  .streak-checks__node {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .streak-checks__label {
    line-height: 1.2;
    white-space: nowrap;
  }

  .theme--light.v-divider {
    z-index: 1;
    margin-top: 11px;
    margin-left: -1px;
    margin-right: -2px;
  }

  .theme--light.v-divider.streak-checks__link--unbroken {
    border: 1px solid #4caf50;
  }

  .theme--light.v-divider.streak-checks__link--broken {
    border: 1px dashed #bdbdbd;
  }
</style>
