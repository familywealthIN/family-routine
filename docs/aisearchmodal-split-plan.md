# AiSearchModal Component Split Plan

## Overview
AiSearchModal is the most complex component in the codebase with **1,762 lines** of code. It requires a multi-phase splitting approach to maintain functionality while improving maintainability.

## Current State Analysis

### Component Statistics
- **Total Lines**: 1,762
- **Props**: 1 (value - v-model for dialog)
- **Data Properties**: 16
- **Computed Properties**: 11
- **Methods**: 21
- **Watchers**: 9 (including deep watchers)
- **GraphQL Queries**: 2
- **GraphQL Mutations**: 5
- **Complexity Score**: 10/10 (Maximum)

### Core Responsibilities
1. **Intelligent Mode Detection**: Automatically detects if user wants to create a task or generate goal plan
2. **Task Extraction**: AI-powered natural language to task conversion
3. **Milestone Generation**: AI-generated goal milestones and timelines
4. **Related Goals Display**: Shows contextual timeline of related goals
5. **Routine Integration**: Links tasks to existing routines
6. **Bulk Goal Creation**: Creates multiple goal items from AI-generated plans

### Key Dependencies
- OpenAI API (AI integration)
- GraphQL (5 mutations, 2 queries)
- GoalTagsInput molecule
- VueEasymde (markdown editor)
- eventBus (EVENTS.TASK_CREATED, EVENTS.GOALS_SAVED)
- taskStatusMixin
- getDates utility (stepupMilestonePeriodDate, getTimelineEntryPeriod, getTimelineEntryDate)

---

## Proposed Component Breakdown

### Phase 1: Extract Atomic Components (Week 1)

#### 1. atoms/ModeIndicator/
**Purpose**: Display current mode (task/goals) with icon  
**Lines**: ~20  
**Props**: `mode` (string: 'task' | 'goals')  
**Features**:
- Icon display based on mode
- Optional label text
- Color coding

#### 2. atoms/ScrollShadowIndicator/
**Purpose**: Visual scroll position indicators  
**Lines**: ~30  
**Props**: `showTop` (boolean), `showBottom` (boolean)  
**Features**:
- Top gradient shadow
- Bottom gradient shadow
- Smooth transitions

#### 3. atoms/LoadingIndicator/
**Purpose**: Generic loading spinner with message  
**Lines**: ~15  
**Props**: `loading` (boolean), `message` (string)  
**Features**:
- Centered spinner
- Optional loading text

---

### Phase 2: Extract Simple Molecules (Week 2)

#### 4. molecules/AiSearchInput/
**Purpose**: Intelligent search field with dynamic placeholder  
**Lines**: ~80  
**Props**: 
- `value` (string - v-model)
- `placeholder` (string)
- `loading` (boolean)
- `mode` (string)

**Features**:
- Auto-expanding textarea
- Mode-specific placeholder text
- Loading state
- Focus management

**Events**:
- `input` - Value changes
- `submit` - Enter key pressed

#### 5. molecules/PlanConfigSelector/
**Purpose**: Routine and period selection for goal plans  
**Lines**: ~100  
**Props**:
- `selectedRoutine` (object)
- `selectedPeriod` (string)
- `routines` (array)
- `periodOptions` (array)

**Features**:
- Routine dropdown
- Period toggle buttons
- Validation feedback

**Events**:
- `update:routine` - Routine changed
- `update:period` - Period changed

---

### Phase 3: Extract Complex Molecules (Week 3)

#### 6. molecules/RelatedTasksTimeline/
**Purpose**: Condensed timeline of related goals  
**Lines**: ~120  
**Props**:
- `tasks` (array)
- `currentTask` (object)
- `period` (string)

**Features**:
- Grouped by date
- Color-coded by status
- Formatted time display
- Compact view optimized for modal

**Methods**:
- `formatTime(time)` - 12/24hr formatting
- `formatDateToDayOfWeek(date)` - Human readable dates
- `getTimelineColor(status)` - Status-based colors

#### 7. molecules/TimelineEntryEditor/
**Purpose**: Editable timeline item with markdown support  
**Lines**: ~180  
**Props**:
- `entry` (object - milestone/goal item)
- `index` (number)
- `editorKey` (string - for editor refresh)

**Features**:
- Inline markdown editor (EasyMDE)
- Period/date display
- Remove button
- Auto-save integration

**Events**:
- `update:entry` - Entry content changed
- `remove` - Entry deleted

**Dependencies**:
- VueEasymde
- getDates utility

---

### Phase 4: Extract Sub-Organisms (Week 4-5)

