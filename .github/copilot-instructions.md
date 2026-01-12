# Copilot Instructions for Family Routine Project

## Project Overview

**Project Name**: Family Routine / Routine Notes  
**Framework**: Vue.js 2.x  
**Backend**: GraphQL with Express and MongoDB (Mongoose)  
**Architecture**: Full-stack application with atomic design for UI components  
**Purpose**: A family routine and goal management application with AI-powered features

## Tech Stack

### Frontend

- **Framework**: Vue.js 2.6.x with Vuetify 1.x
- **State Management**: Apollo Client for GraphQL state
- **Router**: Vue Router
- **UI Library**: Vuetify (Material Design)
- **Icons**: Material Design Icons
- **Rich Text**: EasyMDE (Markdown editor)
- **Authentication**: Google OAuth 2.0 with JWT

### Backend

- **Server**: Express.js
- **API**: GraphQL (express-graphql)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with Google OAuth strategy
- **Data Encryption**: Custom encryption utility for sensitive user data
- **Push Notifications**: Firebase Cloud Messaging
- **Serverless**: AWS Lambda support via serverless framework

### DevOps & Tools

- **Build Tool**: Vue CLI with Webpack
- **Package Manager**: Yarn
- **Linting**: ESLint
- **Version Control**: Git
- **Deployment**: Netlify (frontend), AWS Lambda (serverless backend)
- **Component Development**: Storybook (recommended for atomic design components)

## Folder Structure & Atomic Design

The project follows **Atomic Design methodology** for organizing UI components. Here's the complete structure:

