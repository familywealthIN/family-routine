<template>
  <div>
    <vue-tags-input
      v-model="tag"
      :tags="tags"
      :autocomplete-items="filteredItems"
      @tags-changed="tagsChanged"
    >
      <div slot="tag-center" slot-scope="props" @click="props.performOpenEdit(props.index)">
        <template v-if="props.tag && props.tag.text.includes(':')">
          <span v-for="text in props.tag.text.split(':')" :key="text">
            <span :key="text" style="padding: 5px; border-right: 1px solid #ccc;">
              {{ text }}
            </span>
          </span>
        </template>
        <template v-else>
          {{ props.tag.text }}
        </template>
      </div>
    </vue-tags-input>
  </div>
</template>

<script>
import VueTagsInput from '@johmun/vue-tags-input';

const mapTagItems = (tagItems = []) => tagItems.map((tagItem) => ({ text: tagItem }));
const mapTagStringItems = (tagItems = []) => tagItems.map((tagItem) => tagItem.text);

export default {
  components: {
    VueTagsInput,
  },
  props: ['goalTags', 'userTags'],
  data() {
    return {
      tag: '',
    };
  },
  computed: {
    tags() {
      return mapTagItems(this.goalTags);
    },
    filteredItems() {
      return mapTagItems(this.userTags).filter(
        (i) => i.text.toLowerCase().indexOf(this.tag.toLowerCase()) !== -1,
      );
    },
  },
  methods: {
    tagsChanged(newTags) {
      this.goalTags = mapTagStringItems(newTags);
      this.$emit('update-new-tag-items', this.goalTags);
    },
  },
};
</script>

<style>
.vue-tags-input {
  width: 100%;
  max-width: unset !important;
  margin-bottom: 8px;
  padding: 4px 0;
}

.vue-tags-input .ti-input {
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.42);
}

.vue-tags-input .ti-input input {
  font-size: 1rem;
  padding: 3px 0;
}
</style>
