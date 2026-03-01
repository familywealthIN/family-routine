<template>
  <div class="goal-tags-input">
    <div class="goal-tags-container">
      <AtomChip
        v-for="tag in normalizedTags"
        :key="tag"
        small
        outline
        close
        class="goal-tag-chip"
        @input="removeTag(tag)"
      >
        <v-icon left small class="goal-tag-icon">tag</v-icon>
        <template v-if="tag.includes(':')">
          <span
            v-for="(segment, sIdx) in tag.split(':')"
            :key="sIdx"
            class="goal-tag-segment"
          >{{ segment }}</span>
        </template>
        <template v-else>{{ tag }}</template>
      </AtomChip>
      <div class="goal-tag-input-wrapper">
        <input
          ref="tagInput"
          v-model="inputValue"
          type="text"
          class="goal-tag-input"
          placeholder="Add tag..."
          @keydown="handleKeydown"
          @focus="inputFocused = true"
          @blur="onBlur"
        />
        <div v-if="showAutocomplete" class="goal-tag-autocomplete">
          <div
            v-for="suggestion in filteredSuggestions"
            :key="suggestion"
            class="goal-tag-autocomplete-item"
            :class="{ 'is-active': suggestion === activeSuggestion }"
            @mousedown.prevent="selectSuggestion(suggestion)"
          >
            {{ suggestion }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AtomChip from '../../atoms/Chip/Chip.vue';

export default {
  name: 'GoalTagsInput',
  components: {
    AtomChip,
  },
  props: {
    goalTags: {
      type: Array,
      default: () => [],
    },
    userTags: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      inputValue: '',
      inputFocused: false,
      activeSuggestionIndex: -1,
    };
  },
  computed: {
    normalizedTags() {
      if (!this.goalTags || !Array.isArray(this.goalTags)) return [];
      return this.goalTags;
    },
    filteredSuggestions() {
      if (!this.userTags || !Array.isArray(this.userTags)) return [];
      const query = this.inputValue.toLowerCase().trim();
      if (!query) return [];
      return this.userTags.filter(
        (t) => t
          && t.toLowerCase().includes(query)
          && !this.normalizedTags.includes(t),
      );
      
    },
    showAutocomplete() {
      return this.inputFocused && this.filteredSuggestions.length > 0;
    },
    activeSuggestion() {
      if (this.activeSuggestionIndex >= 0 && this.activeSuggestionIndex < this.filteredSuggestions.length) {
        return this.filteredSuggestions[this.activeSuggestionIndex];
      }
      return null;
    },
  },
  watch: {
    inputValue() {
      this.activeSuggestionIndex = -1;
    },
  },
  methods: {
    removeTag(tag) {
      const newTags = this.normalizedTags.filter((t) => t !== tag);
      this.$emit('update-new-tag-items', newTags);
    },
    addTag(tagText) {
      const trimmed = tagText.trim();
      if (!trimmed) return;
      if (this.normalizedTags.includes(trimmed)) return;
      const newTags = [...this.normalizedTags, trimmed];
      this.$emit('update-new-tag-items', newTags);
      this.inputValue = '';
      this.activeSuggestionIndex = -1;
    },
    selectSuggestion(suggestion) {
      this.addTag(suggestion);
      this.$nextTick(() => {
        if (this.$refs.tagInput) this.$refs.tagInput.focus();
      });
    },
    handleKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.activeSuggestion) {
          this.addTag(this.activeSuggestion);
        } else if (this.inputValue.trim()) {
          this.addTag(this.inputValue);
        }
      } else if (e.key === 'Backspace' && !this.inputValue && this.normalizedTags.length) {
        const lastTag = this.normalizedTags[this.normalizedTags.length - 1];
        this.removeTag(lastTag);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.filteredSuggestions.length) {
          this.activeSuggestionIndex = Math.min(
            this.activeSuggestionIndex + 1,
            this.filteredSuggestions.length - 1,
          );
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.filteredSuggestions.length) {
          this.activeSuggestionIndex = Math.max(this.activeSuggestionIndex - 1, -1);
        }
      } else if (e.key === 'Escape') {
        this.activeSuggestionIndex = -1;
        this.$refs.tagInput.blur();
      }
    },
    onBlur() {
      // Delay to allow mousedown on autocomplete items to fire first
      setTimeout(() => {
        this.inputFocused = false;
      }, 150);
    },
  },
};
</script>

<style>
/* Goal Tags Input Container */
.goal-tags-input {
  width: 100%;
  margin-bottom: 8px;
  padding: 4px 0;
}

.goal-tags-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 6px 0 6px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.42);
  position: relative;
}

.goal-tags-container::before {
  content: 'tag';
  font-family: 'Material Icons';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: rgba(0, 0, 0, 0.54);
}

.goal-tags-container:focus-within {
  border-bottom-color: #1976d2;
  border-bottom-width: 2px;
  padding-bottom: 5px;
}

/* Tag Chip — pill-shaped, outlined, compact (matches AiSearchModal) */
.goal-tag-chip {
  height: 24px !important;
  font-size: 12px !important;
  border-radius: 12px !important;
  margin: 0 !important;
}

.goal-tag-chip .v-chip--removable .v-chip__content {
  padding: 0 0px 0 8px !important;
}

.goal-tag-chip.v-chip--outline {
  border-color: #bdbdbd !important;
  color: #555 !important;
  background: transparent !important;
}

/* Tag icon inside chip */
.goal-tag-icon {
  font-size: 14px !important;
  color: #999 !important;
  margin-right: 1px !important;
  margin-left: -4px !important;
}

/* Colon-separated tag segments with divider borders */
.goal-tag-segment {
  padding: 0 5px;
  border-right: 1px solid #ccc;
}

.goal-tag-segment:last-of-type {
  border-right: none;
  padding-right: 0;
}

.goal-tag-segment:first-of-type {
  padding-left: 0;
}

/* Desktop: close button on hover with shadow overlay */
@media (min-width: 601px) {
  .goal-tag-chip {
    position: relative;
    overflow: visible !important;
  }

  .goal-tag-chip >>> .v-chip__close {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0;
    width: 16px !important;
    height: 16px !important;
    font-size: 11px !important;
    background: #fff !important;
    border-radius: 50% !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
    transition: opacity 0.15s ease;
    margin: 0 !important;
    color: #888 !important;
  }

  .goal-tag-chip:hover >>> .v-chip__close {
    opacity: 1;
  }
}

/* Mobile: always show close button */
@media (max-width: 600px) {
  .goal-tag-chip >>> .v-chip__close {
    margin-left: 2px !important;
    margin-right: -10px !important;
    font-size: 14px !important;
  }
}

/* Inline tag text input */
.goal-tag-input-wrapper {
  position: relative;
  flex: 1 1 80px;
  min-width: 80px;
}

.goal-tag-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 13px;
  line-height: 24px;
  color: #333;
  background: transparent;
  padding: 0 4px;
}

.goal-tag-input::placeholder {
  color: #bbb;
  font-size: 13px;
}

/* Tag autocomplete dropdown */
.goal-tag-autocomplete {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  max-height: 160px;
  overflow-y: auto;
  margin-top: 4px;
}

.goal-tag-autocomplete-item {
  padding: 6px 12px;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  transition: background 0.1s ease;
}

.goal-tag-autocomplete-item:hover,
.goal-tag-autocomplete-item.is-active {
  background: #f5f5f5;
}
</style>
