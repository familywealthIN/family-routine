<template>
  <div class="projects">
    <ProjectsTime :tag="tag" />
  </div>
</template>

<script>
import ProjectsTime from '@/pages/ProjectsTime.vue';

export default {
  name: 'Projects',
  components: {
    ProjectsTime,
  },
  props: {
    tag: {
      type: String,
      required: true,
    },
  },
};
</script>