```
family-routine/
├── public/                          # Static assets
│   ├── img/
│   │   ├── icons/                  # App icons
│   │   └── splash_screens/         # PWA splash screens
│   ├── index.html
│   ├── manifest.json               # PWA manifest
│   └── firebase-messaging-sw.js    # Service worker for FCM
│
├── src/
│   ├── components/                 # UI Components (Atomic Design)
│   │   ├── atoms/                  # Smallest reusable components
│   │   │   ├── Badge/
│   │   │   ├── EmptyState/
│   │   │   ├── ErrorState/
│   │   │   ├── InfoTooltip/
│   │   │   ├── LoadingState/
│   │   │   ├── ProgressIndicator/
│   │   │   └── WakeCheck/
│   │   │
│   │   ├── molecules/              # Combinations of atoms
│   │   │   ├── ConfirmDialog/
│   │   │   ├── DateSelector/
│   │   │   ├── ExpandPanel/
│   │   │   ├── FileUpload/
│   │   │   ├── GoalTagsInput/
│   │   │   ├── Pagination/
│   │   │   ├── QuickGoalCreation/
│   │   │   ├── StreakChecks/
│   │   │   ├── SubTaskItemList/
│   │   │   ├── TagEditor/
│   │   │   ├── TimelineItemList/
│   │   │   └── TimeSelector/
│   │   │
│   │   ├── organisms/              # Complex functional components
│   │   │   ├── Comments/
│   │   │   ├── GoalCreation/
│   │   │   ├── GoalItemMilestoneList/
│   │   │   ├── NotificationCenter/
│   │   │   ├── SettingsPanel/
│   │   │   ├── TaskList/
│   │   │   └── UserHistory/
│   │   │
│   │   ├── templates/              # Page layouts
│   │   │   ├── ActionBar/
│   │   │   ├── DashboardCards/
│   │   │   ├── FormCard/
│   │   │   ├── ListCard/
│   │   │   ├── PageLayout/
│   │   │   ├── ProfileCard/
│   │   │   ├── SearchBar/
│   │   │   └── StatsGrid/
│   │   │
│   │   ├── AiSearchModal.vue       # Legacy components (to be migrated)
│   │   ├── AreaSidebar.vue
│   │   ├── CircadianCycle.vue
│   │   ├── ContainerBox.vue
│   │   ├── GoalDisplay.vue
│   │   ├── GoalItemList.vue
│   │   ├── GoalList.vue
│   │   ├── GoalsFilterTime.vue
│   │   ├── PendingList.vue
│   │   ├── ProjectSidebar.vue
│   │   ├── RadarChart.vue
│   │   ├── TaskStatusTag.vue
│   │   └── YearGoalSidebar.vue
│   │
│   ├── views/                      # Page components (routes)
│   │   ├── Home.vue
│   │   ├── Profile.vue
│   │   ├── Settings.vue
│   │   ├── Progress.vue
│   │   ├── Groups.vue
│   │   └── About.vue
│   │
│   ├── layouts/                    # Layout wrappers
│   │   ├── DesktopLayout.vue
│   │   └── MobileLayout.vue
│   │
│   ├── containers/                 # Container components (data + presentation)
│   │   ├── ProfileTime.vue
│   │   ├── SettingsTime.vue
│   │   ├── AgendaTime.vue
│   │   └── DashboardTime.vue
│   │
│   ├── composables/                # Vue composition utilities
│   │   └── useTaskStatus.js
│   │
│   ├── mixins/                     # Vue mixins
│   │
│   ├── utils/                      # Utility functions
│   │   ├── aiApi.js                # AI/OpenAI integration
│   │   ├── getDates.js             # Date manipulation
│   │   ├── getJSON.js              # JSON parsing
│   │   ├── eventBus.js             # Event communication
│   │   └── encryption.js           # Data encryption
│   │
│   ├── constants/                  # Constants and configs
│   │   ├── goals.js
│   │   └── settings.js
│   │
│   ├── store/                      # Vuex store (if needed)
│   │
│   ├── styles/                     # Global styles
│   │   └── theme.css
│   │
│   ├── server/                     # Backend GraphQL server
│   │   ├── graphql.js              # GraphQL server setup
│   │   ├── passport.js             # Authentication strategies
│   │   ├── db.js                   # MongoDB connection
│   │   ├── handler.js              # Lambda handler
│   │   │
│   │   ├── schema/                 # GraphQL schemas
│   │   │   ├── UserSchema.js
│   │   │   ├── RoutineSchema.js
│   │   │   ├── GoalSchema.js
│   │   │   ├── ProgressSchema.js
│   │   │   ├── RoutineItemSchema.js
│   │   │   ├── MottoSchema.js
│   │   │   ├── AiSchema.js
│   │   │   └── mcpSchema.js
│   │   │
│   │   ├── resolvers/              # GraphQL resolvers
│   │   │   ├── index.js
│   │   │   ├── userItem.js
│   │   │   ├── routine.js
│   │   │   ├── goal.js
│   │   │   ├── routineItem.js
│   │   │   ├── subTaskItem.js
│   │   │   ├── progress.js
│   │   │   ├── motto.js
│   │   │   └── ai.js
│   │   │
│   │   ├── utils/                  # Server utilities
│   │   │   ├── getEmailfromSession.js
│   │   │   ├── validateGroupUser.js
│   │   │   ├── ApiError.js
│   │   │   ├── encryption.js
│   │   │   └── stimulusPoints.js
│   │   │
│   │   └── mcp-server.js           # Model Context Protocol server
│   │
│   ├── App.vue                     # Root component
│   ├── main.js                     # App entry point
│   ├── router.js                   # Vue Router config
│   └── token.js                    # Auth token management
│
├── docs/                           # Documentation
│   ├── account-deletion.md
│   ├── analytics-events-catalog.md
│   ├── encryption.md
│   ├── priority-system-update.md
│   └── task-status-system.md
│
├── cron/                           # Scheduled tasks
│   ├── send-notification.js
│   ├── update-holidays.js
│   ├── weekly-agenda.js
│   └── progress.js
│
├── scripts/                        # Build/setup scripts
│   ├── create-env.js
│   ├── encrypt-existing-data.js
│   └── setup-encryption.js
│
├── .github/
│   └── copilot-instructions.md     # This file
│
├── package.json
├── vue.config.js
├── babel.config.js
├── serverless.yml                  # AWS Lambda config
├── netlify.toml                    # Netlify config
└── README.md
```

