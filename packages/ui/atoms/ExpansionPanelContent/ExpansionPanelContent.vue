<template>
  <v-expansion-panel-content v-bind="$attrs" v-on="$listeners">
    <template v-slot:header>
      <slot name="header"></slot>
    </template>
    <slot></slot>
  </v-expansion-panel-content>
</template>

<script>
export default {
  name: 'AtomExpansionPanelContent',
};
</script>
