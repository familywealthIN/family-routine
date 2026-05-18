<template>
  <div>
    <!-- Mobile Bottom Sheet -->
    <AtomBottomSheet
      v-if="$vuetify.breakpoint.xsOnly"
      v-model="dialog"
      persistent
      max-width="100%"
    >
      <AtomCard
        class="ai-search-modal"
        :style="dragStyle"
      >
        <!-- Mobile Handle (drag to close) -->
        <div
          class="mobile-handle-container"
          @touchstart.passive="onHandleTouchStart"
          @touchmove.prevent="onHandleTouchMove"
          @touchend="onHandleTouchEnd"
        >
          <div class="mobile-handle" :class="{ 'mobile-handle--dragging': isDragging }"></div>
        </div>

        <!-- Sticky Header with Mode Toggle -->
        <div class="sticky-header">
          <div class="header-layout pa-1">
            <!-- Left Spacer -->
            <div class="header-section"></div>

            <!-- Center: Mode Toggle -->
            <div class="header-section header-section--center">
              <v-btn-toggle
                v-model="toggleMode"
                mandatory
                class="mode-toggle"
              >
                <v-btn v-if="!searchOnlyMode" value="task" class="mode-btn mode-btn--task">
                  <AtomIcon left small>task_alt</AtomIcon>
                  <span>Task</span>
                </v-btn>
                <v-btn v-if="!searchOnlyMode" value="goal" class="mode-btn mode-btn--goal">
                  <AtomIcon left small>timeline</AtomIcon>
                  <span>Goal</span>
                </v-btn>
                <v-btn v-if="showSearchTab" value="search" class="mode-btn mode-btn--search">
                  <AtomIcon left small>search</AtomIcon>
                  <span>Search</span>
                </v-btn>
              </v-btn-toggle>
            </div>

            <!-- Right: Close Button -->
            <div class="header-section header-section--right">
              <AtomButton icon @click="closeModal">
                <AtomIcon>close</AtomIcon>
              </AtomButton>
            </div>
          </div>
        </div>

        <!-- Scroll Shadow Indicators -->
        <div v-show="showTopShadow" class="scroll-shadow scroll-shadow--top"></div>

        <!--Scrollable Content -->
        <AtomCardText
          ref="scrollableContent"
          @scroll="handleScroll"
          class="scrollable-content"
          style="max-height: 70vh; overflow-y: auto;"
        >
          <!-- Prompt Box -->
          <div class="prompt-box">
            <!-- Tags Row -->
            <div v-show="showTagsRow" class="prompt-tags">
              <AtomChip
                v-for="tag in promptTags"
                :key="tag"
                small
                outline
                close
                class="prompt-tag-chip"
                @input="removeTag(tag)"
              >
                <v-icon left small class="prompt-tag-icon">tag</v-icon>
                <template v-if="tag.includes(':')">
                  <span
                    v-for="(segment, sIdx) in tag.split(':')"
                    :key="sIdx"
                    class="prompt-tag-segment"
                  >{{ segment }}</span>
                </template>
                <template v-else>{{ tag }}</template>
              </AtomChip>
              <div class="prompt-tag-input-wrapper">
                <input
                  ref="tagInputFieldMobile"
                  v-model="tagInput"
                  type="text"
                  class="prompt-tag-input"
                  placeholder="Add context..."
                  @keydown="handleTagKeydown"
                  @focus="tagInputFocused = true"
                  @blur="tagInputFocused = false"
                />
                <div v-if="filteredAutocompleteTags.length" class="tag-autocomplete">
                  <div
                    v-for="suggestion in filteredAutocompleteTags"
                    :key="suggestion"
                    class="tag-autocomplete-item"
                    @mousedown.prevent="selectAutocompleteTag(suggestion)"
                  >
                    {{ suggestion }}
                  </div>
                </div>
              </div>
            </div>
            <AtomTextarea
              ref="promptTextarea"
              v-model="searchQuery"
              :placeholder="intelligentPlaceholder"
              :loading="loading"
              rows="1"
              row-height="24"
              auto-grow
              no-resize
              solo
              flat
              hide-details
              class="prompt-textarea"
              @keydown="handleKeydown"
            />
            <div class="prompt-actions">
              <GoalTaskToolbar
                :period.sync="toolbarPeriod"
                :date.sync="toolbarDate"
                :taskRef.sync="toolbarTaskRef"
                :goalRef.sync="toolbarGoalRef"
                :tasklist="routines"
                :goalItemsRef="goalItemsRef"
                :minDate="toolbarMinDate"
                :task-mode="isTaskMode"
                :search-mode="isSearchMode"
                class="prompt-toolbar"
              />
              <div class="prompt-send-group">
                <!-- Settings Button (opens sub-drawer on mobile) -->
                <AtomButton v-if="!isSearchMode" icon small class="settings-btn" @click="openSettingsDrawer">
                  <AtomIcon small>tune</AtomIcon>
                </AtomButton>
                <MobileSubDrawer v-model="settingsDrawerOpen" title="Settings">
                  <AtomList dense class="settings-menu-list">
                    <!-- Task Mode: AI Enhanced Task toggle -->
                    <AtomListTile v-if="isTaskMode">
                      <AtomListTileContent>
                        <AtomListTileTitle>AI Enhanced Task</AtomListTileTitle>
                      </AtomListTileContent>
                      <AtomListTileAction>
                        <AtomSwitch v-model="aiEnhancedTask" color="primary" hide-details />
                      </AtomListTileAction>
                    </AtomListTile>
                    <!-- Goal Mode: Associate Parent Goal toggle -->
                    <AtomListTile v-if="!isTaskMode">
                      <AtomListTileContent>
                        <AtomListTileTitle>Associate Parent Goal</AtomListTileTitle>
                      </AtomListTileContent>
                      <AtomListTileAction>
                        <AtomSwitch
                          v-model="associateParentGoal"
                          :disabled="!canAssociateParentGoal"
                          color="warning"
                          hide-details
                        />
                      </AtomListTileAction>
                    </AtomListTile>
                    <!-- Build on Next Steps toggle (area/project tags) -->
                    <AtomListTile v-if="hasAreaOrProjectTag">
                      <AtomListTileContent>
                        <AtomListTileTitle>Build on Next Steps</AtomListTileTitle>
                      </AtomListTileContent>
                      <AtomListTileAction>
                        <AtomSwitch
                          v-model="buildOnNextSteps"
                          :disabled="!canBuildOnNextSteps"
                          color="success"
                          hide-details
                        />
                      </AtomListTileAction>
                    </AtomListTile>
                  </AtomList>
                </MobileSubDrawer>
                <!-- Send Button -->
                <AtomButton
                  :loading="loading"
                  :color="isSearchMode ? 'teal' : (isTaskMode ? 'primary' : 'warning')"
                  :class="['prompt-send-btn', { 'prompt-send-btn--inactive': !searchQuery || loading }]"
                  icon
                  @click="handleSubmit"
                >
                  <AtomIcon>{{ isSearchMode ? 'search' : 'send' }}</AtomIcon>
                </AtomButton>
              </div>
            </div>
          </div>

          <!-- Error Display -->
          <AtomAlert v-if="error && !isSearchMode" type="error" dismissible @input="error = ''">
            {{ error }}
          </AtomAlert>

          <!-- Task Creation Form (Task Mode) -->
          <component
            :is="resolvedTaskFormComponent"
            v-if="hasSubmitted && isTaskMode && !isSearchMode"
            ref="taskForm"
            :searchQuery="searchQuery"
            :goalItemsRef="goalItemsRef"
            :tasklist="tasklist"
            :relatedGoalsData="relatedGoalsData"
            :selectedDate="toolbarDate"
            :selectedTaskRef="toolbarTaskRef"
            :selectedGoalRef="toolbarGoalRef"
            :promptTags="promptTags"
            :dashboardContext="dashboardContextData"
            :loading.sync="loading"
            @error="error = $event"
            @update:loading="loading = $event"
            @update:saving="saving = $event"
            @update:valid="isFormValid = $event"
            @task-created="handleTaskCreated"
            @update-prompt-tags="mergeAiTags"
            @success="handleSuccess"
          />

          <!-- Goal Planning Form (Goals Mode) -->
          <component
            :is="resolvedGoalFormComponent"
            v-if="hasSubmitted && !isTaskMode && !isSearchMode"
            ref="goalForm"
            :searchQuery="searchQuery"
            :goalItemsRef="goalItemsRef"
            :tasklist="tasklist"
            :selectedPeriod="toolbarPeriod"
            :selectedDate="toolbarDate"
            :selectedTaskRef="toolbarTaskRef"
            :selectedGoalRef="toolbarGoalRef"
            :parentGoalContext="selectedParentGoalData"
            :dashboardContext="dashboardContextData"
            :promptTags="promptTags"
            :loading.sync="loading"
            @error="error = $event"
            @update:loading="loading = $event"
            @update:saving="saving = $event"
            @update:valid="isFormValid = $event"
            @period-above-changed="handlePeriodAboveChanged"
            @goals-saved="handleGoalsSaved"
            @success="handleSuccess"
          />
        </AtomCardText>

        <div v-show="showBottomShadow" class="scroll-shadow scroll-shadow--bottom"></div>

        <!-- Sticky Footer with Save Button -->
        <AtomCardActions v-if="hasSubmitted && !isSearchMode" class="sticky-footer">
          <AtomSpacer />
          <AtomButton text @click="closeModal">Cancel</AtomButton>
          <AtomButton
            :color="isTaskMode ? 'primary' : 'warning'"
            :disabled="!canSave"
            :loading="saving"
            @click="handleSaveClick"
          >
            {{ getSaveButtonText }}
          </AtomButton>
        </AtomCardActions>
      </AtomCard>
    </AtomBottomSheet>

    <!-- Desktop Dialog -->
    <AtomDialog
      v-else
      v-model="dialog"
      persistent
      max-width="800px"
      content-class="ai-search-modal-dialog"
    >
      <AtomCard class="ai-search-modal">
        <!-- Sticky Header with Mode Toggle -->
        <div class="sticky-header">
          <div class="header-layout pa-1">
            <!-- Left Spacer -->
            <div class="header-section"></div>

            <!-- Center: Mode Toggle -->
            <div class="header-section header-section--center">
              <v-btn-toggle
                v-model="toggleMode"
                mandatory
                class="mode-toggle"
              >
                <v-btn v-if="!searchOnlyMode" value="task" class="mode-btn mode-btn--task">
                  <AtomIcon left small>task_alt</AtomIcon>
                  <span>Task</span>
                </v-btn>
                <v-btn v-if="!searchOnlyMode" value="goal" class="mode-btn mode-btn--goal">
                  <AtomIcon left small>timeline</AtomIcon>
                  <span>Goal</span>
                </v-btn>
                <v-btn v-if="showSearchTab" value="search" class="mode-btn mode-btn--search">
                  <AtomIcon left small>search</AtomIcon>
                  <span>Search</span>
                </v-btn>
              </v-btn-toggle>
            </div>

            <!-- Right: Close Button -->
            <div class="header-section header-section--right">
              <AtomButton icon @click="closeModal">
                <AtomIcon>close</AtomIcon>
              </AtomButton>
            </div>
          </div>
        </div>

        <!-- Scroll Shadow Indicators -->
        <div v-show="showTopShadow" class="scroll-shadow scroll-shadow--top"></div>

        <!-- Scrollable Content -->
        <AtomCardText
          ref="scrollableContent"
          @scroll="handleScroll"
          class="scrollable-content"
          style="max-height: 70vh; overflow-y: auto;"
        >
          <!-- Prompt Box -->
          <div class="prompt-box">
            <!-- Tags Row -->
            <div v-show="showTagsRow" class="prompt-tags">
              <AtomChip
                v-for="tag in promptTags"
                :key="tag"
                small
                outline
                close
                class="prompt-tag-chip"
                @input="removeTag(tag)"
              >
                <v-icon left small class="prompt-tag-icon">tag</v-icon>
                <template v-if="tag.includes(':')">
                  <span
                    v-for="(segment, sIdx) in tag.split(':')"
                    :key="sIdx"
                    class="prompt-tag-segment"
                  >{{ segment }}</span>
                </template>
                <template v-else>{{ tag }}</template>
              </AtomChip>
              <div class="prompt-tag-input-wrapper">
                <input
                  ref="tagInputField"
                  v-model="tagInput"
                  type="text"
                  class="prompt-tag-input"
                  placeholder="Add context..."
                  @keydown="handleTagKeydown"
                  @focus="tagInputFocused = true"
                  @blur="tagInputFocused = false"
                />
                <div v-if="filteredAutocompleteTags.length" class="tag-autocomplete">
                  <div
                    v-for="suggestion in filteredAutocompleteTags"
                    :key="suggestion"
                    class="tag-autocomplete-item"
                    @mousedown.prevent="selectAutocompleteTag(suggestion)"
                  >
                    {{ suggestion }}
                  </div>
                </div>
              </div>
            </div>
            <AtomTextarea
              ref="promptTextarea"
              v-model="searchQuery"
              :placeholder="intelligentPlaceholder"
              :loading="loading"
              rows="1"
              row-height="48"
              auto-grow
              no-resize
              solo
              flat
              hide-details
              class="prompt-textarea"
              @keydown="handleKeydown"
            />
            <div class="prompt-actions">
              <GoalTaskToolbar
                :period.sync="toolbarPeriod"
                :date.sync="toolbarDate"
                :taskRef.sync="toolbarTaskRef"
                :goalRef.sync="toolbarGoalRef"
                :tasklist="routines"
                :goalItemsRef="goalItemsRef"
                :minDate="toolbarMinDate"
                :task-mode="isTaskMode"
                :search-mode="isSearchMode"
                class="prompt-toolbar"
              />
              <div class="prompt-send-group">
                <!-- Settings Dropdown -->
                <AtomMenu
                  v-if="!isSearchMode"
                  v-model="settingsMenuOpen"
                  :close-on-content-click="false"
                  offset-y
                  top
                >
                  <template #activator="{ on }">
                    <AtomButton icon small class="settings-btn" v-on="on">
                      <AtomIcon small>tune</AtomIcon>
                    </AtomButton>
                  </template>
                  <AtomList dense class="settings-menu-list">
                    <!-- Task Mode: AI Enhanced Task toggle -->
                    <AtomListTile v-if="isTaskMode">
                      <AtomListTileContent>
                        <AtomListTileTitle>AI Enhanced Task</AtomListTileTitle>
                      </AtomListTileContent>
                      <AtomListTileAction>
                        <AtomSwitch v-model="aiEnhancedTask" color="primary" hide-details />
                      </AtomListTileAction>
                    </AtomListTile>
                    <!-- Goal Mode: Associate Parent Goal toggle -->
                    <AtomListTile v-if="!isTaskMode">
                      <AtomListTileContent>
                        <AtomListTileTitle>Associate Parent Goal</AtomListTileTitle>
                      </AtomListTileContent>
                      <AtomListTileAction>
                        <AtomSwitch
                          v-model="associateParentGoal"
                          :disabled="!canAssociateParentGoal"
                          color="warning"
                          hide-details
                        />
                      </AtomListTileAction>
                    </AtomListTile>
                    <!-- Build on Next Steps toggle (area/project tags) -->
                    <AtomListTile v-if="hasAreaOrProjectTag">
                      <AtomListTileContent>
                        <AtomListTileTitle>Build on Next Steps</AtomListTileTitle>
                      </AtomListTileContent>
                      <AtomListTileAction>
                        <AtomSwitch
                          v-model="buildOnNextSteps"
                          :disabled="!canBuildOnNextSteps"
                          color="success"
                          hide-details
                        />
                      </AtomListTileAction>
                    </AtomListTile>
                  </AtomList>
                </AtomMenu>
                <!-- Send Button -->
                <AtomButton
                  :loading="loading"
                  :color="isSearchMode ? 'teal' : (isTaskMode ? 'primary' : 'warning')"
                  :class="['prompt-send-btn', { 'prompt-send-btn--inactive': !searchQuery || loading }]"
                  icon
                  @click="handleSubmit"
                >
                  <AtomIcon>{{ isSearchMode ? 'search' : 'send' }}</AtomIcon>
                </AtomButton>
              </div>
            </div>
          </div>

          <!-- Error Display -->
          <AtomAlert v-if="error && !isSearchMode" type="error" dismissible @input="error = ''">
            {{ error }}
          </AtomAlert>

          <!-- Task Creation Form (Task Mode) -->
          <component
            :is="resolvedTaskFormComponent"
            v-if="hasSubmitted && isTaskMode && !isSearchMode"
            ref="taskForm"
            :searchQuery="searchQuery"
            :goalItemsRef="goalItemsRef"
            :tasklist="tasklist"
            :relatedGoalsData="relatedGoalsData"
            :selectedDate="toolbarDate"
            :selectedTaskRef="toolbarTaskRef"
            :selectedGoalRef="toolbarGoalRef"
            :promptTags="promptTags"
            :dashboardContext="dashboardContextData"
            :loading.sync="loading"
            @error="error = $event"
            @update:loading="loading = $event"
            @update:saving="saving = $event"
            @update:valid="isFormValid = $event"
            @task-created="handleTaskCreated"
            @update-prompt-tags="mergeAiTags"
            @success="handleSuccess"
          />

          <!-- Goal Planning Form (Goals Mode) -->
          <component
            :is="resolvedGoalFormComponent"
            v-if="hasSubmitted && !isTaskMode && !isSearchMode"
            ref="goalForm"
            :searchQuery="searchQuery"
            :goalItemsRef="goalItemsRef"
            :tasklist="tasklist"
            :selectedPeriod="toolbarPeriod"
            :selectedDate="toolbarDate"
            :selectedTaskRef="toolbarTaskRef"
            :selectedGoalRef="toolbarGoalRef"
            :parentGoalContext="selectedParentGoalData"
            :dashboardContext="dashboardContextData"
            :promptTags="promptTags"
            :loading.sync="loading"
            @error="error = $event"
            @update:loading="loading = $event"
            @update:saving="saving = $event"
            @update:valid="isFormValid = $event"
            @period-above-changed="handlePeriodAboveChanged"
            @goals-saved="handleGoalsSaved"
            @success="handleSuccess"
          />
        </AtomCardText>

        <div v-show="showBottomShadow" class="scroll-shadow scroll-shadow--bottom"></div>

        <!-- Sticky Footer with Save Button -->
        <AtomCardActions v-if="hasSubmitted && !isSearchMode" class="sticky-footer">
          <AtomSpacer />
          <AtomButton text @click="closeModal">Cancel</AtomButton>
          <AtomButton
            :color="isTaskMode ? 'primary' : 'warning'"
            :disabled="!canSave"
            :loading="saving"
            @click="handleSaveClick"
          >
            {{ getSaveButtonText }}
          </AtomButton>
        </AtomCardActions>
      </AtomCard>
    </AtomDialog>

    <!-- Plan-horizon confirmation: shown before submit when the selected
         goal period has fewer sub-periods left than the streak threshold
         (5 days / 3 weeks / 6 months). The user picks current vs next. -->
    <AtomDialog v-model="showHorizonDialog" max-width="440" persistent>
      <AtomCard v-if="horizonInfo" class="horizon-dialog">
        <AtomCardTitle class="horizon-title">
          <AtomIcon left small color="warning">schedule</AtomIcon>
          Only {{ horizonInfo.remaining }}
          {{ horizonInfo.remaining === 1 ? horizonInfo.unitSingular : horizonInfo.unitPlural }}
          left this {{ horizonInfo.period }}
        </AtomCardTitle>
        <AtomCardText>
          A {{ horizonInfo.period }} plan usually wants more
          {{ horizonInfo.unitPlural }} to build a streak. Would you like to
          plan for {{ horizonInfo.nextLabel }} instead?
        </AtomCardText>
        <AtomCardActions>
          <AtomSpacer />
          <AtomButton flat color="grey" @click="chooseHorizon('current')">
            Use this {{ horizonInfo.period }}
          </AtomButton>
          <AtomButton color="primary" @click="chooseHorizon('next')">
            Plan for {{ horizonInfo.nextWord }}
          </AtomButton>
        </AtomCardActions>
      </AtomCard>
    </AtomDialog>
  </div>
