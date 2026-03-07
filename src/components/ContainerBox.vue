<template>
  <v-layout row >
    <v-flex xs12 lg10 offset-lg1>
      <v-card
        max-width="800"
        :class="transparent ? 'transparent mx-auto elevation-0' : 'mx-auto'"
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
  props: ['isLoading', 'transparent'],
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

.transparent {
  background-color: transparent;
  box-shadow: none;
}
</style>
