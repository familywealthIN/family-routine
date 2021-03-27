<template>
  <v-layout row >
    <v-flex xs12 sm6 offset-sm3>
      <v-card
        class="mx-auto"
        max-width="600"
      >
        <div
          v-if="isLoading"
          class="text-xs-center"
          style="padding-top:100px; padding-bottom:100px; height: 100%;"
        >
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <div class="animated fadeIn" v-else>
          <slot></slot>
        </div>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
export default {
  name: 'ContainerBox',
  props: ['isLoading'],
};
</script>

<style>
.animated {
  -webkit-animation-duration: 1s;
  animation-duration: 1s;
  -webkit-animation-fill-mode: both;
  animation-fill-mode: both;
}

@-webkit-keyframes fadeIn {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

.fadeIn {
  -webkit-animation-name: fadeIn;
  animation-name: fadeIn;
}
</style>
