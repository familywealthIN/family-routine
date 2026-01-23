<template>
  <v-layout row class="container-box-layout">
    <v-flex xs12 lg10 offset-lg1>
      <v-card
        max-width="800"
        :class="transparent ? 'transparent mx-auto elevation-0 main-card' : 'mx-auto main-card'"
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
}

.main-card {
  border-radius: 16px;
}

@media (max-width: 767px) {
  .main-card {
    border-radius: 0;
  }
}

@media (min-width: 768px) {
  .container-box-layout {
    margin: 24px 0 24px 0;
  }
}
</style>