</template>

<script>
/**
 * AI Search Modal - Intelligent Task/Goal Creation
 *
 * MILESTONE PERIOD FETCHING LOGIC:
 * =================================
 * When the modal switches from Task mode to Goal mode (auto or manual),
 * or when the period changes to week/month/year, it automatically fetches
 * goals from the PARENT period to populate milestone selection options.
 *
 * Period Hierarchy (uses stepupMilestonePeriodDate):
 * - day    → fetches WEEK goals    (Friday of current week)
 * - week   → fetches MONTH goals   (Last day of current month)
 * - month  → fetches YEAR goals    (December 31st of current year)
 * - year   → fetches LIFETIME goals (01-01-1970)
 *
 * Implementation:
 * 1. searchQuery watcher: Detects period keywords (week/month/year)
 *    → Sets toolbarPeriod → Triggers auto-fetch
 *
 * 2. toolbarPeriod watcher: When period changes to week/month/year
 *    → Calls fetchGoalsForPeriod() → Emits period-above-changed
 *
 * 3. isTaskMode watcher: When switching task→goal mode
 *    → If period is week/month/year, triggers fetchGoalsForPeriod()
 *
 * 4. Container (AiSearchModalContainer): Receives period-above-changed event
 *    → Refetches goalItemsRef GraphQL query with parent period
 *    → Updates goalItemsRef prop with parent period goals
 *
 * Example Flow:
 * User types: "complete JavaScript course this week"
 * → Mode: goal (auto-detected)
 * → Period: week (keyword detected)
 * → Fetches: month goals (for milestone linking)
 * → User can select month goal as parent milestone
 */

