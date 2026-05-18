<template>
  <div class="search-results">
    <!-- Loading -->
    <div v-if="isLoading" class="text-xs-center pa-4">
      <v-progress-circular indeterminate color="primary" />
      <div class="mt-2 grey--text">Searching goals...</div>
    </div>

    <!-- Empty state: no query -->
    <div v-else-if="!query" class="text-xs-center pa-4">
      <v-icon size="64" color="grey lighten-1">search</v-icon>
      <div class="mt-2 grey--text text--darken-1">
        Enter a search term to find your goals
      </div>
      <div class="grey--text caption mt-1">
        Searches in goal titles and contributions
      </div>
    </div>

    <!-- Empty state: no results -->
    <div v-else-if="results.length === 0" class="text-xs-center pa-4">
      <v-icon size="64" color="grey lighten-1">search_off</v-icon>
      <div class="mt-2 grey--text text--darken-1">
        No results found for "<strong>{{ query }}</strong>"
      </div>
      <div class="grey--text caption mt-1">
        Try different keywords or check your spelling
      </div>
    </div>

    <!-- Results list -->
    <div v-else>
      <div class="results-count grey--text caption mb-2 px-1">
        {{ results.length }} result{{ results.length !== 1 ? 's' : '' }} found
      </div>
      <div>
        <SearchResultCard
          v-for="item in results"
          :key="item.id"
          :result="item"
          @click="$emit('select-result', item)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import SearchResultCard from '../../atoms/SearchResultCard/SearchResultCard.vue';

export default {
  name: 'OrganismSearchResults',
  components: {
    SearchResultCard,
  },
  props: {
    results: {
      type: Array,
      default: () => [],
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
    query: {
      type: String,
      default: '',
    },
  },
};
</script>

<style scoped>
.search-results {
  max-width: 720px;
  margin: 0 auto;
}

.results-count {
  font-size: 13px;
}
</style>
