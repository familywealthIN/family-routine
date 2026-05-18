<template>
  <v-flex
    :xs1="xs1" :xs2="xs2" :xs3="xs3" :xs4="xs4" :xs5="xs5" :xs6="xs6"
    :xs7="xs7" :xs8="xs8" :xs9="xs9" :xs10="xs10" :xs11="xs11" :xs12="xs12"
    :sm1="sm1" :sm2="sm2" :sm3="sm3" :sm4="sm4" :sm5="sm5" :sm6="sm6"
    :sm7="sm7" :sm8="sm8" :sm9="sm9" :sm10="sm10" :sm11="sm11" :sm12="sm12"
    :md1="md1" :md2="md2" :md3="md3" :md4="md4" :md5="md5" :md6="md6"
    :md7="md7" :md8="md8" :md9="md9" :md10="md10" :md11="md11" :md12="md12"
    :lg1="lg1" :lg2="lg2" :lg3="lg3" :lg4="lg4" :lg5="lg5" :lg6="lg6"
    :lg7="lg7" :lg8="lg8" :lg9="lg9" :lg10="lg10" :lg11="lg11" :lg12="lg12"
    :xl1="xl1" :xl2="xl2" :xl3="xl3" :xl4="xl4" :xl5="xl5" :xl6="xl6"
    :xl7="xl7" :xl8="xl8" :xl9="xl9" :xl10="xl10" :xl11="xl11" :xl12="xl12"
    :offset-xs1="offsetXs1" :offset-xs2="offsetXs2" :offset-xs3="offsetXs3"
    :offset-xs4="offsetXs4" :offset-xs5="offsetXs5" :offset-xs6="offsetXs6"
    :offset-sm1="offsetSm1" :offset-sm2="offsetSm2" :offset-sm3="offsetSm3"
    :offset-sm4="offsetSm4" :offset-sm5="offsetSm5" :offset-sm6="offsetSm6"
    :offset-md1="offsetMd1" :offset-md2="offsetMd2" :offset-md3="offsetMd3"
    :offset-md4="offsetMd4" :offset-md5="offsetMd5" :offset-md6="offsetMd6"
    :offset-lg1="offsetLg1" :offset-lg2="offsetLg2" :offset-lg3="offsetLg3"
    :offset-lg4="offsetLg4" :offset-lg5="offsetLg5" :offset-lg6="offsetLg6"
    :d-flex="dFlex"
    :class="$attrs.class"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-flex>
</template>

<script>
export default {
  name: 'AtomFlex',
  inheritAttrs: false,
  props: {
    // Extra small (xs) breakpoints
    xs1: { type: Boolean, default: false },
    xs2: { type: Boolean, default: false },
    xs3: { type: Boolean, default: false },
    xs4: { type: Boolean, default: false },
    xs5: { type: Boolean, default: false },
    xs6: { type: Boolean, default: false },
    xs7: { type: Boolean, default: false },
    xs8: { type: Boolean, default: false },
    xs9: { type: Boolean, default: false },
    xs10: { type: Boolean, default: false },
    xs11: { type: Boolean, default: false },
    xs12: { type: Boolean, default: false },
    // Small (sm) breakpoints
    sm1: { type: Boolean, default: false },
    sm2: { type: Boolean, default: false },
    sm3: { type: Boolean, default: false },
    sm4: { type: Boolean, default: false },
    sm5: { type: Boolean, default: false },
    sm6: { type: Boolean, default: false },
    sm7: { type: Boolean, default: false },
    sm8: { type: Boolean, default: false },
    sm9: { type: Boolean, default: false },
    sm10: { type: Boolean, default: false },
    sm11: { type: Boolean, default: false },
    sm12: { type: Boolean, default: false },
    // Medium (md) breakpoints
    md1: { type: Boolean, default: false },
    md2: { type: Boolean, default: false },
    md3: { type: Boolean, default: false },
    md4: { type: Boolean, default: false },
    md5: { type: Boolean, default: false },
    md6: { type: Boolean, default: false },
    md7: { type: Boolean, default: false },
    md8: { type: Boolean, default: false },
    md9: { type: Boolean, default: false },
    md10: { type: Boolean, default: false },
    md11: { type: Boolean, default: false },
    md12: { type: Boolean, default: false },
    // Large (lg) breakpoints
    lg1: { type: Boolean, default: false },
    lg2: { type: Boolean, default: false },
    lg3: { type: Boolean, default: false },
    lg4: { type: Boolean, default: false },
    lg5: { type: Boolean, default: false },
    lg6: { type: Boolean, default: false },
    lg7: { type: Boolean, default: false },
    lg8: { type: Boolean, default: false },
    lg9: { type: Boolean, default: false },
    lg10: { type: Boolean, default: false },
    lg11: { type: Boolean, default: false },
    lg12: { type: Boolean, default: false },
    // Extra large (xl) breakpoints
    xl1: { type: Boolean, default: false },
    xl2: { type: Boolean, default: false },
    xl3: { type: Boolean, default: false },
    xl4: { type: Boolean, default: false },
    xl5: { type: Boolean, default: false },
    xl6: { type: Boolean, default: false },
    xl7: { type: Boolean, default: false },
    xl8: { type: Boolean, default: false },
    xl9: { type: Boolean, default: false },
    xl10: { type: Boolean, default: false },
    xl11: { type: Boolean, default: false },
    xl12: { type: Boolean, default: false },
    // Offsets
    offsetXs1: { type: Boolean, default: false },
    offsetXs2: { type: Boolean, default: false },
    offsetXs3: { type: Boolean, default: false },
    offsetXs4: { type: Boolean, default: false },
    offsetXs5: { type: Boolean, default: false },
    offsetXs6: { type: Boolean, default: false },
    offsetSm1: { type: Boolean, default: false },
    offsetSm2: { type: Boolean, default: false },
    offsetSm3: { type: Boolean, default: false },
    offsetSm4: { type: Boolean, default: false },
    offsetSm5: { type: Boolean, default: false },
    offsetSm6: { type: Boolean, default: false },
    offsetMd1: { type: Boolean, default: false },
    offsetMd2: { type: Boolean, default: false },
    offsetMd3: { type: Boolean, default: false },
    offsetMd4: { type: Boolean, default: false },
    offsetMd5: { type: Boolean, default: false },
    offsetMd6: { type: Boolean, default: false },
    offsetLg1: { type: Boolean, default: false },
    offsetLg2: { type: Boolean, default: false },
    offsetLg3: { type: Boolean, default: false },
    offsetLg4: { type: Boolean, default: false },
    offsetLg5: { type: Boolean, default: false },
    offsetLg6: { type: Boolean, default: false },
    // Display flex
    dFlex: { type: Boolean, default: false },
  },
};
</script>