import moment from 'moment';
import gql from 'graphql-tag';
import {
  AtomAlert,
  AtomBottomSheet,
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomCardTitle,
  AtomChip,
  AtomDialog,
  AtomIcon,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileTitle,
  AtomMenu,
  AtomSpacer,
  AtomSwitch,
  AtomTextarea,
} from '../../atoms';
import { USER_TAGS } from '../../constants/settings';
import getJSON from '../../utils/getJSON';
import { blurActiveElement } from '../../utils/blurActiveElement';
import { getAllCachedDashboards, filterAreaProjectTags } from '../../utils/dashboardCache';
import { readAiSearchSettings, writeAiSearchSettings } from '../../utils/aiSearchSettings';
import eventBus, { EVENTS } from '../../utils/eventBus';
import GoalTaskToolbar from '../GoalTaskToolbar/GoalTaskToolbar.vue';
import MobileSubDrawer from '../../molecules/MobileSubDrawer/MobileSubDrawer.vue';
import { stepupMilestonePeriodDate } from '../../utils/getDates';
import AiTaskCreationForm from '../AiTaskCreationForm/AiTaskCreationForm.vue';
import AiGoalPlanForm from '../AiGoalPlanForm/AiGoalPlanForm.vue';

export default {
  name: 'OrganismAiSearchModal',

  components: {
    AiTaskCreationForm,
    AiGoalPlanForm,
    GoalTaskToolbar,
    MobileSubDrawer,
    AtomAlert,
    AtomBottomSheet,
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomChip,
    AtomDialog,
    AtomIcon,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileTitle,
    AtomMenu,
    AtomSpacer,
    AtomSwitch,
    AtomTextarea,
  },

  props: {
    value: {
      type: Boolean,
      required: true,
    },
    goalItemsRef: {
      type: Array,
      default: () => [],
    },
    relatedGoalsData: {
      type: Array,
      default: () => [],
    },
    routines: {
      type: Array,
      default: () => [],
    },
    /**
     * Raw tasklist for GoalRefSelector grouping
     * Expected: [{ id, name, time, ... }, ...]
     */
    tasklist: {
      type: Array,
      default: () => [],
    },
    /**
     * How the modal was opened: 'search' (from search bar) or 'add' (from add button)
     */
    openMode: {
      type: String,
      default: 'add',
    },
    /**
     * Override components for the task / goal forms so the consumer (e.g. web-app)
     * can inject a data-connected container while the UI package keeps the bare
     * presentational defaults.
     */
    taskFormComponent: {
      type: [Object, Function],
      default: null,
    },
    goalFormComponent: {
      type: [Object, Function],
      default: null,
    },
  },

  data() {
    return {
      searchQuery: '',
      error: '',
      loading: false,
      saving: false,
      hasSubmitted: false,
      isFormValid: false,
      showTopShadow: false,
      showBottomShadow: false,
      manualMode: null, // Track user's manual toggle selection: 'task' or 'goal'
      // Settings dropdown
      settingsMenuOpen: false,
      settingsDrawerOpen: false,
      aiEnhancedTask: false, // Task mode: use AI extraction vs direct creation
      associateParentGoal: false, // Goal mode: inject parent goal context into AI prompt
      buildOnNextSteps: false, // Inject cached area/project dashboard context as system prompt
      isDashboardCaching: false, // Whether dashboard caching is in progress
      // GoalTaskToolbar data
      toolbarPeriod: 'day',
      toolbarDate: '',
      toolbarTaskRef: null,
      toolbarGoalRef: null,
      // Tags
      promptTags: [],
      routineTagsSet: [], // Tags auto-added from current routine (for auto-removal)
      manuallyAddedTags: [], // Tags manually typed by user (persist across routine changes)
      tagInput: '', // Current text in the inline tag input
      tagInputFocused: false, // Track focus state of tag input
      userTags: [], // Autocomplete suggestions from localStorage
      // Drag-to-close state
      isDragging: false,
      dragStartY: 0,
      dragCurrentY: 0,
      // Plan-horizon dialog: shown before submit when the selected goal
      // period has fewer than the threshold sub-periods left this year/
      // month/week (so a sensible plan would have to roll into the next
      // period). The user picks current vs next.
      showHorizonDialog: false,
      horizonInfo: null,
      horizonChoiceMade: false,
    };
  },

  computed: {
    dialog: {
      get() {
        return this.value;
      },
      set(val) {
        this.$emit('input', val);
      },
    },

    resolvedTaskFormComponent() {
      return this.taskFormComponent || 'AiTaskCreationForm';
    },

    resolvedGoalFormComponent() {
      return this.goalFormComponent || 'AiGoalPlanForm';
    },

    dragStyle() {
      if (!this.isDragging || this.dragCurrentY <= 0) return {};
      return {
        transform: `translateY(${this.dragCurrentY}px)`,
        opacity: Math.max(0.4, 1 - this.dragCurrentY / 300),
        transition: 'none',
      };
    },

    // Intelligent mode detection based on query content or manual toggle
    isTaskMode() {
      // Manual toggle takes precedence
      if (this.manualMode === 'task') return true;
      if (this.manualMode === 'goal' || this.manualMode === 'search') return false;

      // Fall back to intelligent detection if no manual selection
      if (!this.searchQuery) return true;

      const query = this.searchQuery.toLowerCase();

      // Check for time-based keywords (week, month, year, etc.)
      const timeKeywords = /\b(week|month|year|weekly|monthly|yearly|weeks|months|years)\b/;

      // Check for planning keywords
      const planKeywords = /\b(plan|schedule|routine|program|strategy|course|curriculum)\b/;

      // If query contains time or planning keywords, it's goals mode
      if (timeKeywords.test(query) || planKeywords.test(query)) {
        return false;
      }

      // Otherwise, it's task mode
      return true;
    },

    // Two-way binding for the toggle button
    toggleMode: {
      get() {
        if (this.manualMode === 'search') return 'search';
        return this.isTaskMode ? 'task' : 'goal';
      },
      set(value) {
        this.manualMode = value;
        // Reset form when toggling modes
        if (this.hasSubmitted) {
          this.hasSubmitted = false;
          this.isFormValid = false;
        }
      },
    },

    /**
     * Whether to show the Search tab.
     * Visible when opened from search bar (openMode === 'search') or on non-dashboard pages.
     */
    showSearchTab() {
      const isDashboard = this.$route && this.$route.name === 'home';
      return this.openMode === 'search' || !isDashboard;
    },

    /**
     * Whether search is the only visible tab.
     * On non-dashboard pages when not explicitly opened via add button.
     */
    searchOnlyMode() {
      const isDashboard = this.$route && this.$route.name === 'home';
      return this.showSearchTab && this.openMode !== 'add' && !isDashboard;
    },

    /**
     * Whether we are in search mode (toggleMode is 'search')
     */
    isSearchMode() {
      return this.toggleMode === 'search';
    },

    dynamicTitle() {
      if (this.isSearchMode) return 'Search Goals';
      return this.isTaskMode ? 'Add Task with AI' : 'Build Goals with AI';
    },

    intelligentPlaceholder() {
      if (this.isTaskMode) {
        return 'e.g., "Call dentist tomorrow at 2pm", "Buy groceries"';
      }
      return 'e.g., "Learn Python this week", "Plan healthy eating this month", "Build a portfolio this year"';
    },

    canSave() {
      return this.isFormValid;
    },

    activeRoutineId() {
      return this.toolbarTaskRef || (this.$currentTaskData && this.$currentTaskData.id) || null;
    },

    getSaveButtonText() {
      return this.isTaskMode ? 'Create Task' : 'Save Plan & Timeline';
    },

    /**
     * Whether the "Associate Parent Goal" toggle can be enabled.
     * Only enabled when a parent GoalTask is selected in the toolbar.
     */
    canAssociateParentGoal() {
      return !!this.toolbarGoalRef;
    },

    /**
     * Whether any of the prompt tags are area or project tags.
     */
    hasAreaOrProjectTag() {
      return filterAreaProjectTags(this.promptTags).length > 0;
    },

    /**
     * Whether the "Build on Next Steps" toggle can be enabled.
     * - Visible when area/project tags exist in promptTags
     * - In task mode: also requires aiEnhancedTask to be ON
     * - Disabled while dashboard caching is in progress
     * - Disabled if no valid cache exists for matched tags
     */
    canBuildOnNextSteps() {
      if (this.isDashboardCaching) return false;
      if (!this.hasAreaOrProjectTag) return false;
      if (this.isTaskMode && !this.aiEnhancedTask) return false;
      // Check if at least one matched tag has a valid cache
      const matchedTags = filterAreaProjectTags(this.promptTags);
      const cachedData = getAllCachedDashboards(matchedTags);
      return !!cachedData;
    },

    /**
     * Get the dashboard context data to pass as system prompt.
     * Returns null if "Build on Next Steps" is off or no cached data.
     */
    dashboardContextData() {
      if (!this.buildOnNextSteps || !this.hasAreaOrProjectTag) return null;
      const matchedTags = filterAreaProjectTags(this.promptTags);
      return getAllCachedDashboards(matchedTags);
    },

    /**
     * Get the selected parent goal's data (body + contribution) for AI context.
     * Returns null if no goal is selected or toggle is off.
     */
    selectedParentGoalData() {
      if (!this.associateParentGoal || !this.toolbarGoalRef || !this.goalItemsRef) {
        return null;
      }
      const goal = this.goalItemsRef.find((g) => g.id === this.toolbarGoalRef);
      if (!goal) return null;
      return {
        body: goal.body || '',
        contribution: goal.contribution || '',
      };
    },

    // Current date in DD-MM-YYYY format
    todayFormatted() {
      return moment().format('DD-MM-YYYY');
    },

    // Minimum date for date picker in YYYY-MM-DD format (ISO format)
    // Prevents past date selection, allows today and all future dates
    toolbarMinDate() {
      return moment().format('YYYY-MM-DD');
    },

    // Detect period from search query for goals mode
    detectedPeriodFromQuery() {
      if (!this.searchQuery) return 'day';

      const query = this.searchQuery.toLowerCase();
      if (/\b(week|weekly|weeks)\b/.test(query)) return 'week';
      if (/\b(month|monthly|months)\b/.test(query)) return 'month';
      if (/\b(year|yearly|years|annual|annually)\b/.test(query)) return 'year';
      if (/\b(lifetime|life|forever|always)\b/.test(query)) return 'lifetime';
      return 'day';
    },

    // Filtered autocomplete tag suggestions (excludes already-selected tags)
    filteredAutocompleteTags() {
      if (!this.tagInput || !this.userTags || !this.userTags.length) return [];
      const input = this.tagInput.toLowerCase();
      return this.userTags.filter(
        (t) => t.toLowerCase().includes(input) && !this.promptTags.includes(t.toLowerCase()),
      ).slice(0, 6);
    },

    // Whether to show the tags row (has tags or tag input is focused)
    showTagsRow() {
      return this.promptTags.length > 0 || this.tagInputFocused;
    },
  },

  watch: {
    // Initialize when dialog opens
    dialog(newVal) {
      if (newVal) {
        this.resetForm();
        this.initializeToolbar();
        this.exposeTestState();

        // Listen for dashboard caching status
        eventBus.$on(EVENTS.DASHBOARD_CACHING_STATUS, this.handleDashboardCachingStatus);

        // Initialize scroll shadows and focus the input after modal opens
        this.$nextTick(() => {
          this.checkScrollShadows();
          // Delay focus to wait for the dialog/bottom-sheet transition (300ms) to complete.
          // Mobile needs a longer delay so the keyboard doesn't overlap the input.
          const isMobile = this.$vuetify && this.$vuetify.breakpoint.xsOnly;
          const focusDelay = isMobile ? 450 : 350;
          setTimeout(() => {
            this.focusPromptInput();
          }, focusDelay);
        });
      } else {
        // Clean up event listener when dialog closes
        eventBus.$off(EVENTS.DASHBOARD_CACHING_STATUS, this.handleDashboardCachingStatus);
      }
    },

    // Auto-update toolbar period when search query changes (for goals mode)
    searchQuery(newVal) {
      if (!this.isTaskMode && newVal) {
        const detectedPeriod = this.detectedPeriodFromQuery;
        if (detectedPeriod !== 'day') {
          this.toolbarPeriod = detectedPeriod;
        }
      }
    },

    // Watch for period changes and fetch goals for that period
    toolbarPeriod(newPeriod) {
      // Only in goal mode and for week/month/year periods
      if (!this.isTaskMode && ['week', 'month', 'year'].includes(newPeriod)) {
        this.fetchGoalsForPeriod(newPeriod);
      }
    },

    // Watch for date changes and re-fetch goals for the selected period
    // This ensures goalItemsRef updates when user picks a different date
    // (e.g., selecting a date from next week should fetch next week's parent goals)
    // Fires in both Task and Goal modes since GoalRef dropdown can be visible in either
    toolbarDate(newDate, oldDate) {
      if (newDate && newDate !== oldDate) {
        this.fetchGoalsForPeriod(this.toolbarPeriod);
      }
    },

    // Watch for mode changes
    isTaskMode(newIsTaskMode, oldIsTaskMode) {
      // task → goal: if a non-day period is selected, fetch parent goals for it
      if (oldIsTaskMode === true && newIsTaskMode === false) {
        if (['week', 'month', 'year'].includes(this.toolbarPeriod)) {
          this.fetchGoalsForPeriod(this.toolbarPeriod);
        }
        return;
      }

      // goal → task: tasks always target today, but in goal mode the user
      // may have picked a future Friday/EOM date. Reset to today so the
      // task isn't accidentally created for the wrong day.
      if (oldIsTaskMode === false && newIsTaskMode === true) {
        this.toolbarPeriod = 'day';
        this.toolbarDate = this.todayFormatted;
      }
    },

    // Handle search mode transitions:
    // - Entering search mode: remove auto-added routine tags
    // - Leaving search mode: auto-populate routine tags
    isSearchMode(newVal, oldVal) {
      if (newVal === true && oldVal === false) {
        // Entering search mode — clear auto-populated routine tags
        this.removeRoutineTags();
      } else if (oldVal === true && newVal === false) {
        // Leaving search mode — restore routine tags
        this.populateRoutineTags();
      }
    },

    // Auto-select current routine in toolbar
    $currentTaskData: {
      handler(newVal) {
        if (newVal && newVal.id && !this.toolbarTaskRef) {
          this.toolbarTaskRef = newVal.id;
        }
      },
      immediate: true,
    },

    // Persist settings to localStorage on change
    aiEnhancedTask() {
      this.saveSettings();
    },
    associateParentGoal() {
      this.saveSettings();
    },
    buildOnNextSteps() {
      this.saveSettings();
    },

    // Auto-disable "Associate Parent Goal" when no GoalRef is selected
    toolbarGoalRef(newVal) {
      if (!newVal) {
        this.associateParentGoal = false;
      }
    },

    // Auto-select goal in toolbar when goalItemsRef changes
    // Prioritizes goals matching the current task's taskRef
    goalItemsRef: {
      handler(newVal) {
        if (newVal && newVal.length > 0 && !this.toolbarGoalRef) {
          // If there's a current task, try to find a goal that matches its taskRef
          if (this.$currentTaskData && this.$currentTaskData.id) {
            const matchingGoal = newVal.find((goal) => goal.taskRef === this.$currentTaskData.id);
            if (matchingGoal) {
              this.toolbarGoalRef = matchingGoal.id;
              return;
            }
          }
          // Fall back to first goal if no matching goal found or no current task
          this.toolbarGoalRef = newVal[0].id;
        }
      },
      immediate: true,
    },

    // Watch routines to auto-select current task when data is loaded
    routines: {
      handler(newVal) {
        if (newVal && newVal.length > 0 && this.$currentTaskData && this.$currentTaskData.id) {
          // Auto-select in toolbar if not already set
          if (!this.toolbarTaskRef) {
            this.toolbarTaskRef = this.$currentTaskData.id;
          } else if (this.promptTags.length === 0 && this.routineTagsSet.length === 0) {
            // Routines loaded after toolbarTaskRef was already set — populate tags now
            this.populateRoutineTags();
          }

          // Keep existing form auto-selection for backward compatibility
          const currentTaskInRoutines = newVal.find(
            (routine) => routine.id === this.$currentTaskData.id,
          );

          if (currentTaskInRoutines) {
            // For goals mode: auto-select routine in goal form
            if (!this.isTaskMode && this.$refs.goalForm) {
              this.$refs.goalForm.selectedRoutine = this.$currentTaskData.id;
            }

            // For task mode: auto-select taskRef in task form
            if (this.isTaskMode && this.$refs.taskForm) {
              const { taskData } = this.$refs.taskForm;
              if (taskData && !taskData.taskRef) {
                taskData.taskRef = this.$currentTaskData.id;
              }
            }
          }
        }
      },
      immediate: false,
    },

    // Auto-swap routine tags when routine dropdown selection changes
    toolbarTaskRef(newTaskRef) {
      this.loadSettings(newTaskRef);

      // In search mode, do not auto-populate routine tags
      if (this.isSearchMode) return;

      if (!newTaskRef) {
        // Routine cleared — remove auto-added routine tags only
        this.removeRoutineTags();
        return;
      }

      const routine = this.routines.find((r) => r.id === newTaskRef);
      const newRoutineTags = (routine && routine.tags) || [];

      // Remove old routine tags (only those not manually added)
      this.removeRoutineTags();

      // Add new routine tags
      newRoutineTags.forEach((tag) => {
        if (!this.promptTags.includes(tag)) {
          this.promptTags.push(tag);
        }
      });

      // Update tracked routine tags
      this.routineTagsSet = [...newRoutineTags];
    },
  },

  methods: {
    initializeToolbar() {
      // Initialize with today's date
      this.toolbarDate = this.todayFormatted;
      this.toolbarPeriod = 'day';

      // Auto-select current routine if available
      if (this.$currentTaskData && this.$currentTaskData.id) {
        this.toolbarTaskRef = this.$currentTaskData.id;
      }

      // Auto-select goal that matches current task if available
      if (this.goalItemsRef && this.goalItemsRef.length > 0) {
        // Try to find a goal matching the current task's taskRef
        if (this.$currentTaskData && this.$currentTaskData.id) {
          const matchingGoal = this.goalItemsRef.find(
            (goal) => goal.taskRef === this.$currentTaskData.id,
          );
          if (matchingGoal) {
            this.toolbarGoalRef = matchingGoal.id;
            this.populateRoutineTags();
            return;
          }
        }
        // Fall back to first goal if no matching goal found
        this.toolbarGoalRef = this.goalItemsRef[0].id;
      }

      // Populate tags from selected routine
      // (watcher won't fire if toolbarTaskRef value didn't change after reset)
      this.populateRoutineTags();
      this.loadSettings(this.toolbarTaskRef);
    },

    /**
     * Populate promptTags from the currently selected routine's tags.
     * Called on modal open to ensure tags are always populated,
     * even when the toolbarTaskRef watcher doesn't fire.
     * Skipped in search mode — search should start with no auto-populated tags.
     */
    populateRoutineTags() {
      if (this.isSearchMode) return;
      if (!this.toolbarTaskRef || !this.routines || this.routines.length === 0) return;
      const routine = this.routines.find((r) => r.id === this.toolbarTaskRef);
      const routineTags = (routine && routine.tags) || [];
      if (routineTags.length === 0) return;
      routineTags.forEach((tag) => {
        if (!this.promptTags.includes(tag)) {
          this.promptTags.push(tag);
        }
      });
      this.routineTagsSet = [...routineTags];
    },

    handleScroll() {
      const el = this.$refs.scrollableContent;
      if (!el) return;

      this.showTopShadow = el.scrollTop > 10;
      this.showBottomShadow = el.scrollTop < el.scrollHeight - el.clientHeight - 10;
    },

    checkScrollShadows() {
      this.$nextTick(() => {
        this.handleScroll();
      });
    },

    handleSaveClick() {
      if (this.isTaskMode && this.$refs.taskForm) {
        this.$refs.taskForm.saveTask();
      } else if (!this.isTaskMode && this.$refs.goalForm) {
        this.$refs.goalForm.saveGoals();
      }
    },

    handleSubmit() {
      if (!this.searchQuery) return;

      // Search mode: navigate to search page
      if (this.isSearchMode) {
        this.handleSearchNavigate();
        return;
      }

      // Task mode with AI Enhanced OFF: create the task INSTANTLY.
      // We previously awaited the AI classify call here, which added up
      // to ~1.5 s before the modal closed. Now we ship with a safe
      // `priority:do` placeholder and pass `_aiClassifyBody` so the
      // container can refine the priority tag in the background after
      // the goal item is saved. UX is immediate; the priority dashboard
      // self-corrects within ~1 s.
      if (this.isTaskMode && !this.aiEnhancedTask) {
        const queryText = this.searchQuery.trim();
        const tags = [...this.promptTags];
        const hasPriorityTag = tags.some((t) => t.startsWith('priority:'));
        if (!hasPriorityTag) {
          tags.push('priority:do');
        }
        const goalItemData = {
          date: this.toolbarDate || this.todayFormatted,
          period: 'day',
          body: queryText,
          contribution: '',
          taskRef: this.toolbarTaskRef || '',
          goalRef: this.toolbarGoalRef || null,
          tags,
          isMilestone: !!this.toolbarGoalRef,
          _aiClassifyBody: hasPriorityTag ? null : queryText,
        };
        this.$emit('direct-task-create', goalItemData);
        return;
      }

      // Goal mode: if the selected period has fewer sub-periods left than
      // the productivity-tracker thresholds (5 days / 3 weeks / 6 months),
      // ask the user whether to plan for what's left of the current period
      // or roll into the next one. Skip if already answered for this round.
      if (!this.isTaskMode && !this.hasSubmitted && !this.horizonChoiceMade) {
        const horizon = this.computePlanHorizon();
        if (horizon && horizon.belowThreshold) {
          this.horizonInfo = horizon;
          this.showHorizonDialog = true;
          return;
        }
      }

      if (!this.hasSubmitted) {
        this.hasSubmitted = true;
      } else {
        // If already submitted, trigger a re-search in the active form
        this.$nextTick(() => {
          if (this.isTaskMode && this.$refs.taskForm) {
            this.$refs.taskForm.createTask();
          } else if (!this.isTaskMode && this.$refs.goalForm) {
            this.$refs.goalForm.searchGoals();
          }
        });
      }
    },

    /**
     * Expose modal state on window for Playwright e2e tests. Strictly
     * dev/test only — guarded on NODE_ENV. Lets tests assert toolbar
     * state without poking around Vuetify's rendered DOM.
     */
    exposeTestState() {
      if (typeof window === 'undefined') return;
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
      window.__AI_SEARCH_MODAL__ = {
        get period() { return null; },
        get date() { return null; },
        get isTaskMode() { return null; },
        get horizonInfo() { return null; },
        get horizonOpen() { return null; },
      };
      const self = this;
      Object.defineProperties(window.__AI_SEARCH_MODAL__, {
        period: { get: () => self.toolbarPeriod, configurable: true },
        date: { get: () => self.toolbarDate, configurable: true },
        isTaskMode: { get: () => self.isTaskMode, configurable: true },
        horizonInfo: { get: () => self.horizonInfo, configurable: true },
        horizonOpen: { get: () => self.showHorizonDialog, configurable: true },
        searchQuery: { get: () => self.searchQuery, configurable: true },
      });
    },

    /**
     * Compute how many sub-periods remain in the selected toolbar period.
     * Mirrors the productivity thresholds defined in apps/cron/src/utils/
     * getProgressReport.js (weekDays:5, monthWeeks:3, yearMonths:6) so the
     * UI prompt aligns with where streak credit kicks in.
     */
    computePlanHorizon() {
      const period = this.toolbarPeriod;
      if (!['week', 'month', 'year'].includes(period)) return null;

      const now = moment();
      if (period === 'week') {
        const daysLeft = 7 - now.day();
        return {
          period: 'week',
          remaining: daysLeft,
          unitSingular: 'day',
          unitPlural: 'days',
          belowThreshold: daysLeft < 5,
          nextLabel: `next week (starting ${now.clone().add(1, 'week').startOf('week').format('MMM D')})`,
          nextWord: 'next week',
        };
      }
      if (period === 'month') {
        const daysLeftInMonth = now.clone().endOf('month').diff(now, 'days') + 1;
        const weeksLeft = Math.ceil(daysLeftInMonth / 7);
        return {
          period: 'month',
          remaining: weeksLeft,
          unitSingular: 'week',
          unitPlural: 'weeks',
          belowThreshold: weeksLeft < 3,
          nextLabel: `next month (${now.clone().add(1, 'month').format('MMMM YYYY')})`,
          nextWord: 'next month',
        };
      }
      // year
      const monthsLeft = 12 - now.month();
      return {
        period: 'year',
        remaining: monthsLeft,
        unitSingular: 'month',
        unitPlural: 'months',
        belowThreshold: monthsLeft < 6,
        nextLabel: `next year (${now.clone().add(1, 'year').format('YYYY')})`,
        nextWord: 'next year',
      };
    },

    /**
     * Apply the user's horizon choice. For 'next' we splice "next [period]"
     * into the search query so the server (and modifyQueryPeriod) anchor
     * the plan to the next period. For 'current' we proceed as-is — the
     * existing rewrite uses the explicit remaining count.
     */
    chooseHorizon(choice) {
      this.showHorizonDialog = false;
      this.horizonChoiceMade = true;

      if (choice === 'next' && this.horizonInfo) {
        const { period, nextWord } = this.horizonInfo;
        const re = new RegExp(`\\b${period}\\b`, 'gi');
        if (re.test(this.searchQuery)) {
          // Replace the period word in place — preserves user's phrasing.
          this.searchQuery = this.searchQuery.replace(re, nextWord);
        } else {
          // No "year/month/week" in the query (user picked period via the
          // toolbar). Append the qualifier so the server picks up the hint.
          this.searchQuery = `${this.searchQuery.trim()} ${nextWord}`;
        }
      }

      this.$nextTick(() => this.handleSubmit());
    },

    /**
     * Handle keyboard shortcuts in the prompt textarea.
     * Enter submits the prompt.
     * Shift+Enter, Ctrl+Enter, or Cmd+Enter inserts a new line.
     */
    /**
     * Focus the prompt textarea.
     * Uses a two-pass strategy so it works on desktop, Android, and iOS Safari.
     *
     * iOS Safari only allows programmatic focus within the user-gesture stack
     * (click → EventBus emit → dialog = true → $nextTick microtask). This chain
     * is preserved because EventBus.$emit is synchronous and $nextTick runs as a
     * microtask before the browser yields control. A secondary requestAnimationFrame
     * pass catches Android cases where the dialog transition may delay readiness.
     */
    focusPromptInput() {
      const doFocus = () => {
        const ref = this.$refs.promptTextarea;
        if (!ref) return false;
        // Vuetify 1.x VTextarea exposes focus() on the component instance
        if (typeof ref.focus === 'function') {
          ref.focus();
          return true;
        }
        // Fallback: reach the native textarea element directly
        const el = ref.$el && ref.$el.querySelector('textarea');
        if (el) {
          el.focus();
          return true;
        }
        return false;
      };

      // First attempt: microtask timing (maintains iOS user-gesture context)
      if (!doFocus()) {
        // Second attempt: next animation frame (helps Android dialog transitions)
        requestAnimationFrame(doFocus);
      }
    },

    handleKeydown(event) {
      // Vuetify may pass the native event directly or as a wrapper
      const e = event instanceof KeyboardEvent ? event : event.nativeEvent || event;
      if (e.key === 'Enter') {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          // Modifier+Enter: insert new line (allow default textarea behavior)
          return;
        }
        // Enter without modifier: submit
        e.preventDefault();
        if (this.isSearchMode) {
          this.handleSearchNavigate();
        } else {
          this.handleSubmit();
        }
      }
    },

    handleTaskCreated(data) {
      // Task was created successfully
      console.log('Orchestrator: Task created', data);
    },

    /**
     * Infer an Eisenhower-matrix priority for a freshly captured task via
     * the `classifyTaskPriority` AI mutation. Used by the quick-add flow
     * (AI Enhanced OFF) so every new task still lands on the priority
     * dashboard — without forcing the user to tag it manually.
     *
     * Silent by design: race the AI call against a short timeout so the
     * task creation stays instant. On timeout, missing Apollo client, or
     * any server failure, fall back to "do" (the old hard-coded default).
     *
     * @param {string} body The task text.
     * @returns {Promise<string>} one of "do" | "plan" | "delegate" | "automate".
     */
    silentlyClassifyPriority(body) {
      const FALLBACK = 'do';
      const TIMEOUT_MS = 1500;

      const apollo = this.$apollo || (this.$root && this.$root.$apollo);
      if (!apollo || !apollo.mutate) return Promise.resolve(FALLBACK);

      // Build a compact context hint: the selected routine name + parent
      // goal body, if any. Helps the model pick "delegate" vs "do" for
      // borderline items (e.g. "ask landlord" under a house-admin routine).
      const routine = this.toolbarTaskRef
        && Array.isArray(this.tasklist)
        && this.tasklist.find((t) => t.id === this.toolbarTaskRef || t.taskId === this.toolbarTaskRef);
      const parentGoal = this.toolbarGoalRef
        && Array.isArray(this.goalItemsRef)
        && this.goalItemsRef.find((g) => g.id === this.toolbarGoalRef);
      const contextParts = [];
      if (routine && routine.name) contextParts.push(`Routine: ${routine.name}`);
      if (parentGoal && parentGoal.body) contextParts.push(`Parent goal: ${parentGoal.body}`);
      const context = contextParts.join('\n') || null;

      const classifyPromise = apollo
        .mutate({
          mutation: gql`
            mutation classifyTaskPriority($body: String!, $context: String) {
              classifyTaskPriority(body: $body, context: $context) {
                priority
              }
            }
          `,
          variables: { body, context },
          fetchPolicy: 'no-cache',
        })
        .then((res) => {
          const p = res
            && res.data
            && res.data.classifyTaskPriority
            && res.data.classifyTaskPriority.priority;
          const allowed = ['do', 'plan', 'delegate', 'automate'];
          return allowed.includes(p) ? p : FALLBACK;
        })
        .catch((err) => {
          console.warn('classifyTaskPriority failed, using fallback:', err && err.message);
          return FALLBACK;
        });

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(FALLBACK), TIMEOUT_MS);
      });

      return Promise.race([classifyPromise, timeoutPromise]);
    },

    /**
     * Navigate to search page with current filters when in search mode.
     */
    handleSearchNavigate() {
      const query = (this.searchQuery || '').trim();
      if (!query) return;

      const routeQuery = { q: query };
      if (this.toolbarTaskRef) {
        routeQuery.taskRef = this.toolbarTaskRef;
      }
      const tagString = this.promptTags.join(',');
      if (tagString) {
        routeQuery.tags = tagString;
      }

      this.$router.push({ name: 'search', query: routeQuery }).catch(() => {});
      this.closeModal();
    },

    handleGoalsSaved(data) {
      // Goals were saved successfully
      console.log('Orchestrator: Goals saved', data);
    },

    /**
     * Fetch goals from the PARENT period for milestone linking
     *
     * This method is called when:
     * 1. Auto-switch detects week/month/year keywords (searchQuery watcher)
     * 2. User manually changes period in toolbar (toolbarPeriod watcher)
     * 3. User switches from task to goal mode (isTaskMode watcher)
     *
     * Logic (following stepupMilestonePeriodDate hierarchy):
     * - week   → fetches MONTH goals (for milestone options)
     * - month  → fetches YEAR goals (for milestone options)
     * - year   → fetches LIFETIME goals (for milestone options)
     *
     * CRITICAL: Always uses stepupMilestonePeriodDate to calculate parent period.
     * For example, if period='week', it steps up to 'month' with appropriate date.
     *
     * @param {string} period - The current selected period ('week'|'month'|'year')
     */
    fetchGoalsForPeriod(period) {
      // Use toolbar date if available, otherwise calculate default date for current period
      let currentDate;
      if (this.toolbarDate) {
        currentDate = this.toolbarDate;
      } else {
        // Calculate default date for the current period
        switch (period) {
          case 'week':
            currentDate = moment().day(5).format('DD-MM-YYYY');
            break;
          case 'month':
            currentDate = moment().endOf('month').format('DD-MM-YYYY');
            break;
          case 'year':
            currentDate = moment().endOf('year').format('DD-MM-YYYY');
            break;
          default:
            currentDate = moment().format('DD-MM-YYYY');
        }
      }

      // CRITICAL: Step up to parent period using stepupMilestonePeriodDate
      // Example: week → month, month → year, year → lifetime
      const parentPeriodData = stepupMilestonePeriodDate(period, currentDate);

      // Emit the PARENT period data to refetch goals from parent period
      this.handlePeriodAboveChanged(parentPeriodData);
    },

    handlePeriodAboveChanged(data) {
      console.log('Orchestrator: Period above changed', data);
      this.$emit('period-above-changed', data);
    },

    handleSuccess() {
      // Close modal on success
      this.$nextTick(() => {
        this.closeModal();
      });
    },

    closeModal() {
      this.dialog = false;
      this.resetForm();
    },

    // --- Mobile Settings Sub-Drawer ---
    async openSettingsDrawer() {
      await blurActiveElement();
      this.settingsDrawerOpen = true;
    },

    // --- Drag-to-close handlers ---
    onHandleTouchStart(e) {
      this.isDragging = true;
      this.dragStartY = e.touches[0].clientY;
      this.dragCurrentY = 0;
    },

    onHandleTouchMove(e) {
      if (!this.isDragging) return;
      const dy = e.touches[0].clientY - this.dragStartY;
      // Only allow dragging downward
      this.dragCurrentY = Math.max(0, dy);
    },

    onHandleTouchEnd() {
      if (!this.isDragging) return;
      const threshold = 120;
      if (this.dragCurrentY >= threshold) {
        this.closeModal();
      }
      this.isDragging = false;
      this.dragCurrentY = 0;
    },

    // --- Tag methods ---

    /**
     * Remove routine-sourced tags from promptTags.
     * Preserves tags that were manually added by the user.
     */
    removeRoutineTags() {
      this.promptTags = this.promptTags.filter(
        (tag) => !this.routineTagsSet.includes(tag) || this.manuallyAddedTags.includes(tag),
      );
      this.routineTagsSet = [];
    },

    /**
     * Add a tag from the inline input.
     * Marks it as manually added so it persists across routine changes.
     */
    addTag(tagText) {
      const trimmed = (tagText || '').trim().toLowerCase();
      if (!trimmed) return;
      if (!this.promptTags.includes(trimmed)) {
        this.promptTags.push(trimmed);
      }
      if (!this.manuallyAddedTags.includes(trimmed)) {
        this.manuallyAddedTags.push(trimmed);
      }
      this.tagInput = '';
    },

    /**
     * Remove a tag chip.
     */
    removeTag(tag) {
      this.promptTags = this.promptTags.filter((t) => t !== tag);
      this.manuallyAddedTags = this.manuallyAddedTags.filter((t) => t !== tag);
      this.routineTagsSet = this.routineTagsSet.filter((t) => t !== tag);
    },

    /**
     * Merge AI-extracted tags into promptTags (avoids duplicates).
     */
    mergeAiTags(aiTags) {
      if (!aiTags || !aiTags.length) return;
      const existing = new Set(this.promptTags);
      aiTags.forEach((tag) => {
        if (!existing.has(tag)) {
          this.promptTags.push(tag);
        }
      });
    },

    /**
     * Handle keydown in the inline tag input.
     * Enter or comma adds the tag.
     * Backspace on empty input removes the last tag.
     */
    handleTagKeydown(e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        this.addTag(this.tagInput);
      } else if (e.key === 'Backspace' && !this.tagInput && this.promptTags.length) {
        const lastTag = this.promptTags[this.promptTags.length - 1];
        this.removeTag(lastTag);
      }
    },

    /**
     * Select a tag from autocomplete suggestions.
     */
    selectAutocompleteTag(tag) {
      this.addTag(tag);
      this.$nextTick(() => {
        // Re-focus the tag input after selection
        const input = this.$refs.tagInputField || this.$refs.tagInputFieldMobile;
        if (input) input.focus();
      });
    },

    resetForm() {
      this.searchQuery = '';
      this.error = '';
      this.loading = false;
      this.saving = false;
      this.hasSubmitted = false;
      this.isFormValid = false;
      this.showTopShadow = false;
      this.showBottomShadow = false;
      // If opened from search bar, default to search mode; otherwise always reset to task mode
      if (this.openMode === 'search') {
        this.manualMode = 'search';
      } else {
        this.manualMode = null;
      }
      this.settingsMenuOpen = false;
      this.settingsDrawerOpen = false;
      // Reset horizon dialog
      this.showHorizonDialog = false;
      this.horizonInfo = null;
      this.horizonChoiceMade = false;
      // Reset tags
      this.promptTags = [];
      this.routineTagsSet = [];
      this.manuallyAddedTags = [];
      this.tagInput = '';
      this.tagInputFocused = false;
      // Reload user tags from localStorage
      this.userTags = getJSON(localStorage.getItem(USER_TAGS), []);

      // Reset child forms
      this.$nextTick(() => {
        if (this.$refs.taskForm && this.$refs.taskForm.resetForm) {
          this.$refs.taskForm.resetForm();
        }
        if (this.$refs.goalForm && this.$refs.goalForm.resetForm) {
          this.$refs.goalForm.resetForm();
        }
      });
    },

    /**
     * Handle dashboard caching progress events from event bus.
     * Updates isDashboardCaching state to disable Build on Next Steps during caching.
     */
    handleDashboardCachingStatus({ isCaching }) {
      this.isDashboardCaching = isCaching;
    },

    /**
     * Save AI Search modal settings to localStorage.
     * Persists user preferences (mode, toggles) across modal open/close cycles.
     */
    saveSettings() {
      const settings = {
        aiEnhancedTask: this.aiEnhancedTask,
        associateParentGoal: this.associateParentGoal,
        buildOnNextSteps: this.buildOnNextSteps,
      };
      writeAiSearchSettings(this.activeRoutineId, settings);
    },

    /**
     * Load AI Search modal settings from localStorage.
     * Falls back to defaults if no saved settings exist.
     */
    loadSettings(routineId = this.activeRoutineId) {
      const saved = readAiSearchSettings(routineId);
      this.aiEnhancedTask = saved.aiEnhancedTask || false;
      this.associateParentGoal = saved.associateParentGoal || false;
      this.buildOnNextSteps = saved.buildOnNextSteps || false;
    },
  },
};
</script>
<style>
.ai-search-modal-dialog,
.ai-search-modal {
  border-radius: 24px 24px 0 0 !important;
}
@media (min-width: 600px) {
  .ai-search-modal-dialog,
  .ai-search-modal {
    border-radius: 24px !important;
  }
}
</style>
<style scoped>
.ai-search-modal {
  position: relative;
}

