<template>
  <div v-if="localMilestoneData && localMilestoneData.entries" class="goal-plan-form">
    <AtomDivider class="my-4" />

    <!-- Plan Title (Editable) -->
    <AtomTextField
      v-model="localMilestoneData.title"
      label="Plan Title (will be saved as parent goal)"
      prepend-icon="title"
      filled
      class="mb-3"
    />

    <!-- Plan Description (Editable) — stored on the parent goal item's
         contribution field so the main goal isn't created empty. -->
    <div class="plan-description mb-3">
      <label class="v-label theme--light plan-description__label">
        Plan Description (goal rationale)
      </label>
      <markdown-editor
        :value="localMilestoneData.description || ''"
        @input="updatePlanDescription"
        variant="compact"
        :editor-key="`plan-desc-${editorKey}`"
        :configs="planDescriptionConfig"
      />
    </div>

    <!-- Milestone explanation -->
    <AtomAlert
      v-if="selectedGoalRef"
      type="info"
      dense
      outlined
      class="mb-3"
    >
      <span class="caption">
        The plan title will be linked to a goal in the period above, and all timeline entries will be milestones referencing the plan title.
      </span>
    </AtomAlert>
    <AtomAlert
      v-else
      type="info"
      dense
      outlined
      class="mb-3"
    >
      <span class="caption">
        The plan title will be saved as a standalone goal, and all timeline entries will be milestones referencing it.
      </span>
    </AtomAlert>

    <!-- Timeline Results -->
    <div class="mb-4">
      <div class="mb-3 pl-2">
        <AtomIcon class="mr-1">timeline</AtomIcon>
        Generated {{ periodDisplayName }} Plan ({{ localMilestoneData.entries.length }} items)
      </div>
      <AtomTimeline dense>
        <TimelineEntryEditor
          v-for="(entry, index) in localMilestoneData.entries"
          :key="index"
          :title.sync="entry.title"
          :description.sync="entry.description"
          :periodName="entry.periodName"
          :date="entry.date"
          :color="getTimelineColor(entry.period)"
          :editorKey="`${index}-${editorKey}`"
          :editorConfig="mobileEditorConfig"
        />
      </AtomTimeline>
    </div>
  </div>
</template>

<script>
import moment from 'moment';
import { MarkdownEditor } from '@family-routine/markdown-editor';
import TimelineEntryEditor from '../../molecules/TimelineEntryEditor/TimelineEntryEditor.vue';
import {
  stepupMilestonePeriodDate,
} from '../../utils/getDates';
import {
  AtomAlert,
  AtomDivider,
  AtomIcon,
  AtomTextField,
  AtomTimeline,
} from '../../atoms';

