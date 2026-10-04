<template>
  <!--
    The five feature tabs (`Profile and About.dc.html` § AP/AT/AD).

    The old page used Vuetify `v-tabs` + `v-tabs-items`, which brings its own
    slider, ripple and active colours. The chassis has ONE segmented control, so
    this is `SlidingSwitch`'s `underline` variant: the 2px indicator sits at
    `i * 100% / n` with `width: 100% / n`, which is the same geometry the 12h/24h
    thumb uses — five segments instead of two, no second copy of the maths.

    Each point leads with its bold term where it has one; a point with no term
    gets an arrow instead of a tick, exactly as drawn.
  -->
  <section class="rn-afeat" data-testid="about-features">
    <sliding-switch
      :segments="segments"
      :value="activeKey"
      variant="underline"
      :height="52"
      data-testid="about-feature-tabs"
      @change="select"
    />

    <!-- `:key` remounts the panel so the entrance animation replays, rather than
         the mock's alternating rn-in0 / rn-in1 pair (chassis.md § Motion). -->
    <div :key="activeKey" class="rn-afeat__panel" data-testid="about-feature-panel">
      <h3 class="rn-afeat__title" data-testid="about-feature-title">{{ active.title }}</h3>
      <p class="rn-afeat__lead">{{ active.lead }}</p>

      <ul class="rn-afeat__points">
        <li
          v-for="(point, index) in active.points"
          :key="index"
          class="rn-afeat__point"
          data-testid="about-feature-point"
        >
          <i class="rn-mi rn-afeat__point-glyph">{{ point.term ? 'check_circle' : 'arrow_right' }}</i>
          <span class="rn-afeat__point-text">
            <b v-if="point.term" class="rn-afeat__term">{{ point.term }}</b><template
              v-if="point.term"
            > · </template>{{ point.text }}
          </span>
        </li>
      </ul>

      <a
        v-if="active.link"
        class="rn-afeat__link"
        :href="active.link"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="about-feature-link"
      >
        {{ active.linkLabel }}<i class="rn-mi rn-afeat__link-glyph">arrow_forward</i>
      </a>
    </div>
  </section>
</template>

<script>
import SlidingSwitch from '../../molecules/SlidingSwitch/SlidingSwitch.vue';
import { ABOUT_FEATURES } from '../../constants/about';

const EMPTY = { title: '', lead: '', points: [] };

export default {
  name: 'OrganismAboutFeatureTabs',
  components: { SlidingSwitch },
  props: {
    features: { type: Array, default: () => ABOUT_FEATURES },
    /** Which tab opens first. Transient after that — see `current`. */
    value: { type: String, default: '' },
  },
  data() {
    return { current: null };
  },
  computed: {
    segments() {
      return this.features.map((feature) => ({
        key: feature.key, label: feature.label, icon: feature.icon,
      }));
    },
    /** Which tab is open: the user's choice, then the prop, then the first tab. */
    activeKey() {
      const first = this.features.length ? this.features[0].key : '';
      const wanted = this.current || this.value || first;
      return this.features.some((feature) => feature.key === wanted) ? wanted : first;
    },
    active() {
      return this.features.find((feature) => feature.key === this.activeKey) || EMPTY;
    },
  },
  methods: {
    select(key) {
      this.current = key;
      this.$emit('change', key);
    },
  },
};
</script>

<style>
.rn-afeat {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
  overflow: hidden;
}

.rn-afeat__panel {
  padding: 16px 18px 18px;
  animation: rn-fade .25s ease;
}

.rn-afeat__title {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
}

.rn-afeat__lead {
  font-size: 14px;
  line-height: 1.55;
  color: rgba(0, 0, 0, .7);
  margin: 6px 0 0;
  text-wrap: pretty;
}

.rn-afeat__points {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 14px 0 0;
  padding: 0;
}

.rn-afeat__point {
  display: flex;
  gap: 10px;
}

.rn-afeat__point-glyph {
  font-size: 18px;
  color: #288bd5;
  margin-top: 1px;
  flex-shrink: 0;
}

.rn-afeat__point-text {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .8);
}

.rn-afeat__term {
  color: #1f6fab;
}

.rn-afeat__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 14px;
  font-size: 14px;
  font-weight: 600;
  color: #288bd5;
  text-decoration: none;
}

.rn-afeat__link-glyph {
  font-size: 16px;
}
</style>