#### 8. organisms/AiTaskCreationForm/
**Purpose**: AI-powered task extraction and editing  
**Lines**: ~300  
**Props**:
- `taskData` (object)
- `routines` (array)
- `userTags` (array)
- `loading` (boolean)
- `saving` (boolean)

**Data**:
- taskSuccess (boolean)
- editorConfig (object)

**Computed**:
- routineTasksData
- currentTaskHasWeekGoals
- currentTaskWeekGoal

**Features**:
- Natural language input
- AI extraction to structured task
- Routine selection
- Tag management
- Task preview
- Related week goals display

**Methods**:
- `extractTask()` - Call AI to extract task
- `saveTask()` - Save task to backend
- `updateTaskTags()` - Manage tags

**GraphQL**:
- Mutation: `extractDayTask`

**Events**:
- `saved` - Task successfully saved
- `cancel` - User cancelled

#### 9. organisms/AiGoalPlanForm/
**Purpose**: AI milestone generation and bulk goal creation  
**Lines**: ~350  
**Props**:
- `milestoneData` (array)
- `selectedRoutine` (object)
- `selectedPeriod` (string)
- `routines` (array)
- `periodOptions` (array)
- `userTags` (array)
- `loading` (boolean)
- `saving` (boolean)

**Data**:
- editorKey (string)
- goalItems (array)

**Computed**:
- planTitlePeriodData
- goalRefPeriodData

**Features**:
- Goal plan query input
- AI milestone generation
- Editable timeline entries
- Bulk goal creation
- Simple vs. detailed save modes
- Goal reference linking

**Methods**:
- `generateMilestonePlan()` - AI plan generation
- `saveGoals()` - Bulk create with references
- `saveGoalsSimple()` - Quick bulk create
- `modifyQueryPeriod()` - Adjust timeline periods

**GraphQL**:
- Mutation: `generateMilestonePlan`
- Mutation: `bulkAddGoalItems`
- Mutation: `addGoalItem`
- Mutation: `updateGoalItemContribution`
- Query: `goalItemsRef`
- Query: `relatedGoalsData`

**Events**:
- `saved` - Goals successfully saved
- `cancel` - User cancelled

---

### Phase 5: Main Orchestrator (Week 6)

#### 10. organisms/AiSearchModal/
**Purpose**: Modal orchestration and mode management  
**Lines**: ~400  
**Props**:
- `value` (boolean - v-model for dialog visibility)

**Data**:
- searchQuery (string)
- loading (boolean)
- saving (boolean)
- error (string)
- selectedRoutine (object)
- selectedGoalPeriod (string)
- taskData (object)
- milestoneData (array)
- userTags (array)
- routines (array)
- goalPeriodOptions (array)

**Computed**:
- `dialog` - v-model proxy
- `isTaskMode` - Mode detection based on query
- `dynamicTitle` - Modal title based on mode
- `intelligentPlaceholder` - Context-aware placeholder
- `canSave` - Validation for save button
- `getSaveButtonText` - Dynamic save button text

**Features**:
- Mode switching (task ↔ goals)
- Search query monitoring
- Route integration ($route watcher)
- Authentication validation ($root.$data.email watcher)
- Component lifecycle management
- EventBus integration

**Methods**:
- `handleScroll()` - Scroll shadow management
- `checkScrollShadows()` - Update shadow visibility
- `handleSaveClick()` - Delegate to appropriate form
- `resetForm()` - Clear all state
- `closeModal()` - Close and cleanup
- `refreshApolloQueries()` - Refresh data after mutations
- `loadRoutines()` - Fetch available routines
- `loadGoalPeriods()` - Load period options
- `autoSelectGoalPeriod()` - Intelligent period selection

**Watchers**:
- `$route` - Handle navigation changes
- `$root.$data.email` - Reset on auth changes
- `dialog` - Load data on open
- `searchQuery` - Detect mode changes
- `taskData.taskRef` - Load related week goals
- `routines` - Auto-select routine