.mobile-handle-container {
  display: flex;
  justify-content: center;
  padding: 12px 0 8px 0;
  background: white;
  border-radius: 24px 24px 0 0;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.mobile-handle-container:active {
  cursor: grabbing;
}

.mobile-handle {
  width: 36px;
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
  transition: width 0.2s ease, background-color 0.2s ease;
}

.mobile-handle--dragging {
  width: 48px;
  background-color: #bdbdbd;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: white;
  border-bottom: 1px solid #eeeeee;
}

@media (min-width: 600px) {
  .sticky-header {
    border-radius: 24px 24px 0 0;
  }
}

.sticky-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: white;
  border-top: 1px solid #eeeeee;
  padding: 16px;
}

@media (min-width: 600px) {
  .sticky-footer {
    border-radius: 0 0 24px 24px;
  }
}

.scroll-shadow {
  position: sticky;
  height: 8px;
  width: 100%;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 1;
}

.scroll-shadow--top {
  top: 64px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.08), transparent);
}

.scroll-shadow--bottom {
  bottom: 52px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.08), transparent);
}

.scrollable-content {
  position: relative;
  padding: 8px;
}

@media (max-width: 600px) {
  .scrollable-content {
    padding: 0!important;
  }
}

/* Prompt Box */
.prompt-box {
  border-radius: 20px;
  border: 1px solid #e8e8e8;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  background: #ffffff;
  padding: 12px 16px 12px 16px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.prompt-box:focus-within {
  border-color: #c0c0c0;
  box-shadow: 0 6px 32px rgba(0, 0, 0, 0.10);
}

/* Prompt Tags Row */
.prompt-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding-bottom: 6px;
  margin-bottom: 2px;
  border-bottom: 1px solid #f0f0f0;
}

