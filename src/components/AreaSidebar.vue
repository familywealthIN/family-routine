<template>
  <v-list>
    <v-list-group
      v-if="filteredAreaTags.length"
      prepend-icon="dashboard"
      :value="false"
    >
      <template v-slot:activator>
        <v-list-tile-title class="subheader">Areas</v-list-tile-title>
      </template>

      <v-list-tile
        v-for="tag in filteredAreaTags"
        :key="tag"
        :to="{ name: 'areas', params: { tag }}"
      >
        <v-list-tile-avatar>
          <v-icon>widgets</v-icon>
        </v-list-tile-avatar>
        <v-list-tile-content>
          <v-list-tile-title>{{ formatAreaName(tag) }}</v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
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
    filteredAreaTags() {
      return this.areaTags || [];
    },
  },
  methods: {
    formatAreaName(tag) {
      return tag
        .replace(/^area:/, '')
        .split(':')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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
.subheader {
  font-size: 14px;
  font-weight: bold;
  color: rgba(0, 0, 0, 0.54) !important;
}
</style>