## Coding Standards & Conventions

### 1. Component Organization (Atomic Design)

#### **Atoms** (`src/components/atoms/`)

- **Definition**: Smallest, indivisible UI components
- **Examples**: Buttons, inputs, icons, badges, loading spinners
- **Rules**:
  - Must be purely presentational
  - No business logic or API calls
  - Accept props only, emit events
  - Single responsibility principle
  - Fully reusable across the app

**Structure**:

```
atoms/
└── Button/
    ├── Button.vue           # Component implementation
    ├── Button.stories.js    # Storybook stories
    ├── Button.spec.js       # Unit tests
    └── README.md            # Usage documentation
```

**Example**:

```vue
<!-- atoms/Badge/Badge.vue -->
<template>
  <span :class="['badge', `badge--${variant}`]">
    <slot />
  </span>
</template>

<script>
export default {
  name: 'AtomBadge',
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (value) =>
        ['primary', 'success', 'warning', 'error'].includes(value),
    },
  },
};
</script>

<style scoped>
.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}
.badge--primary {
  background: #1976d2;
  color: white;
}
.badge--success {
  background: #4caf50;
  color: white;
}
.badge--warning {
  background: #ff9800;
  color: white;
}
.badge--error {
  background: #f44336;
  color: white;
}
</style>
```

#### **Molecules** (`src/components/molecules/`)

- **Definition**: Simple combinations of atoms
- **Examples**: Form fields with labels, search bars, card headers
- **Rules**:
  - Combine 2-5 atoms
  - Still presentational but can have light logic
  - Reusable across multiple contexts
  - Maintain single purpose

**Structure**:

```
molecules/
└── DateSelector/
    ├── DateSelector.vue
    ├── DateSelector.stories.js
    ├── DateSelector.spec.js
    └── README.md
```

**Example**:

```vue
<!-- molecules/ConfirmDialog/ConfirmDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="400">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="handleCancel">{{ cancelText }}</v-btn>
        <v-btn :color="confirmColor" @click="handleConfirm">
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'MoleculeConfirmDialog',
  props: {
    value: Boolean,
    title: { type: String, required: true },
    message: { type: String, required: true },
    confirmText: { type: String, default: 'Confirm' },
    cancelText: { type: String, default: 'Cancel' },
    confirmColor: { type: String, default: 'primary' },
  },
  computed: {
    isOpen: {
      get() {
        return this.value;
      },
      set(val) {
        this.$emit('input', val);
      },
    },
  },
  methods: {
    handleConfirm() {
      this.$emit('confirm');
      this.isOpen = false;
    },
    handleCancel() {
      this.$emit('cancel');
      this.isOpen = false;
    },
  },
};
</script>
```

#### **Organisms** (`src/components/organisms/`)

- **Definition**: Complex, feature-complete components
- **Examples**: Navigation bars, forms, data tables, comment sections
- **Rules**:
  - Combine molecules and atoms
  - Can include business logic
  - May connect to GraphQL/API
  - Contextually specific but still reusable

**Structure**:

```
organisms/
└── GoalCreation/
    ├── GoalCreation.vue
    ├── GoalCreation.stories.js
    ├── GoalCreation.spec.js
    └── README.md
```

#### **Templates** (`src/components/templates/`)

- **Definition**: Page-level layouts and structural components
- **Examples**: Dashboard layouts, form layouts, grid systems
- **Rules**:
  - Define page structure
  - Position organisms
  - Handle responsive breakpoints
  - No specific content, only slots

**Structure**:

```
templates/
└── DashboardCards/
    ├── DashboardCards.vue
    ├── DashboardCards.stories.js
    ├── DashboardCards.spec.js
    └── README.md
```