**Template Structure**:
```vue
<v-dialog v-model="dialog" fullscreen>
  <v-card>
    <v-toolbar>
      <ModeIndicator :mode="isTaskMode ? 'task' : 'goals'" />
      <v-toolbar-title>{{ dynamicTitle }}</v-toolbar-title>
      <v-btn @click="closeModal">Close</v-btn>
    </v-toolbar>

    <ScrollShadowIndicator :showTop="showTopShadow" :showBottom="showBottomShadow" />

    <v-card-text @scroll="handleScroll">
      <AiSearchInput
        v-model="searchQuery"
        :placeholder="intelligentPlaceholder"
        :loading="loading"
        :mode="isTaskMode ? 'task' : 'goals'"
      />

      <AiTaskCreationForm
        v-if="isTaskMode"
        :taskData="taskData"
        :routines="routines"
        :userTags="userTags"
        :loading="loading"
        :saving="saving"
        @saved="handleTaskSaved"
        @cancel="closeModal"
      />

      <AiGoalPlanForm
        v-else
        :milestoneData="milestoneData"
        :selectedRoutine="selectedRoutine"
        :selectedPeriod="selectedGoalPeriod"
        :routines="routines"
        :periodOptions="goalPeriodOptions"
        :userTags="userTags"
        :loading="loading"
        :saving="saving"
        @saved="handleGoalsSaved"
        @cancel="closeModal"
      />
    </v-card-text>

    <v-card-actions>
      <v-btn @click="closeModal">Cancel</v-btn>
      <v-btn 
        :loading="saving" 
        :disabled="!canSave" 
        @click="handleSaveClick"
      >
        {{ getSaveButtonText }}
      </v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>
```

**Events Emitted (to parent)**:
- `input` - Dialog visibility changed

**EventBus Events Emitted**:
- `EVENTS.TASK_CREATED` - After task saved
- `EVENTS.GOALS_SAVED` - After goals saved

---

## Migration Strategy

### Phase 1: Preparation (Day 1)
1. Create comprehensive test cases for current AiSearchModal
2. Document all user flows (task creation, goal plan generation)
3. Capture screenshots of all states
4. Set up feature flag for gradual rollout

### Phase 2: Atom Extraction (Days 2-3)
1. Create ModeIndicator atom with stories
2. Create ScrollShadowIndicator atom with stories
3. Create LoadingIndicator atom with stories
4. Test atoms in isolation
5. **No changes to AiSearchModal yet**

### Phase 3: Simple Molecule Extraction (Days 4-6)
1. Create AiSearchInput molecule with stories
2. Create PlanConfigSelector molecule with stories
3. Test molecules in isolation with mock data
4. **No changes to AiSearchModal yet**

### Phase 4: Complex Molecule Extraction (Days 7-10)
1. Create RelatedTasksTimeline molecule
2. Create TimelineEntryEditor molecule
3. Test with real-world data
4. **No changes to AiSearchModal yet**

### Phase 5: Task Form Organism (Days 11-14)
1. Create AiTaskCreationForm organism
2. Extract task-specific logic from AiSearchModal
3. Preserve all GraphQL mutations
4. Test AI extraction flow end-to-end
5. Verify eventBus integration
6. **Still keeping original AiSearchModal intact**

### Phase 6: Goals Form Organism (Days 15-18)
1. Create AiGoalPlanForm organism
2. Extract goals-specific logic from AiSearchModal
3. Preserve bulk mutation logic with fallbacks
4. Test milestone generation flow
5. Verify goal reference linking
6. **Still keeping original AiSearchModal intact**

### Phase 7: Orchestrator Integration (Days 19-22)
1. Create new AiSearchModal with orchestration logic
2. Wire up sub-organisms
3. Test mode switching
4. Verify all watchers function correctly
5. Test route integration
6. **Run both old and new in parallel with feature flag**

### Phase 8: Testing & Validation (Days 23-25)
1. A/B test with feature flag
2. Compare functionality between old and new
3. Performance testing (load times, AI response)
4. Error handling validation
5. Edge case testing

### Phase 9: Rollout (Days 26-28)
1. Gradual rollout via feature flag
2. Monitor error rates
3. Collect user feedback
4. Fix any discovered issues
5. Full rollout
6. **Delete old AiSearchModal after 1 week stable**

### Phase 10: Cleanup (Days 29-30)
1. Remove old component files
2. Update documentation
3. Add comprehensive Storybook stories
4. Final performance audit

---

## Risk Mitigation

### Critical Risks

**1. AI Integration Breaking**
- **Mitigation**: Preserve exact GraphQL mutation signatures
- **Testing**: Mock AI responses for automated tests
- **Fallback**: Feature flag to revert to old component

**2. EventBus Events Not Firing**
- **Mitigation**: Create integration test suite for eventBus
- **Testing**: Manual QA checklist for all event triggers
- **Fallback**: Debug mode to log all event emissions

**3. Deep Watcher State Management**
- **Mitigation**: Document all watcher dependencies
- **Testing**: State transition testing for all watchers
- **Fallback**: Console warnings for unexpected state changes

**4. Bulk Mutation Failures**
- **Mitigation**: Preserve try/catch fallback logic
- **Testing**: Test bulk mutations with intentional failures
- **Fallback**: Simple mutation mode as backup

