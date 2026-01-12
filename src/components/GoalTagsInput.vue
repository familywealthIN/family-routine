<template>
  <div>
    <v-icon class="tag-icon">label</v-icon>
    <vue-tags-input
      prepend-inner-icon="history"
      v-model="tag"
      :tags="tags"
      :autocomplete-items="filteredItems"
      @tags-changed="tagsChanged"
    >
      <div slot="tag-center" slot-scope="props" @click="props.performOpenEdit(props.index)">
        <template v-if="props.tag && props.tag.text && props.tag.text.includes(':')">
          <span v-for="(text, index) in props.tag.text.split(':')" :key="`${props.index}-${index}`">
            <span style="padding: 5px; border-right: 1px solid #ccc;">
              {{ text }}
            </span>
          </span>
        </template>
        <template v-else>
          {{ props.tag && props.tag.text ? props.tag.text : '' }}
        </template>
      </div>
    </vue-tags-input>
  </div>
</template>

<script>
import VueTagsInput from '@johmun/vue-tags-input';

const mapTagItems = (tagItems = []) => {
  if (!tagItems || !Array.isArray(tagItems)) return [];
  return tagItems.map((tagItem) => ({ text: tagItem }));
};
const mapTagStringItems = (tagItems = []) => {
  if (!tagItems || !Array.isArray(tagItems)) return [];
  return tagItems.map((tagItem) => tagItem.text);
};

export default {
  components: {
    VueTagsInput,
  },
  props: ['goalTags', 'userTags'],
  data() {
    return {
      tag: '',
      addGoalItemDialog: false, 
    };
  },
  computed: {
    tags() {
      return mapTagItems(this.goalTags || []);
    },
    filteredItems() {
      if (!this.userTags || !Array.isArray(this.userTags)) {
        return [];
      }
      return mapTagItems(this.userTags).filter(
        (i) => i.text && i.text.toLowerCase().indexOf(this.tag.toLowerCase()) !== -1,
      );
      
    },
  },
  methods: {
    tagsChanged(newTags) {
      if (!newTags || !Array.isArray(newTags)) {
        this.$emit('update-new-tag-items', []);
        return;
      }
      const tagStrings = mapTagStringItems(newTags);
      this.$emit('update-new-tag-items', tagStrings);
    },
  },
};
</script>

<style>
.tag-icon {
  position: absolute;
  z-index: 1;
  padding-top: 12px;
}

.vue-tags-input {
  width: 100% !important;
  max-width: unset !important;
  margin-bottom: 8px !important;
  padding: 4px 0 !important;
}

.vue-tags-input .ti-input {
  border: none !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.42) !important;
  padding-left: 24px !important;
}

.vue-tags-input .ti-input input {
  font-size: 1rem !important;
  padding: 3px 0 !important;
}

/* Fix for tag close icon */
.vue-tags-input .ti-tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  margin: 2px 4px 2px 0;
}

.vue-tags-input .ti-tag .ti-actions {
  display: flex;
  align-items: center;
  margin-left: 4px;
}

.vue-tags-input .ti-tag .ti-actions .ti-icon-close {
  cursor: pointer;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 12px;
  line-height: 1;
  margin-left: 4px;
}

.vue-tags-input .ti-tag .ti-actions .ti-icon-close:hover {
  background-color: rgba(0, 0, 0, 0.5);
}

.vue-tags-input .ti-tag .ti-actions .ti-icon-close::before {
  content: '×';
  font-weight: bold;
}

/* Ensure the close button is visible and clickable */
.vue-tags-input .ti-tag .ti-actions .ti-icon-close {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
}
</style>
