<template>
  <v-card>
    <v-list subheader style="width:100%" v-if="routines.length">
      <v-subheader>History</v-subheader>
      <v-list-group
        v-for="routine in routines"
        :key="routine.date"
        v-model="routine.active"
        no-action
      >
        <template v-slot:activator>
          <v-list-tile>
            <v-list-tile-action>
              <v-progress-circular
                rotate="-90"
                :value="countTotal(routine.tasklist)"
                color="primary"
              >{{countTotal(routine.tasklist)}}</v-progress-circular>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>{{ routine.date }}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </template>

        <v-list-tile
          v-for="task in routine.tasklist"
          :key="task.id"
          @click="console.log('details click')"
        >
          <v-list-tile-action>
            <v-avatar size="24" :color="getButtonColor(task)">
              <v-icon color="white" size="16">{{getButtonIcon(task)}}</v-icon>
            </v-avatar>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>{{ task.name }}</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list-group>
    </v-list>
    <div v-else class="text-xs-center pt-3 pb-3">
      We do not have history of routine, check back later.
    </div>
  </v-card>
</template>

<script>

export default {
  props: ['routines'],
  methods: {
    countTotal(tasklist) {
      return tasklist.reduce((total, num) => {
        if (num.ticked) {
          return total + num.points;
        }
        return total;
      }, 0);
    },
    getButtonIcon(task) {
      if (task.ticked) {
        return 'check';
      } if (task.passed && !task.ticked) {
        return 'close';
      } if (!task.passed && !task.ticked && !task.wait) {
        return 'alarm';
      }
      return 'more_horiz';
    },
    getButtonColor(task) {
      if (task.ticked) {
        return 'success';
      } if ((task.passed && !task.ticked)) {
        return 'error';
      } if (!task.passed && !task.ticked && !task.wait) {
        return 'warning';
      }
      return 'grey';
    },
  },
};
</script>
