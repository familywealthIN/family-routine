<template>
  <div class="search-page pa-3">
    <!-- Search Input -->
    <div class="search-input-wrapper">
      <v-text-field
        ref="searchInput"
        v-model="searchQuery"
        label="Search goals..."
        prepend-inner-icon="search"
        clearable
        solo
        flat
        background-color="grey lighten-4"
        hide-details
        class="search-input"
        @keyup.enter="executeSearch"
        @click:clear="clearSearch"
      />
    </div>

    <!-- Filters -->
    <div class="search-filters">
      <v-autocomplete
        v-model="selectedRoutine"
        :items="routineItems"
        item-text="name"
        item-value="id"
        label="Routine"
        clearable
        solo
        flat
        dense
        background-color="grey lighten-4"
        hide-details
        class="filter-field"
        @change="onRoutineFilterChange"
      />
      <v-combobox
        v-model="selectedTags"
        :items="availableTags"
        label="Tags"
        clearable
        solo
        flat
        dense
        background-color="grey lighten-4"
        hide-details
        class="filter-field"
        @change="onTagsFilterChange"
      />
    </div>

    <!-- Results -->
    <SearchResults
      :results="results"
      :isLoading="isLoading"
      :query="executedQuery"
      @select-result="openGoalDetail"
    />

    <!-- Goal Creation Fullscreen Dialog -->
    <v-dialog
      v-model="goalDisplayDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar color="white">
          <v-spacer></v-spacer>
          <v-btn icon @click="goalDisplayDialog = false">
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card class="no-shadow">
          <v-card-text class="pa-0">
            <goal-creation
              :newGoalItem="selectedGoalItem"
              v-on:add-update-goal-entry="onGoalUpdated"
            />
          </v-card-text>
        </v-card>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import moment from 'moment';
import { useSearchGoals } from '@/composables/useGoalQueries';
import { ROUTINE_DATE_QUERY } from '@/composables/graphql/queries';
import { USER_TAGS } from '@/constants/settings';
import getJSON from '@/utils/getJSON';
import SearchResults from '@routine-notes/ui/organisms/SearchResults/SearchResults.vue';
import GoalCreation from '@/containers/GoalCreationContainer.vue';

