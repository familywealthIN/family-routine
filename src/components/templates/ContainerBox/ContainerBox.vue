<template>
  <AtomLayout row class="container-box-layout">
    <AtomFlex xs12 lg10 offset-lg1>
      <AtomCard
        max-width="800"
        :class="transparent ? 'transparent mx-auto elevation-0 main-card' : 'mx-auto main-card'"
      >
        <div
          v-if="isLoading"
          class="text-xs-center"
          style="padding-top:100px; padding-bottom:100px; height: 100%;"
        >
          <AtomProgressCircular indeterminate color="primary" />
        </div>
        <div class="animated fadeIn" v-else>
          <slot></slot>
        </div>
      </AtomCard>
    </AtomFlex>
  </AtomLayout>
</template>

<script>
import {
  AtomCard,
  AtomFlex,
  AtomLayout,
  AtomProgressCircular,
} from '../../atoms';

export default {
  name: 'ContainerBox',
  components: {
    AtomCard,
    AtomFlex,
    AtomLayout,
    AtomProgressCircular,
  },
  props: ['isLoading', 'transparent'],
};
</script>

<style>
.animated {
  padding-top: 55px;
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