export default {
  name: 'OrganismAiGoalPlanForm',
  components: {
    AtomAlert,
    AtomDivider,
    AtomIcon,
    AtomTextField,
    AtomTimeline,
    TimelineEntryEditor,
    MarkdownEditor,
  },
  props: {
    searchQuery: {
      type: String,
      required: true,
    },
    goalItemsRef: {
      type: Array,
      default: () => [],
    },
    tasklist: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    saving: {
      type: Boolean,
      default: false,
    },
    milestoneData: {
      type: Object,
      default: null,
    },
    // Props from GoalTaskToolbar
    selectedPeriod: {
      type: String,
      default: 'day',
    },
    selectedDate: {
      type: String,
      default: '',
    },
    selectedTaskRef: {
      type: String,
      default: null,
    },
    selectedGoalRef: {
      type: String,
      default: null,
    },
    promptTags: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      localMilestoneData: null,
      editorKey: 0,
      mobileEditorConfig: {
        toolbar: false,
        status: false,
        spellChecker: false,
        hideIcons: ['side-by-side', 'fullscreen'],
        minHeight: '60px',
        maxHeight: '100px',
        placeholder: 'Enter goal description...',
        renderingConfig: {
          singleLineBreaks: true,
          markedOptions: {
            breaks: true,
            gfm: true,
          },
        },
        previewRender: (plainText) => plainText.replace(/\n/g, '<br>'),
      },
      // Slightly taller preset for the plan-level description — this
      // text has more weight than a per-entry summary because it lives
      // on the parent goal.
      planDescriptionConfig: {
        minHeight: '90px',
        maxHeight: '180px',
        placeholder: 'What is this plan about? Why does it matter?',
      },
    };
  },
  computed: {
    periodDisplayName() {
      const periodMap = {
        day: 'Daily',
        week: 'Weekly',
        month: 'Monthly',
        year: 'Yearly',
        lifetime: 'Lifetime',
      };
      return periodMap[this.selectedPeriod] || 'Weekly';
    },
    planTitlePeriodData() {
      if (!this.localMilestoneData || !this.localMilestoneData.period) {
        return { date: '', period: '' };
      }
      const firstEntryDate = (this.localMilestoneData.entries[0] && this.localMilestoneData.entries[0].date) || moment().format('DD-MM-YYYY');
      const { date, period } = stepupMilestonePeriodDate(
        this.localMilestoneData.period,
        firstEntryDate,
      );
      return { date, period };
    },
    planTitleGoalData() {
      // This is the period and date for the plan title goal itself
      if (!this.selectedPeriod || !this.localMilestoneData || !this.localMilestoneData.entries || !this.localMilestoneData.entries.length) {
        return { date: '', period: '' };
      }

      const firstEntryDate = this.localMilestoneData.entries[0].date || moment().format('DD-MM-YYYY');
      let planDate = firstEntryDate;

      // Calculate the appropriate date based on the selected goal period
      if (this.selectedPeriod === 'week') {
        const weekNo = moment(firstEntryDate, 'DD-MM-YYYY').weeks();
        planDate = moment(firstEntryDate, 'DD-MM-YYYY').weeks(weekNo).weekday(5).format('DD-MM-YYYY');
      } else if (this.selectedPeriod === 'month') {
        planDate = moment(firstEntryDate, 'DD-MM-YYYY').endOf('month').format('DD-MM-YYYY');
      } else if (this.selectedPeriod === 'year') {
        planDate = moment(firstEntryDate, 'DD-MM-YYYY').endOf('year').format('DD-MM-YYYY');
      }

      return { date: planDate, period: this.selectedPeriod };
    },
    isValid() {
      return !!(
        this.localMilestoneData
        && this.selectedTaskRef
        && this.selectedPeriod
        && this.localMilestoneData.title
        && this.localMilestoneData.entries
        && this.localMilestoneData.entries.length > 0
      );
    },
  },
  watch: {
    isValid: {
      handler(newVal) {
        this.$emit('update:valid', newVal);
      },
      immediate: true,
    },
    searchQuery: {
      handler(newVal) {
        if (newVal && !this.localMilestoneData && !this.loading) {
          this.$emit('search-goals');
        }
      },
      immediate: true,
    },
    milestoneData: {
      immediate: true,
      deep: true,
      handler(newVal) {
        // Initialize local data from prop
        if (newVal && !this.localMilestoneData) {
          this.localMilestoneData = JSON.parse(JSON.stringify(newVal));
          this.editorKey += 1;
        } else if (newVal && JSON.stringify(newVal) !== JSON.stringify(this.localMilestoneData)) {
          this.localMilestoneData = JSON.parse(JSON.stringify(newVal));
          this.editorKey += 1;
        }
      },
    },
    localMilestoneData: {
      deep: true,
      handler(newVal) {
        // Emit updates to parent
        if (newVal) {
          this.$emit('update:milestoneData', newVal);
        }
      },
    },
    planTitlePeriodData: {
      handler(newVal) {
        if (newVal && newVal.period) {
          this.$emit('period-above-changed', newVal);
        }
      },
      immediate: true,
    },
  },
  methods: {
    /**
     * MarkdownEditor doesn't participate in v-model for a nested prop
     * cleanly (it emits 'input'), so we write the new description onto
     * localMilestoneData explicitly. The deep watcher then propagates
     * it to the parent container via update:milestoneData.
     */
    updatePlanDescription(value) {
      if (!this.localMilestoneData) return;
      this.$set(this.localMilestoneData, 'description', value);
    },
    getTimelineColor(period) {
      switch (period) {
        case 'day':
          return 'success';
        case 'week':
          return 'primary';
        case 'month':
          return 'warning';
        case 'year':
          return 'info';
        default:
          return 'primary';
      }
    },
    saveGoals() {
      this.$emit('save-goals', {
        milestoneData: this.localMilestoneData,
        selectedRoutine: this.selectedTaskRef,
        selectedGoalPeriod: this.selectedPeriod,
        planTitleGoalData: this.planTitleGoalData,
        selectedGoalRef: this.selectedGoalRef,
      });
    },
    resetForm() {
      this.editorKey = 0;
      this.$emit('reset-form');
    },
  },
};
</script>

<style scoped>
.modern-shadow-sm {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.plan-description__label {
  display: block;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
}

.timeline-card-content {
  padding: 16px;
}

@media (max-width: 600px) {
  .timeline-card-content {
    padding: 8px;
  }
}
</style>