.prompt-tag-chip {
  height: 24px !important;
  font-size: 12px !important;
  border-radius: 12px !important;
  padding: 0 8px !important;
  margin: 0 !important;
}

.prompt-tag-chip.v-chip--removable >>> .v-chip__content {
  padding-left: 0 !important;
}

.prompt-tag-chip.v-chip--outline {
  border-color: #bdbdbd !important;
  color: #555 !important;
  background: transparent !important;
}

.prompt-tag-icon {
  font-size: 14px !important;
  color: #999 !important;
  margin-right: 1px !important;
  margin-left: -4px !important;
}

/* Colon-separated tag segments with divider borders */
.prompt-tag-segment {
  padding: 0 5px;
  border-right: 1px solid #ccc;
}

.prompt-tag-segment:last-of-type {
  border-right: none;
  padding-right: 0;
}

.prompt-tag-segment:first-of-type {
  padding-left: 0;
}

/* Desktop: show close button on hover, overlapping chip content with shadow */
@media (min-width: 601px) {
  .prompt-tag-chip {
    position: relative;
    overflow: visible !important;
  }

  .prompt-tag-chip >>> .v-chip__close {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0;
    width: 16px !important;
    height: 16px !important;
    font-size: 11px !important;
    background: #fff !important;
    border-radius: 50% !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
    transition: opacity 0.15s ease;
    margin: 0 !important;
    color: #888 !important;
  }

  .prompt-tag-chip:hover >>> .v-chip__close {
    opacity: 1;
  }
}