### 2. Storybook Integration

**Storybook** is the recommended tool for developing, documenting, and testing UI components in isolation. Each atomic design component should have corresponding stories.

#### Why Storybook?

- **Isolated Development**: Build components independently from the app
- **Visual Documentation**: Interactive component library
- **Testing**: Visual regression testing and interaction testing
- **Collaboration**: Share components with designers and stakeholders
- **Accessibility**: Test a11y compliance

#### Story File Structure

Each component folder should include a `.stories.js` file:

```javascript
// atoms/Badge/Badge.stories.js
import Badge from './Badge.vue';

export default {
  title: 'Atoms/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'success', 'warning', 'error'],
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Badge },
  template: '<Badge v-bind="$props">{{ label }}</Badge>',
});

export const Primary = Template.bind({});
Primary.args = {
  variant: 'primary',
  label: 'Primary Badge',
};

export const Success = Template.bind({});
Success.args = {
  variant: 'success',
  label: 'Success Badge',
};

export const Warning = Template.bind({});
Warning.args = {
  variant: 'warning',
  label: 'Warning Badge',
};

export const Error = Template.bind({});
Error.args = {
  variant: 'error',
  label: 'Error Badge',
};
```

#### Story Best Practices

1. **Create Multiple Variations**: Show all possible states and variants
2. **Add Controls**: Use Storybook controls for interactive prop manipulation
3. **Document Props**: Use JSDoc comments to document props
4. **Include Edge Cases**: Show loading, error, empty states
5. **Mobile & Desktop**: Create stories for responsive behavior
6. **Accessibility**: Test with a11y addon

#### Example Stories for Different Levels

**Atom Story Example**:

```javascript
// atoms/LoadingState/LoadingState.stories.js
import LoadingState from './LoadingState.vue';

export default {
  title: 'Atoms/LoadingState',
  component: LoadingState,
  parameters: {
    layout: 'centered',
  },
};

export const Default = () => ({
  components: { LoadingState },
  template: '<LoadingState />',
});

export const WithText = () => ({
  components: { LoadingState },
  template: '<LoadingState text="Loading your data..." />',
});

export const Small = () => ({
  components: { LoadingState },
  template: '<LoadingState size="small" />',
});
```

**Molecule Story Example**:

```javascript
// molecules/ConfirmDialog/ConfirmDialog.stories.js
import ConfirmDialog from './ConfirmDialog.vue';

export default {
  title: 'Molecules/ConfirmDialog',
  component: ConfirmDialog,
};

export const Default = () => ({
  components: { ConfirmDialog },
  data() {
    return { show: true };
  },
  template: `
    <div>
      <v-btn @click="show = true">Open Dialog</v-btn>
      <ConfirmDialog
        v-model="show"
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        @confirm="handleConfirm"
        @cancel="handleCancel"
      />
    </div>
  `,
  methods: {
    handleConfirm() {
      console.log('Confirmed');
      this.show = false;
    },
    handleCancel() {
      console.log('Cancelled');
      this.show = false;
    },
  },
});

export const DeleteConfirmation = () => ({
  components: { ConfirmDialog },
  data() {
    return { show: true };
  },
  template: `
    <ConfirmDialog
      v-model="show"
      title="Delete Item"
      message="This action cannot be undone. Are you sure?"
      confirm-text="Delete"
      confirm-color="error"
    />
  `,
});
```

**Organism Story Example**:

```javascript
// organisms/GoalCreation/GoalCreation.stories.js
import GoalCreation from './GoalCreation.vue';
import { apolloDecorator } from '@/storybook/decorators';

export default {
  title: 'Organisms/GoalCreation',
  component: GoalCreation,
  decorators: [apolloDecorator],
};

export const NewGoal = () => ({
  components: { GoalCreation },
  data() {
    return {
      newGoalItem: {
        body: '',
        period: 'day',
        date: '',
        tags: [],
      },
    };
  },
  template: '<GoalCreation :newGoalItem="newGoalItem" />',
});

export const EditingGoal = () => ({
  components: { GoalCreation },
  data() {
    return {
      newGoalItem: {
        id: '123',
        body: 'Complete project documentation',
        period: 'week',
        date: '2025-W51',
        tags: ['work', 'documentation'],
        contribution: '## Progress\n\nMade good progress today...',
      },
    };
  },
  template: '<GoalCreation :newGoalItem="newGoalItem" />',
});
```

