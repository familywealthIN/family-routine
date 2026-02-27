<template>
  <AtomCard>
    <AtomList subheader style="width:100%" v-if="routines.length">
      <v-subheader>History</v-subheader>
      <AtomListGroup
        v-for="routine in routines"
        :key="routine.date"
        v-model="routine.active"
        no-action
      >
        <template v-slot:activator>
          <AtomListTile>
            <AtomListTileAction>
              <AtomProgressCircular
                rotate="-90"
                :value="countTotal(routine.tasklist)"
                color="primary"
              >{{countTotal(routine.tasklist)}}</AtomProgressCircular>
            </AtomListTileAction>
            <AtomListTileContent>
              <AtomListTileTitle>{{ routine.date }}</AtomListTileTitle>
            </AtomListTileContent>
          </AtomListTile>
        </template>

        <AtomListTile
          v-for="task in routine.tasklist"
          :key="task.id"
          @click="console.log('details click')"
        >
          <AtomListTileAction>
            <v-avatar size="24" :color="getButtonColor(task)">
              <AtomIcon color="white" size="16">{{getButtonIcon(task)}}</AtomIcon>
            </v-avatar>
          </AtomListTileAction>
          <AtomListTileContent>
            <AtomListTileTitle>{{ task.name }}</AtomListTileTitle>
          </AtomListTileContent>
        </AtomListTile>
      </AtomListGroup>
    </AtomList>
    <div v-else class="text-xs-center pt-3 pb-3">
      We do not have history of routine, check back later.
    </div>
  </AtomCard>
</template>

<script>
import {
  AtomCard,
  AtomIcon,
  AtomList,
  AtomListGroup,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileTitle,
  AtomProgressCircular,
} from '../../atoms';

export default {
  name: 'OrganismFamilyUserHistory',

  components: {
    AtomCard,
    AtomIcon,
    AtomList,
    AtomListGroup,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileTitle,
    AtomProgressCircular,
  },

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
