<template>
  <!--
    Leaving the group, confirmed in a real sheet.

    This replaces the page's old browser `confirm('Do you want to leave the
    Group?')` — removing that is a stated goal of the redesign. The copy says
    what is actually lost (their progress, yours) and what is not (your routines
    and history), because a native confirm could say neither.
  -->
  <responsive-sheet
    :open="open"
    :shell="shell"
    :width="560"
    :closable="false"
    data-testid="group-leave-sheet"
    @close="$emit('close')"
  >
    <div class="rn-gleave">
      <div class="rn-gleave__title">Leave the group?</div>
      <p class="rn-gleave__body" data-testid="group-leave-body">
        You’ll stop seeing {{ othersNames }}’s progress, and they’ll stop seeing yours.
        Your routines and history stay with you.
      </p>
      <div class="rn-gleave__actions">
        <button
          type="button"
          class="rn-gleave__stay"
          data-testid="group-leave-stay"
          @click="$emit('close')"
        >
          Stay
        </button>
        <button
          type="button"
          class="rn-gleave__go"
          data-testid="group-leave-confirm"
          @click="$emit('confirm')"
        >
          Leave group
        </button>
      </div>
    </div>
  </responsive-sheet>
</template>

<script>
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';

export default {
  name: 'OrganismGroupLeaveSheet',
  components: { ResponsiveSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** "Priya, Sam and Leo" — whoever you stop seeing. */
    othersNames: { type: String, default: 'the others' },
  },
};
</script>

<style>
.rn-gleave {
  padding: 6px 4px 8px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-gleave__title {
  font-size: 20px;
  font-weight: 700;
}

.rn-gleave__body {
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .65);
  margin: 6px 0 0;
}

.rn-gleave__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.rn-gleave__stay,
.rn-gleave__go {
  height: 40px;
  border: 0;
  border-radius: 20px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.rn-gleave__stay {
  padding: 0 18px;
  background: transparent;
  color: #288bd5;
}

.rn-gleave__go {
  padding: 0 20px;
  background: #d32f2f;
  color: #fff;
}
</style>
