<template>
  <agents-board />
</template>

<script>
/**
 * `/agents` — the route stays exactly where it was; only the presentation was
 * rebuilt (`packages/design/Agents.dc.html`).
 *
 * Like RoutineFocusHome this view is a two-line wrapper: the page brings its own
 * chassis (`AppShell` — header, nav, drawer), so it must render OUTSIDE
 * MobileLayout/DesktopLayout. That is App.vue's `focusHome` branch, which keys
 * off the route's `meta`. **`/agents` still needs `meta: { focusHome: true }` in
 * router.js** — until then the shell renders inside the legacy toolbar and you
 * get two navigations. router.js and App.vue are owned elsewhere, so that one
 * line is handed over rather than applied here.
 */
import AgentsBoard from '@/pages/AgentsBoard.vue';

export default {
  name: 'AgentsPage',
  components: { AgentsBoard },
};
</script>
