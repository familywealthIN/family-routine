<template>
    <container-box :isLoading="$apollo.queries.routines.loading">
      <atom-card class="image-card">
        <atom-card-title class="grey lighten-4">
          <atom-icon
            :color="'indigo'"
            class="mr-5"
            size="64"
            name="history"
          />
          <atom-layout column align-start>
            <div class="caption grey--text text-uppercase">Routine Efficiency</div>
            <div>
              <span class="display-2 font-weight-black" v-text="avg || '—'"></span>
              <strong v-if="avg">%</strong>
            </div>
          </atom-layout>

          <atom-spacer></atom-spacer>

          <atom-button icon class="align-self-start" size="28">
            <atom-icon>mdi-arrow-right-thick</atom-icon>
          </atom-button>
        </atom-card-title>

        <atom-sheet class="grey lighten-4 pb-4">
          <atom-sparkline
            :key="String(avg)"
            :smooth="16"
            :gradient="['#f72047', '#ffd200', '#1feaea']"
            :line-width="3"
            :value="graphArray || []"
            auto-draw
            stroke-linecap="round"
          ></atom-sparkline>
        </atom-sheet>

        <atom-card-text class="image-card-page">
          <user-history :routines="routines" />
        </atom-card-text>
      </atom-card>
    </container-box>
</template>

<script>
import gql from 'graphql-tag';

import UserHistory from '@routine-notes/ui/organisms/UserHistory/UserHistory.vue';
import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import {
  AtomButton,
  AtomCard,
  AtomCardText,
  AtomCardTitle,
  AtomIcon,
  AtomLayout,
  AtomSheet,
  AtomSpacer,
  AtomSparkline,
} from '@routine-notes/ui/atoms';

export default {
  components: {
    UserHistory,
    ContainerBox,
    AtomButton,
    AtomCard,
    AtomCardText,
    AtomCardTitle,
    AtomIcon,
    AtomLayout,
    AtomSheet,
    AtomSpacer,
    AtomSparkline,
  },
  apollo: {
    routines: {
      query: gql`
        query routines {
          routines {
            id
            date
            tasklist {
              name
              time
              points
              ticked
              passed
              stimuli {
                name
                earned
              }
            }
          }
        }
      `,
    },
  },
  data() {
    return {
      routines: [],
      graphArray: [],
    };
  },
  computed: {
    avg() {
      const sum = this.routines.reduce((acc, cur) => acc + this.countTotal(cur.tasklist), 0);
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      this.graphArray = this.routines.map((routine) => this.countTotal(routine.tasklist));
      const { length } = this.routines;

      if (!sum && !length) return 0;

      return Math.ceil(sum / length);
    },
  },
  methods: {
    countTotal(tasklist) {
      return tasklist.reduce((total, num) => {
        if (num.ticked) {
          return total + num.points;
        }
        return total;
      }, 0);
    },
  },
};
</script>

<style scoped>
</style>