export default {
  name: 'SearchTime',
  components: {
    SearchResults,
    GoalCreation,
  },
  data() {
    return {
      searchQuery: '',
      executedQuery: '',
      results: [],
      isLoading: false,
      error: null,
      goalDisplayDialog: false,
      selectedGoalItem: {
        body: '',
        contribution: '',
        date: '',
        period: '',
        taskRef: '',
        goalRef: '',
        tags: [],
        status: '',
        deadline: '',
        reward: '',
      },
      searchComposable: null,
      selectedRoutine: null,
      selectedTags: null,
      availableTags: [],
    };
  },
  apollo: {
    routineData: {
      query: ROUTINE_DATE_QUERY,
      variables() {
        return {
          date: moment().format('DD-MM-YYYY'),
        };
      },
      update(data) {
        return data.routineDate || {};
      },
      skip() {
        return !this.$root.$data.email;
      },
    },
  },
  computed: {
    routineItems() {
      if (this.routineData && this.routineData.tasklist) {
        return this.routineData.tasklist;
      }
      return [];
    },
  },
  watch: {
    '$route.query.q': {
      immediate: true,
      handler(q) {
        if (q && q !== this.searchQuery) {
          this.searchQuery = q;
          this.$nextTick(() => this.executeSearch());
        }
      },
    },
    searchQuery(val) {
      // The results — and the empty state that names them — belong to the
      // executed query. Drop both as soon as the input diverges so the
      // message can never name the previous term.
      if (this.executedQuery && (val || '').trim() !== this.executedQuery) {
        this.executedQuery = '';
        this.results = [];
      }
    },
  },
  created() {
    this.searchComposable = useSearchGoals(this.$apollo);
    this.availableTags = getJSON(localStorage.getItem(USER_TAGS), []);
    // Initialize filters from URL — only an explicit deep link scopes the
    // search, /search on its own opens unscoped
    if (this.$route.query.taskRef) {
      this.selectedRoutine = this.$route.query.taskRef;
    }
    if (this.$route.query.tags) {
      this.selectedTags = this.$route.query.tags;
    }
  },
  mounted() {
    // Auto-focus search input
    this.$nextTick(() => {
      if (this.$refs.searchInput) {
        this.$refs.searchInput.focus();
      }
    });
  },
  methods: {
    async executeSearch() {
      const query = this.searchQuery?.trim();
      if (!query || query.length < 2) return;

      this.executedQuery = query;
      this.isLoading = true;
      this.syncRouteQuery();

      const options = {};
      if (this.selectedRoutine) {
        options.taskRef = this.selectedRoutine;
      }
      if (this.selectedTags) {
        options.tags = this.selectedTags;
      }

      try {
        const flatResults = await this.searchComposable.searchGoals(query, options);
        this.results = flatResults;
      } catch (err) {
        this.error = err;
        this.results = [];
        console.error('Search error:', err);
      } finally {
        this.isLoading = false;
      }
    },
    // The inputs own the search state; the URL only mirrors it. Rebuilding
    // the query from the live values — rather than spreading $route.query —
    // keeps a filter the user has just cleared from being restored out of a
    // stale snapshot.
    syncRouteQuery() {
      const query = {};
      if (this.executedQuery) {
        query.q = this.executedQuery;
      }
      if (this.selectedRoutine) {
        query.taskRef = this.selectedRoutine;
      }
      if (this.selectedTags) {
        query.tags = this.selectedTags;
      }
      this.$router.replace({ query }).catch(() => {});
    },
    clearSearch() {
      this.searchQuery = '';
      this.executedQuery = '';
      this.results = [];
      if (this.searchComposable) {
        this.searchComposable.clearResults();
      }
      this.syncRouteQuery();
    },
    openGoalDetail(item) {
      this.selectedGoalItem = {
        id: item.id,
        body: item.body || '',
        contribution: item.contribution || '',
        date: item.date || '',
        period: item.period || 'day',
        taskRef: item.taskRef || '',
        goalRef: item.goalRef || '',
        routineName: (item.routine && item.routine.name) || '',
        originalDate: item.originalDate || '',
        tags: item.tags || [],
        status: item.status || 'todo',
        deadline: item.deadline || '',
        reward: item.reward || '',
        isComplete: item.isComplete || false,
        isMilestone: item.isMilestone || false,
        subTasks: item.subTasks || [],
      };
      this.goalDisplayDialog = true;
    },
    onGoalUpdated() {
      this.goalDisplayDialog = false;
      // Reset to default empty object for proper watcher transition on next open
      this.selectedGoalItem = {
        body: '',
        contribution: '',
        date: '',
        period: '',
        taskRef: '',
        goalRef: '',
        tags: [],
        status: '',
        deadline: '',
        reward: '',
      };
      // Re-execute search to refresh results
      if (this.executedQuery) {
        this.executeSearch();
      }
    },
    onRoutineFilterChange(value) {
      this.selectedRoutine = value || null;
      if (this.executedQuery) {
        this.executeSearch();
      } else {
        this.syncRouteQuery();
      }
    },
    onTagsFilterChange(value) {
      this.selectedTags = value || null;
      if (this.executedQuery) {
        this.executeSearch();
      } else {
        this.syncRouteQuery();
      }
    },
  },
};
</script>

<style scoped>
.search-page {
  max-width: 800px;
  margin: 0 auto;
}

.search-input-wrapper {
  max-width: 720px;
  margin: 0 auto 8px;
}

.search-input {
  border-radius: 12px;
}

.search-filters {
  max-width: 720px;
  margin: 0 auto 16px;
  display: flex;
  gap: 12px;
}

.filter-field {
  flex: 1;
  border-radius: 8px;
}

.no-shadow {
  box-shadow: none !important;
}

@media (max-width: 600px) {
  .search-page {
    padding: 8px !important;
  }
  .search-filters {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