**Template Story Example**:

```javascript
// templates/DashboardCards/DashboardCards.stories.js
import DashboardCards from './DashboardCards.vue';

export default {
  title: 'Templates/DashboardCards',
  component: DashboardCards,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => ({
  components: { DashboardCards },
  template: '<DashboardCards />',
});

export const Mobile = () => ({
  components: { DashboardCards },
  template: '<DashboardCards />',
});
Mobile.parameters = {
  viewport: {
    defaultViewport: 'mobile1',
  },
};
```

#### Storybook Setup

**Installation**:

```bash
# Install Storybook for Vue 2
npx sb init --type vue

# Install additional addons
yarn add -D @storybook/addon-a11y @storybook/addon-viewport
```

**Configuration** (`.storybook/main.js`):

```javascript
module.exports = {
  stories: ['../src/components/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-viewport',
  ],
  framework: '@storybook/vue',
  core: {
    builder: 'webpack4',
  },
};
```

**Preview Configuration** (`.storybook/preview.js`):

```javascript
import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import 'vuetify/dist/vuetify.min.css';

Vue.use(Vuetify);

export const decorators = [
  (story) => ({
    vuetify: new Vuetify(),
    components: { story },
    template: '<v-app><story /></v-app>',
  }),
];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
```

#### Running Storybook

```bash
# Start Storybook development server
yarn storybook

# Build static Storybook for deployment
yarn build-storybook
```

#### Story Naming Convention

Follow this hierarchy in story titles:

- `Atoms/ComponentName`
- `Molecules/ComponentName`
- `Organisms/ComponentName`
- `Templates/ComponentName`

Example:

```javascript
export default {
  title: 'Atoms/Badge', // NOT 'Components/Atoms/Badge'
  component: Badge,
};
```

### 3. Component Naming Conventions

```javascript
// Atoms
AtomButton, AtomBadge, AtomIcon, AtomInput;

// Molecules
MoleculeSearchBar, MoleculeDatePicker, MoleculeFormField;

// Organisms
OrganismNavbar, OrganismGoalForm, OrganismTaskList;

// Templates
TemplateDashboard, TemplateFormCard, TemplatePageLayout;

// Views (Pages)
HomeView, ProfileView, SettingsView;

// Containers
ProfileTimeContainer, DashboardTimeContainer;

// Layouts
DesktopLayout, MobileLayout;
```

### 3. File Naming

- **Components**: PascalCase (e.g., `GoalCreation.vue`)
- **Utilities**: camelCase (e.g., `getDates.js`)
- **Constants**: camelCase (e.g., `settings.js`)
- **Styles**: kebab-case (e.g., `theme.css`)

### 4. Vue Component Structure

