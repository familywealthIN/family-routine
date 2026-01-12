<template>
  <v-list class="pa-0">
    <v-list-group
      v-if="groupedAreas.length"
      prepend-icon="dashboard"
      :value="false"
    >
      <template v-slot:activator>
        <v-list-tile-title class="subheader">Areas</v-list-tile-title>
      </template>

      <!-- For areas with sub-areas (has second colon) -->
      <template v-for="group in groupedAreas">
        <v-list-group
          v-if="group.subAreas.length"
          :key="group.mainArea"
          no-action
          sub-group
        >
          <template v-slot:activator>
            <v-list-tile class="submenu-parent">
              <v-list-tile-avatar>
                <v-icon>{{ getAreaIcon(group.mainArea) }}</v-icon>
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title>{{ formatMainAreaName(group.mainArea) }}</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
          </template>

          <v-list-tile
            v-for="subArea in group.subAreas"
            :key="subArea.tag"
            :to="{ name: 'areas', params: { tag: subArea.tag }}"
          >
            <v-list-tile-avatar>
              <v-icon small>subdirectory_arrow_right</v-icon>
            </v-list-tile-avatar>
            <v-list-tile-content>
              <v-list-tile-title>{{ subArea.name }}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </v-list-group>

        <!-- For areas without sub-areas (no second colon) -->
        <v-list-tile
          v-else
          :key="group.mainArea"
          :to="{ name: 'areas', params: { tag: group.tag }}"
        >
          <v-list-tile-avatar>
            <v-icon>{{ getAreaIcon(group.mainArea) }}</v-icon>
          </v-list-tile-avatar>
          <v-list-tile-content>
            <v-list-tile-title>{{ formatMainAreaName(group.mainArea) }}</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </template>
    </v-list-group>
  </v-list>
</template>

<script>
import gql from 'graphql-tag';

export default {
  name: 'AreaSidebar',
  data() {
    return {
      areaTags: [],
      areaIcons: {
        health: 'favorite',
        work: 'work',
        personal: 'person',
        finance: 'attach_money',
        learning: 'school',
        fitness: 'fitness_center',
        family: 'family_restroom',
        social: 'people',
        creative: 'palette',
        spiritual: 'self_improvement',
        home: 'home',
        career: 'trending_up',
      },
    };
  },
  apollo: {
    areaTags: {
      query: gql`
        query areaTags {
          areaTags
        }
      `,
    },
  },
  computed: {
    groupedAreas() {
      const groups = new Map();

      (this.areaTags || []).forEach((tag) => {
        // Remove 'area:' prefix
        const withoutPrefix = tag.replace(/^area:/, '');
        const parts = withoutPrefix.split(':');

        if (parts.length >= 2) {
          // Has sub-area (e.g., area:health:fitness)
          const mainArea = parts[0];
          const subAreaName = parts.slice(1).join(' ');

          if (!groups.has(mainArea)) {
            groups.set(mainArea, {
              mainArea,
              tag: null,
              subAreas: [],
            });
          }

          groups.get(mainArea).subAreas.push({
            name: this.capitalizeWords(subAreaName),
            tag,
          });
        } else if (!groups.has(parts[0])) {
          // No sub-area (e.g., area:health)
          groups.set(parts[0], {
            mainArea: parts[0],
            tag,
            subAreas: [],
          });
        } else if (groups.get(parts[0]).tag === null) {
          groups.get(parts[0]).tag = tag;
        }
      });

      return Array.from(groups.values()).sort((a, b) => a.mainArea.localeCompare(b.mainArea));
    },
  },
  methods: {
    formatMainAreaName(area) {
      return this.capitalizeWords(area);
    },

    capitalizeWords(str) {
      const csuiteTitles = ['ceo', 'cto', 'cio', 'cfo', 'cxo', 'cmo', 'coo'];
      return str
        .split(' ')
        .map((word) => {
          const lowerWord = word.toLowerCase();
          return csuiteTitles.includes(lowerWord) ? lowerWord.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
    },

    getAreaIcon(area) {
      return this.areaIcons[area.toLowerCase()] || 'widgets';
    },
  },
};
</script>
<style>
.v-list__group__header  {
  min-height: 40px;
}
.v-list__group__header .v-list__group__header__prepend-icon {
  color: var(--v-primary-base);
  min-width: 70px;
}

.v-list__group__header--sub-group > .v-list__group__header__prepend-icon {
  display: none;
}
.subheader {
  font-size: 14px;
  font-weight: bold;
  color: rgba(0, 0, 0, 0.54) !important;
}

/* Sub-group styling */
.v-list__group--sub-group {
  padding-left: 0;
}

.v-list__group--sub-group .v-list__group__header {
  padding-left: 16px;
}

.v-list__group--sub-group .v-list__tile {
  padding-left: 72px;
}

.v-list__group--sub-group .v-list__tile .v-list__tile__avatar {
  min-width: 40px;
}

/* Ensure icons are properly aligned */
.v-list__tile__avatar {
  min-width: 56px;
}

/* Sub-area items */
.v-list__group--sub-group > .v-list__group__items > .v-list__tile {
  height: 40px;
}

.v-list__group--sub-group > .v-list__group__items > .v-list__tile .v-icon {
  font-size: 18px;
}
.submenu-parent {
  margin-left: 16px;
}
</style>