**5. Route Integration Issues**
- **Mitigation**: Test all route change scenarios
- **Testing**: E2E tests for navigation flows
- **Fallback**: Manual dialog opening as alternative

### Testing Checklist

#### Task Mode
- [ ] Natural language extraction
- [ ] Routine selection and linking
- [ ] Tag management
- [ ] Week goal reference display
- [ ] Task save and eventBus notification
- [ ] Error handling for failed AI calls

#### Goals Mode
- [ ] Milestone plan generation
- [ ] Timeline entry editing
- [ ] Period and routine selection
- [ ] Bulk goal creation
- [ ] Goal reference linking
- [ ] Fallback to simple save
- [ ] Error handling for bulk mutations

#### Mode Switching
- [ ] Auto-detection from search query
- [ ] Manual mode toggle
- [ ] State preservation during switch
- [ ] Proper form reset

#### Integration
- [ ] Route query parameter handling
- [ ] Authentication state changes
- [ ] Scroll shadow updates
- [ ] Apollo query refreshing
- [ ] EventBus event emissions

---

## Success Metrics

### Code Quality
- [ ] Total lines reduced from 1,762 to <400 in orchestrator
- [ ] Complexity score reduced from 10/10 to <5/10
- [ ] All sub-components <200 lines
- [ ] Test coverage >80% for all new components
- [ ] Storybook stories for all atoms/molecules

### Functionality
- [ ] Zero regression in user flows
- [ ] AI extraction accuracy unchanged
- [ ] Bulk mutation success rate unchanged
- [ ] Event emissions working correctly
- [ ] Performance improvements (faster load times)

### Maintainability
- [ ] Clear component responsibilities
- [ ] Reusable molecules for other features
- [ ] Simplified debugging with smaller components
- [ ] Better type safety with focused props
- [ ] Easier onboarding for new developers

---

## Component File Structure (After Split)

```
src/components/
├── atoms/
│   ├── ModeIndicator/
│   │   ├── ModeIndicator.vue
│   │   ├── ModeIndicator.stories.js
│   │   └── README.md
│   ├── ScrollShadowIndicator/
│   │   ├── ScrollShadowIndicator.vue
│   │   ├── ScrollShadowIndicator.stories.js
│   │   └── README.md
│   └── LoadingIndicator/
│       ├── LoadingIndicator.vue
│       ├── LoadingIndicator.stories.js
│       └── README.md
│
├── molecules/
│   ├── AiSearchInput/
│   │   ├── AiSearchInput.vue
│   │   ├── AiSearchInput.stories.js
│   │   └── README.md
│   ├── PlanConfigSelector/
│   │   ├── PlanConfigSelector.vue
│   │   ├── PlanConfigSelector.stories.js
│   │   └── README.md
│   ├── RelatedTasksTimeline/
│   │   ├── RelatedTasksTimeline.vue
│   │   ├── RelatedTasksTimeline.stories.js
│   │   └── README.md
│   └── TimelineEntryEditor/
│       ├── TimelineEntryEditor.vue
│       ├── TimelineEntryEditor.stories.js
│       └── README.md
│
└── organisms/
    ├── AiTaskCreationForm/
    │   ├── AiTaskCreationForm.vue
    │   ├── AiTaskCreationForm.stories.js
    │   └── README.md
    ├── AiGoalPlanForm/
    │   ├── AiGoalPlanForm.vue
    │   ├── AiGoalPlanForm.stories.js
    │   └── README.md
    └── AiSearchModal/
        ├── AiSearchModal.vue (new orchestrator - 400 lines)
        ├── AiSearchModal.stories.js
        ├── AiSearchModal.spec.js (integration tests)
        └── README.md
```

---

## Estimated Timeline

- **Total Duration**: 30 working days (~6 weeks)
- **Developer Effort**: 1 senior developer full-time
- **QA Effort**: 1 QA engineer 50% time (weeks 4-6)
- **Review Points**: End of Phase 2, 4, 6, 7, 9

## Rollback Plan

If critical issues are discovered:
1. **Immediate**: Disable feature flag (reverts to old component)
2. **Day 1-3**: Debug and fix issues in new components
3. **Day 4-7**: Re-test and gradual re-rollout
4. **If unfixable**: Keep old component, pause migration

---

## Conclusion

This migration is the most critical and complex task in the atomic design restructuring. Success requires:
- Methodical phased approach
- Comprehensive testing at each phase
- Feature flag for safe rollout
- Close monitoring during transition
- Willingness to rollback if needed

The end result will be a maintainable, testable, and extensible AI search system that can evolve with future requirements.

**Recommendation**: Dedicate a full sprint (2 weeks minimum) to just this component migration, treating it as a major project milestone.