```vue
<template>
  <!-- Template should be clean and readable -->
  <div class="component-name">
    <!-- Use semantic HTML -->
    <!-- Keep logic minimal in template -->
  </div>
</template>

<script>
// 1. Imports
import gql from 'graphql-tag';
import { mapGetters } from 'vuex';

// 2. Component definition
export default {
  name: 'ComponentName', // Always include name

  // 3. Component registration
  components: {
    ChildComponent,
  },

  // 4. Mixins
  mixins: [taskStatusMixin],

  // 5. Props
  props: {
    propName: {
      type: String,
      required: false,
      default: '',
      validator: (value) => true,
    },
  },

  // 6. Data
  data() {
    return {
      localState: null,
    };
  },

  // 7. Computed properties
  computed: {
    ...mapGetters(['getter']),
    computedProp() {
      return this.localState;
    },
  },

  // 8. Apollo queries/mutations
  apollo: {
    queryName: {
      query: gql`query { }`,
      variables() {
        return {};
      },
      update(data) {
        return data;
      },
    },
  },

  // 9. Watchers
  watch: {
    propName(newVal, oldVal) {
      // Handle changes
    },
  },

  // 10. Lifecycle hooks
  created() {},
  mounted() {},
  beforeDestroy() {},

  // 11. Methods
  methods: {
    handleAction() {
      // Method implementation
    },
  },
};
</script>

<style scoped>
/* Component-specific styles */
.component-name {
  /* Styles here */
}

/* Mobile responsive */
@media (max-width: 768px) {
  .component-name {
    /* Mobile styles */
  }
}
</style>
```

### 5. GraphQL Conventions

#### Schema Organization

```javascript
// src/server/schema/EntitySchema.js
const EntitySchema = new mongoose.Schema({
  field: String,
  email: String, // Always include for user-scoped data
  createdAt: { type: Date, default: Date.now },
});

const EntityType = new GraphQLObjectType({
  name: 'Entity',
  fields: {
    id: { type: GraphQLID },
    field: { type: GraphQLString },
  },
});

module.exports = { EntitySchema, EntityModel, EntityType };
```

#### Resolver Organization

```javascript
// src/server/resolvers/entity.js
const query = {
  getEntity: {
    type: EntityType,
    args: { id: { type: GraphQLNonNull(GraphQLID) } },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      return EntityModel.findOne({ _id: args.id, email });
    },
  },
};

const mutation = {
  createEntity: {
    type: EntityType,
    args: { field: { type: GraphQLNonNull(GraphQLString) } },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const entity = new EntityModel({ ...args, email });
      return entity.save();
    },
  },
};

module.exports = { query, mutation };
```

### 6. State Management

- **Apollo Client**: Primary state management for GraphQL data
- **Local Storage**: Persist user preferences (time format, tags)
- **Event Bus**: Cross-component communication for non-parent-child relationships

```javascript
// utils/eventBus.js
import Vue from 'vue';

export const EVENTS = {
  GOAL_ITEM_CREATED: 'goal-item-created',
  TASK_COMPLETED: 'task-completed',
};

export default new Vue();

// Usage
import eventBus, { EVENTS } from '@/utils/eventBus';

// Emit
eventBus.$emit(EVENTS.GOAL_ITEM_CREATED, payload);

// Listen
eventBus.$on(EVENTS.GOAL_ITEM_CREATED, handler);
```

### 7. Authentication & Security

- **JWT Tokens**: Stored in localStorage via `token.js`
- **Session Management**: Middleware validates JWT on every GraphQL request
- **Data Encryption**: Sensitive data encrypted using `encryption.js` utility
- **User Scoping**: All queries/mutations must filter by user email

```javascript
// Always validate user session
const email = getEmailfromSession(context);
if (!email) {
  throw new ApiError('Authentication required', 401);
}
```

### 8. Error Handling

```javascript
// Frontend
try {
  await this.$apollo.mutate({ mutation, variables });
} catch (error) {
  console.error('Error:', error);
  this.$notify({
    title: 'Error',
    text: 'An error occurred',
    group: 'notify',
    type: 'error',
    duration: 3000,
  });
}

// Backend
const { ApiError } = require('../utils/ApiError');
throw new ApiError('Not found', 404);
```

### 9. Responsive Design

```css
/* Mobile-first approach */
.component {
  /* Base mobile styles */
}

/* Tablet */
@media (min-width: 768px) {
  .component {
    /* Tablet styles */
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .component {
    /* Desktop styles */
  }
}
```

### 10. Testing Guidelines

