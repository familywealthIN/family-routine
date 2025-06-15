<template>
  <v-list>
    <v-list-group
      v-if="filteredProjectTags.length"
      prepend-icon="folder_shared"
      value="true"
    >
      <template v-slot:activator>
        <v-list-tile-title class="subheader">Projects</v-list-tile-title>
      </template>

      <v-list-tile
        v-for="tag in filteredProjectTags"
        :key="tag"
        :to="{ name: 'projects', params: { tag }}"
      >
        <v-list-tile-avatar>
          <v-icon>folder_open</v-icon>
        </v-list-tile-avatar>
        <v-list-tile-content>
          <v-list-tile-title>{{ formatProjectName(tag) }}</v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list-group>
  </v-list>
</template>

<script>
import gql from 'graphql-tag';

export default {
  name: 'ProjectSidebar',
  data() {
    return {
      projectTags: [],
    };
  },
  apollo: {
    projectTags: {
      query: gql`
        query projectTags {
          projectTags
        }
      `,
    },
  },
  computed: {
    filteredProjectTags() {
      return this.projectTags || [];
    },
  },
  methods: {
    formatProjectName(tag) {
      return tag
        .replace(/^project:/, '')
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