/* Mobile: always show close button, reduce space after it */
@media (max-width: 600px) {
  .prompt-tag-chip >>> .v-chip__close {
    margin-left: 2px !important;
    margin-right: -10px !important;
    font-size: 14px !important;
  }
}

/* Inline tag input */
.prompt-tag-input-wrapper {
  position: relative;
  flex: 1 1 60px;
  min-width: 60px;
}

.prompt-tag-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 12px;
  line-height: 24px;
  color: #333;
  background: transparent;
  padding: 0 4px;
}

.prompt-tag-input::placeholder {
  color: #bbb;
  font-size: 12px;
}

/* Tag autocomplete dropdown */
.tag-autocomplete {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  max-height: 160px;
  overflow-y: auto;
  margin-top: 4px;
}

.tag-autocomplete-item {
  padding: 6px 12px;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  transition: background 0.1s ease;
}

.tag-autocomplete-item:hover {
  background: #f5f5f5;
}

.prompt-textarea {
  font-size: 15px;
  line-height: 1.6;
}

.prompt-textarea >>> .v-input__slot {
  background: transparent !important;
  padding: 0 !important;
  margin-bottom: 0 !important;
  min-height: auto !important;
  box-shadow: none !important;
}

.prompt-textarea >>> textarea {
  max-height: 72px; /* ~3 rows */
  overflow-y: auto !important;
  font-size: 16px; /* Prevent iOS zoom on focus */
  line-height: 1.6;
  color: #333;
}