```javascript
// Component.spec.js
import { shallowMount } from '@vue/test-utils';
import Component from './Component.vue';

describe('Component', () => {
  it('renders correctly', () => {
    const wrapper = shallowMount(Component, {
      propsData: { prop: 'value' },
    });
    expect(wrapper.text()).toContain('expected');
  });
});
```

## Common Patterns & Best Practices

### Component Communication

```javascript
// Props down, events up
// Parent
<ChildComponent :data="parentData" @update="handleUpdate" />

// Child
this.$emit('update', newValue);

// Event bus for non-parent-child
import eventBus from '@/utils/eventBus';
eventBus.$emit('event-name', data);
eventBus.$on('event-name', handler);
```

### GraphQL Queries

```vue
<script>
import gql from 'graphql-tag';

export default {
  apollo: {
    items: {
      query: gql`
        query getItems($date: String!) {
          items(date: $date) {
            id
            name
          }
        }
      `,
      variables() {
        return { date: this.selectedDate };
      },
      skip() {
        return !this.$root.$data.email; // Skip if not authenticated
      },
      update(data) {
        return data.items || [];
      },
      error(error) {
        console.error('Query error:', error);
      },
    },
  },
};
</script>
```

### Loading States

```vue
<template>
  <div>
    <LoadingState v-if="$apollo.loading" />
    <EmptyState v-else-if="!items.length" message="No items found" />
    <ItemList v-else :items="items" />
  </div>
</template>
```

### Form Validation

```vue
<v-form ref="form" v-model="valid">
  <v-text-field
    v-model="field"
    :rules="rules.field"
    label="Field"
    required
  />
</v-form>

<script>
export default {
  data() {
    return {
      valid: false,
      field: '',
      rules: {
        field: [
          (v) => !!v || 'Field is required',
          (v) => v.length >= 3 || 'Minimum 3 characters',
        ],
      },
    };
  },
  methods: {
    submit() {
      if (this.$refs.form.validate()) {
        // Process form
      }
    },
  },
};
</script>
```

## Key Features & Modules

### 1. Goal Management

- **Status System**: todo, progress, done, missed, rescheduled
- **Periods**: day, week, month, year, lifetime
- **Milestones**: Goals can have milestone relationships
- **Auto-save**: Contribution field auto-saves after 2s delay

### 2. Routine Management

- **Daily Tasks**: Time-based task scheduling
- **Points System**: Task completion rewards
- **Streak Tracking**: Consecutive completion tracking
- **Notifications**: Firebase push notifications

### 3. AI Integration

- **Goal Summarization**: AI-generated goal summaries
- **Next Steps**: AI suggestions for goal progression
- **Milestone Planning**: AI-generated milestone breakdowns
- **Task Extraction**: Natural language to task conversion

### 4. Data Privacy & Security

- **Encryption**: User data encrypted at rest
- **Apple App Store Compliance**: Account deletion feature
- **GDPR/CCPA**: Right to erasure implementation
- **API Key Management**: User-specific API keys for MCP

### 5. Analytics

- **Event Tracking**: Custom analytics events
- **Progress Tracking**: Goal and task completion metrics
- **User History**: Timeline of user activities

## Migration Guidelines

### Migrating Legacy Components to Atomic Structure

1. **Identify component type** (atom, molecule, organism, template)
2. **Create folder structure** following atomic pattern
3. **Extract reusable parts** into smaller atoms
4. **Update imports** across the application
5. **Add documentation** (README.md in component folder)
6. **Write tests** for new components

**Example Migration**:

```
Before: src/components/GoalCreation.vue (monolithic)

After:
src/components/organisms/GoalCreation/GoalCreation.vue
src/components/molecules/GoalTagsInput/GoalTagsInput.vue
src/components/molecules/SubTaskItemList/SubTaskItemList.vue
src/components/atoms/TaskStatusTag/TaskStatusTag.vue
```

## Environment Setup

