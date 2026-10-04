<template>
  <!--
    About's hero (`Profile and About.dc.html` § AP/AT/AD): the app, its version,
    and the belief as the line everything else hangs off.

    The design's "Version 2.0 · beta 3" is a placeholder (chassis.md § "Things
    the mocks get wrong on purpose"). There is exactly one real version in the
    repo — the web app's `package.json` — and no build stamps a channel, so the
    channel is NOT invented: with no version at all the line is simply not
    rendered rather than printed as "Version undefined".
  -->
  <section class="rn-ahero" data-testid="about-hero">
    <header class="rn-ahero__head">
      <img class="rn-ahero__logo" :src="logo" alt="Routine Notes" />
      <div>
        <div class="rn-ahero__name">Routine Notes</div>
        <div v-if="version" class="rn-ahero__version" data-testid="about-version">
          Version {{ version }}
        </div>
      </div>
    </header>

    <p class="rn-ahero__belief" data-testid="about-belief">{{ belief }}</p>

    <p class="rn-ahero__sub">
      Instead of another backlog to tidy, it measures whether you actually <i>moved</i>
      today, across Discipline, Kinetics and Geniuses, and rolls your daily wins up into
      week, month and year outcomes automatically.
    </p>
  </section>
</template>

<script>
import { ABOUT_BELIEF } from '../../constants/about';

export default {
  name: 'MoleculeAboutHeroCard',
  props: {
    /** Empty = unknown. The line disappears rather than printing a guess. */
    version: { type: String, default: '' },
    logo: { type: String, default: '/img/icons/android-chrome-192x192.png' },
    belief: { type: String, default: ABOUT_BELIEF },
  },
};
</script>

<style>
.rn-ahero {
  padding: 18px 18px 16px;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-ahero__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rn-ahero__logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.rn-ahero__name {
  font-size: 20px;
  font-weight: 700;
}

.rn-ahero__version {
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
}

/* The belief is the hero line: heavier than the body, lighter than a title. */
.rn-ahero__belief {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.45;
  margin: 14px 0 0;
  text-wrap: pretty;
}

.rn-ahero__sub {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(0, 0, 0, .7);
  margin: 8px 0 0;
  text-wrap: pretty;
}
</style>
