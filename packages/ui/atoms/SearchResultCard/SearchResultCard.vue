<template>
  <div
    class="search-result-item"
    :class="{ 'search-result-item--completed': isCompleted }"
    @click="$emit('click', result)"
  >
    <div class="search-result-body">
      <!-- Title -->
      <div class="search-result-title" :class="{ 'completed-text': isCompleted }">
        {{ result.body }}
      </div>

      <!-- Description (truncated contribution) -->
      <div v-if="truncatedContribution" class="search-result-description">
        {{ truncatedContribution }}
      </div>
    </div>

    <!-- Footer: routine · period · date · status -->
    <div class="search-result-footer">
      <span v-if="result.routine" class="routine-name">
        {{ result.routine.name }}
      </span>
      <span v-if="result.routine" class="footer-separator">&middot;</span>
      <span class="period-label">{{ formattedPeriod }}</span>
      <span class="footer-separator">&middot;</span>
      <span>{{ result.date }}</span>
      <TaskStatusTag
        v-if="result.status"
        :status="result.status"
        :showStatus="true"
        class="ml-2"
      />
    </div>

    <v-divider />
  </div>
</template>

<script>
import { TaskStatusTag } from '../../atoms';

export default {
  name: 'SearchResultCard',
  components: {
    TaskStatusTag,
  },
  props: {
    result: {
      type: Object,
      required: true,
    },
  },
  computed: {
    isCompleted() {
      return this.result.status === 'done' || this.result.isComplete;
    },
    truncatedContribution() {
      if (!this.result.contribution) return '';
      // Strip markdown formatting for preview
      const stripped = this.result.contribution
        .replace(/#{1,6}\s?/g, '')
        .replace(/[*_~`]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n+/g, ' ')
        .trim();
      return stripped.length > 150 ? `${stripped.substring(0, 150)}...` : stripped;
    },
    formattedPeriod() {
      const { period } = this.result;
      if (!period) return '';
      return period.charAt(0).toUpperCase() + period.slice(1);
    },
  },
};
</script>

<style scoped>
.search-result-item {
  cursor: pointer;
  transition: background 0.15s ease;
  padding: 14px 16px 0;
}

.search-result-item:hover {
  background: #f5f5f5;
}

.search-result-item--completed {
  opacity: 0.7;
}

.search-result-body {
  margin-bottom: 8px;
}

.search-result-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  line-height: 1.4;
}

.completed-text {
  text-decoration: line-through;
  color: #999;
}

.search-result-description {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  max-height: 2.8em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.search-result-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #888;
  padding-bottom: 12px;
}

.routine-name {
  color: #009688;
  font-weight: 500;
}

.footer-separator {
  color: #ccc;
}

.period-label {
  text-transform: capitalize;
}

@media (max-width: 600px) {
  .search-result-item {
    padding: 12px 12px 0;
  }

  .search-result-title {
    font-size: 14px;
  }
}
</style>