```bash
# Install dependencies
yarn install

# Setup encryption keys
yarn setup-encryption

# Run development server
yarn serve

# Run backend GraphQL server
yarn serve:server

# Run MCP server
yarn mcp:server

# Build for production
yarn build

# Run linting
yarn lint

# Start Storybook development server
yarn storybook

# Build static Storybook for deployment
yarn build-storybook
```

## Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/routine-notes

# JWT
JWT_SECRET=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-key

# Firebase (for notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key
ENCRYPTION_IV=your-16-char-encryption-iv
```

## GraphQL API Endpoints

### Queries

- `getUserTags`: Get user profile and tags
- `routineDate(date)`: Get routine for specific date
- `goalDatePeriod(period, date)`: Get goals for period
- `getGoalsSummary(items)`: AI-generated summary
- `getUsersByGroupId(groupId)`: Get group members

### Mutations

- `authGoogle(accessToken, notificationId)`: Google OAuth login
- `addGoalItem(...)`: Create new goal
- `updateGoalItem(...)`: Update existing goal
- `deleteGoalItem(id)`: Delete goal
- `generateApiKey`: Generate user API key
- `deleteAccount`: Permanently delete user account
- `completeOnboarding`: Mark onboarding complete

## Common Tasks

### Creating a New Atom

```bash
# Create folder
mkdir src/components/atoms/NewAtom

# Create component file
touch src/components/atoms/NewAtom/NewAtom.vue
```

```vue
<!-- src/components/atoms/NewAtom/NewAtom.vue -->
<template>
  <div class="atom-new">
    <!-- Implementation -->
  </div>
</template>

<script>
export default {
  name: 'AtomNew',
  props: {
    // Props
  },
};
</script>

<style scoped>
.atom-new {
  /* Styles */
}
</style>
```

### Adding a New GraphQL Resolver

```javascript
// 1. Create schema (src/server/schema/NewSchema.js)
const NewSchema = new mongoose.Schema({
  /* fields */
});
const NewType = new GraphQLObjectType({
  /* type */
});
module.exports = { NewSchema, NewModel, NewType };

// 2. Create resolver (src/server/resolvers/new.js)
const query = {
  /* queries */
};
const mutation = {
  /* mutations */
};
module.exports = { query, mutation };

// 3. Register in index (src/server/resolvers/index.js)
const newResolver = require('./new');
// Add to schema fields
```

### Adding New Route

```javascript
// src/router.js
{
  path: '/new-page',
  name: 'new-page',
  component: () => import('./views/NewPage.vue'),
}
```

## Performance Optimization

- Use `v-show` for frequently toggled elements
- Use `v-if` for conditionally rendered elements
- Lazy-load routes with dynamic imports
- Use computed properties for derived data
- Debounce user input handlers
- Implement virtual scrolling for long lists
- Optimize GraphQL queries (select only needed fields)

## Accessibility (a11y)

- Use semantic HTML
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Maintain color contrast ratios
- Provide alt text for images
- Support screen readers

## Documentation Standards

Each component folder should include:

- **README.md**: Usage examples, props, events
- **Component.stories.js**: Storybook stories for visual documentation
- **Component.spec.js**: Unit tests
- **Component.vue**: Implementation

## Git Workflow

```bash
# Feature branch
git checkout -b feature/new-feature

# Commit with conventional commits
git commit -m "feat: add new atom component"
git commit -m "fix: resolve button padding issue"
git commit -m "docs: update copilot instructions"

# Push and create PR
git push origin feature/new-feature
```

## Deployment

- **Frontend**: Netlify (auto-deploy from main branch)
- **Backend**: AWS Lambda (serverless framework)
- **Database**: MongoDB Atlas

## Support & Resources

- [Vue.js Documentation](https://v2.vuejs.org/)
- [Vuetify Documentation](https://v1.vuetifyjs.com/)
- [GraphQL Documentation](https://graphql.org/)
- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
- [Elegant Frontend Training](https://elegantfrontend.training/ui/)

---

**Last Updated**: December 22, 2025  
**Maintainer**: Family Routine Development Team