.prompt-textarea >>> textarea::placeholder {
  color: #aaa;
  font-size: 14px;
}

.prompt-textarea >>> .v-text-field__details {
  display: none;
}

.prompt-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  gap: 8px;
  flex-wrap: wrap;
}

.prompt-send-btn {
  border-radius: 50% !important;
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  min-height: 36px !important;
  padding: 0 !important;
  flex-shrink: 0 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
  transition: opacity 0.2s ease !important;
}

.prompt-send-btn--inactive {
  opacity: 0.45 !important;
  pointer-events: none !important;
}

.prompt-send-btn .v-icon {
  font-size: 20px !important;
  color: white !important;
}

/* Settings dropdown + send button group */
.prompt-send-group {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.settings-btn {
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.settings-btn:hover {
  opacity: 0.85;
}

.settings-btn.v-btn {
  box-shadow: none !important;
  background: transparent !important;
}

.settings-btn .v-icon {
  font-size: 20px !important;
  color: #666 !important;
}

.settings-menu-list {
  min-width: 220px;
}

.settings-menu-list .v-list__tile {
  padding: 0 12px;
}

.settings-menu-list .v-list__tile__title {
  font-size: 13px;
  white-space: nowrap;
}

.settings-menu-list >>> .v-input--switch {
  margin-top: 0;
  padding-top: 0;
}

/* Condensed GoalTaskToolbar inside prompt-actions */
.prompt-toolbar {
  flex: 1 1 auto;
  min-width: 0;
}

.prompt-toolbar >>> .v-card {
  background: transparent !important;
  box-shadow: none !important;
}

.prompt-toolbar >>> .v-toolbar {
  min-height: 32px !important;
  height: auto !important;
  padding-bottom: 6px !important;
}

.prompt-toolbar >>> .v-toolbar__content {
  min-height: 32px !important;
  height: auto !important;
  padding: 0 !important;
  gap: 6px !important;
}

.prompt-toolbar >>> .selector-item {
  width: auto !important;
  min-width: 0 !important;
  max-width: 140px;
}

.prompt-toolbar >>> .selector-item .v-input__control .v-input__slot {
  min-height: 36px !important;
  max-height: 36px !important;
  padding: 2px 6px !important;
  border-radius: 12px !important;
  background: #f5f5f5 !important;
  border: 1px solid #e8e8e8 !important;
}

.prompt-toolbar >>> .selector-item .v-input__control .v-input__slot .v-select__selections {
  font-size: 12px !important;
  line-height: 20px !important;
}

.prompt-toolbar >>> .selector-item .v-input__control .v-input__slot .v-select__selection {
  font-size: 12px !important;
  line-height: 20px !important;
}

.prompt-toolbar >>> .selector-item .v-input__control .v-input__slot .v-icon {
  font-size: 14px !important;
}

.prompt-toolbar >>> .selector-item .v-input__prepend-inner {
  margin-right: 2px !important;
  padding: 0 !important;
}

.prompt-toolbar >>> .selector-item .v-input__prepend-inner .v-icon {
  font-size: 14px !important;
  margin-right: 2px !important;
}

.prompt-toolbar >>> .selector-item .v-input__append-inner {
  padding-left: 0 !important;
}

.prompt-toolbar >>> .selector-item .v-label {
  font-size: 12px !important;
}

.prompt-toolbar >>> .selector-item input {
  font-size: 12px !important;
}

.prompt-toolbar >>> .selector-item input::placeholder {
  font-size: 12px !important;
}

/* Date selector text alignment with other selectors */
.prompt-toolbar >>> .selector-item .v-text-field__slot input {
  font-size: 12px !important;
  line-height: 20px !important;
}

.prompt-toolbar >>> .selector-item .date-selector-field input {
  font-size: 12px !important;
  line-height: 20px !important;
}

/* Header Layout */
.header-layout {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-section {
  flex: 1;
  display: flex;
  align-items: center;
}

.header-section--center {
  justify-content: center;
}

.header-section--right {
  justify-content: flex-end;
}

/* Mode Toggle Styling */
.mode-toggle {
  border-radius: 24px !important;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mode-btn {
  text-transform: none !important;
  font-weight: 500 !important;
  letter-spacing: 0.5px !important;
  padding: 4px 20px !important;
  min-height: 36px !important;
  transition: all 0.3s ease !important;
}

.mode-btn span {
  font-size: 14px;
}

/* Task Button - Blue when selected */
.mode-btn--task.v-btn--active {
  background-color: #288bd5 !important;
  color: white !important;
}

.mode-btn--task.v-btn--active .v-icon {
  color: white !important;
}

.mode-btn--task:not(.v-btn--active) {
  color: #757575 !important;
}

.mode-btn--task:not(.v-btn--active) .v-icon {
  color: #757575 !important;
}

/* Goal Button - Orange/Amber when selected */
.mode-btn--goal.v-btn--active {
  background-color: #FF9800 !important;
  color: white !important;
}

.mode-btn--goal.v-btn--active .v-icon {
  color: white !important;
}

.mode-btn--goal:not(.v-btn--active) {
  color: #757575 !important;
}

.mode-btn--goal:not(.v-btn--active) .v-icon {
  color: #757575 !important;
}

/* Responsive sizing for mobile */
@media (max-width: 600px) {
  .mode-btn {
    padding: 6px 16px !important;
    min-height: 36px !important;
  }

  .mode-btn span {
    font-size: 13px;
  }

  .mode-btn .v-icon {
    font-size: 18px !important;
  }

  .prompt-box {
    border-radius: 16px;
    padding: 10px 12px 10px 12px;
  }

  .prompt-send-btn {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    min-height: 32px !important;
  }

  .prompt-actions {
    flex-wrap: wrap;
  }

  .prompt-toolbar {
    order: 1;
    flex-basis: 100%;
  }

  .prompt-send-btn {
    order: 2;
    margin-left: auto;
  }

  .prompt-send-group {
    order: 2;
    margin-left: auto;
  }

  .prompt-toolbar >>> .selector-item {
    max-width: 120px;
  }

  /* Prevent iOS Safari auto-zoom on input focus (requires font-size >= 16px) */
  .prompt-textarea >>> textarea {
    font-size: 16px !important;
  }

  .prompt-textarea >>> textarea::placeholder {
    font-size: 16px !important;
  }

  .prompt-tag-input {
    font-size: 16px !important;
  }

  .prompt-tag-input::placeholder {
    font-size: 16px !important;
  }
}

/* Search Button - Teal when selected */
.mode-btn--search.v-btn--active {
  background-color: #009688 !important;
  color: white !important;
}

.mode-btn--search.v-btn--active .v-icon {
  color: white !important;
}

.mode-btn--search:not(.v-btn--active) {
  color: #757575 !important;
}

.mode-btn--search:not(.v-btn--active) .v-icon {
  color: #757575 !important;
}
</style>
