/**
 * Shared MCP GraphQL Schema Definition
 * This schema is used by both STDIO and HTTP MCP servers
 */

function getSchemaSDL() {
  return `
# Routine Notes GraphQL Schema
# This schema provides access to user routines, goals, tasks, and related data
# All dates use DD-MM-YYYY format. Periods: day | week | month | year | lifetime
# Authentication: JWT token required in Authorization header for all operations

type Query {
  # ── User ──────────────────────────────────────────────────────────────────
  # Get the authenticated user's profile, tags, and motto
  getUserTags: UserItem
  # Check for pending group invite
  showInvite: UserItem
  # Get all users in the same group
  getUsersByGroupId(groupId: String!): [UserItem]

  # ── Routine Items (templates) ──────────────────────────────────────────────
  # Get all routine item templates for the user
  routineItems: [RoutineItem]
  # Get all project: prefixed tags from routine items
  projectTags: [String]
  # Get all area: prefixed tags from routine items
  areaTags: [String]

  # ── Routines (daily snapshots) ─────────────────────────────────────────────
  # Get all non-skipped routines for the user
  routines: [Routine]
  # Get the last 7 non-skipped routines
  routineSevenDays: [Routine]
  # Get a single routine by ID
  routine(id: String!): Routine
  # Get or create the routine snapshot for a specific date (DD-MM-YYYY)
  routineDate(date: String!): Routine
  # Get D/K/G stimulus totals for each day of the week containing the given date
  weekStimuli(date: String!): [DayStimuli]
  # Get routines for another user in the same group (last 7)
  routinesByGroupEmail(email: String!, groupId: String!): [Routine]

  # ── Goals ──────────────────────────────────────────────────────────────────
  # Get a single goal by ID
  goal(id: String!): Goal
  # Get goals for a specific date and period
  goalDatePeriod(date: String!, period: String!): Goal
  # Get a specific goal item by date, period, and ID
  goalItem(id: ID!, date: String!, period: String!): GoalItem
  # Get a goal item by its ID alone (searches across all goals)
  goalItemById(id: ID!): GoalItem
  # Get all goals for today and all active periods (day/week/month/year/lifetime)
  dailyGoals(date: String!): [Goal]
  # Optimized version of dailyGoals — fewer DB queries, use this by default
  optimizedDailyGoals(date: String!): [Goal]
  # Get all goals across all periods needed for the agenda view
  agendaGoals(date: String!): [Goal]
  # Get all goals for the upcoming and current month (optimized view)
  goalsOptimized(currentMonth: String): [Goal]
  # Get past day goals (last 365 days with items)
  goalsPast: [Goal]
  # Get all goals within a specific month — pass the last day of the month (DD-MM-YYYY)
  goalsForMonth(month: String!): [Goal]
  # Get current year goal items
  currentYearGoals: [Goal]
  # Get a specific year goal item by ID
  currentYearGoal(id: ID!): GoalItem
  # Search goal items by text across body and contribution fields
  searchGoals(query: String!, limit: String, taskRef: String, tags: String): [Goal]
  # Get all goals whose items include a specific tag
  goalsByTag(tag: String!): [Goal]
  # Get all milestone goal items that reference a parent goal by its ID
  goalsByGoalRef(goalRef: String!): [Goal]
  # Get goal history for a routine task across day/week/month
  monthTaskGoals(date: String!, taskRef: String!): [Goal]
  # Get goals for another user in the same group (last 7)
  goalsByGroupEmail(email: String!, groupId: String!): [Goal]
  # Get priority-sorted goal items for a day (do / plan / delegate / automate)
  priorityGoals(date: String!): PriorityGoals
  # Get the full milestone tree for all user goals
  goalMilestones: GoalMilestone

  # ── Progress & Analytics ───────────────────────────────────────────────────
  # Get progress report for a given period and date range
  getProgress(period: String!, startDate: String!, endDate: String!): Progress

  # ── Mottos ────────────────────────────────────────────────────────────────
  # Get the user's motto list
  motto: [MottoItem]

  # ── AI ────────────────────────────────────────────────────────────────────
  # Generate an AI summary of goal items
  getGoalsSummary(items: [AiItemInput]): Summary
  # Generate AI-suggested next steps for goal items
  getGoalsNextSteps(items: [AiItemInput]): Summary
}

type Mutation {
  # ── Auth ──────────────────────────────────────────────────────────────────
  # Sign in / register with Google Identity Services JWT
  authGoogle(accessToken: String!, notificationId: String!): UserItem
  # Sign in / register with Apple Identity Token
  authApple(identityToken: String!, notificationId: String!): UserItem

  # ── User ──────────────────────────────────────────────────────────────────
  # Generate a new API key for MCP / external tool access
  generateApiKey: UserItem
  # Generate a short-lived OAuth authorization code (expires in 10 min)
  generateOAuthCode: OAuthCode
  # Mark onboarding as complete for the authenticated user.
  # Optional 'name' lets users supply a display name during onboarding;
  # used for Apple sign-in, where Apple returns names only on first
  # authorisation and most users land with "Apple User" placeholder.
  completeOnboarding(name: String): UserItem
  # Permanently delete the user account and all associated data
  deleteAccount: DeleteAccountResponse
  # Invite another user to join your group by email
  sendInvite(invitedEmail: String!): UserItem
  # Accept a pending group invitation
  acceptInvite(inviterEmail: String!): UserItem
  # Decline a pending group invitation
  declineInvite: UserItem
  # Leave the current group
  leaveGroup: UserItem

  # ── Routine Items (templates) ──────────────────────────────────────────────
  addRoutineItem(
    name: String!
    description: String!
    time: String!
    points: Int!
    steps: [StepInputItem]
    startEvent: String
    endEvent: String
    tags: [String]
  ): RoutineItem
  updateRoutineItem(
    id: ID!
    name: String!
    description: String!
    time: String!
    points: Int!
    steps: [StepInputItem]!
    startEvent: String
    endEvent: String
    tags: [String]
  ): RoutineItem
  deleteRoutineItem(id: ID!): RoutineItem
  # Bulk-create routine items; each item is AI-enhanced with description and steps
  bulkAddRoutineItems(routineItems: [RoutineItemInput]!): [RoutineItem]

  # ── Routines (daily snapshots) ─────────────────────────────────────────────
  # Create the routine snapshot for a date if it doesn't exist, using current templates
  addRoutine(date: String!): Routine
  deleteRoutine(id: ID!): Routine
  # Mark/unmark a routine task as ticked (completed)
  tickRoutineItem(id: ID!, taskId: String!, ticked: Boolean!): Routine
  # Mark/unmark a routine task as passed (skipped with pass)
  passRoutineItem(id: ID!, taskId: String!, ticked: Boolean!, passed: Boolean!): Routine
  # Mark/unmark a routine task as waiting
  waitRoutineItem(id: ID!, taskId: String!, wait: Boolean!): Routine
  # Skip or unskip a full routine day (max 2 per week)
  skipRoutine(id: ID!, skip: Boolean!): Routine

  # ── Goal Items ────────────────────────────────────────────────────────────
  # Add a single goal item to the appropriate Goal document for the date/period
  addGoalItem(
    body: String!
    period: String!
    date: String!
    isComplete: Boolean
    isMilestone: Boolean
    deadline: String
    contribution: String
    reward: String
    taskRef: String
    goalRef: String
    tags: [String]
    originalDate: String
  ): GoalItem
  # Bulk-add multiple goal items across any dates/periods in one call
  addBulkGoalItems(goals: [GoalItemInput]!): [GoalItem]
  # Bulk-add goal items (used by AI milestone plan flow)
  bulkAddGoalItems(goalItems: [GoalItemInput]!): [GoalItem]
  # Update a goal item's fields (body, contribution, tags, etc.)
  updateGoalItem(
    id: ID!
    date: String!
    period: String!
    body: String
    isMilestone: Boolean
    deadline: String
    contribution: String
    reward: String
    taskRef: String
    goalRef: String
    tags: [String]
  ): GoalItem
  # Efficiently update only the contribution/notes field of a goal item
  updateGoalItemContribution(id: ID!, contribution: String): GoalItem
  # Auto-save contribution field (same as updateGoalItemContribution, optimized for frequent saves)
  autosaveGoalContribution(id: ID!, date: String!, period: String!, contribution: String): GoalItem
  # Mark or unmark a goal item as complete; triggers stimulus and cascade updates
  completeGoalItem(
    id: ID!
    taskRef: String!
    date: String!
    period: String!
    isComplete: Boolean!
    isMilestone: Boolean!
  ): GoalItem
  # Move a goal item from one date to another with rescheduled status
  rescheduleGoalItem(id: ID!, oldDate: String!, newDate: String!, period: String!): GoalItem
  # Delete the entire Goal document (all items for that date/period)
  deleteGoal(id: ID!): Goal
  # Remove a single goal item from its parent Goal document
  deleteGoalItem(id: ID!, date: String!, period: String!): GoalItem

  # ── Sub-tasks ─────────────────────────────────────────────────────────────
  # Add a sub-task to a goal item
  addSubTaskItem(taskId: ID!, date: String!, period: String!, body: String, isComplete: Boolean): SubTaskItem
  # Update a sub-task's body text
  updateSubTaskItem(id: ID!, taskId: ID!, date: String!, period: String!, body: String): SubTaskItem
  # Delete a sub-task from a goal item
  deleteSubTaskItem(id: ID!, taskId: ID!, date: String!, period: String!): SubTaskItem

  # ── Mottos ────────────────────────────────────────────────────────────────
  addMottoItem(mottoItem: String!): MottoItem
  updateMottoItem(id: ID!, mottoItem: String!): MottoItem
  deleteMottoItem(id: ID!): MottoItem

  # ── AI ────────────────────────────────────────────────────────────────────
  # Generate an AI milestone plan for a goal (returns structured entries ready for bulkAddGoalItems)
  generateMilestonePlan(query: String!, systemPrompt: String): MilestonePlan
  # Extract a structured task from natural language text
  extractDayTask(query: String!, systemPrompt: String): ExtractedTask
  # Silently classify a task into an Eisenhower priority bucket
  # (do | plan | delegate | automate). Used by the quick-add flow to
  # tag tasks so they appear on the priority dashboard.
  classifyTaskPriority(body: String!, context: String): ClassifiedPriority
}

type ClassifiedPriority {
  priority: String
  rationale: String
  error: String
}

# ── Core Types ────────────────────────────────────────────────────────────────

type UserItem {
  id: ID
  name: String
  email: String
  picture: String
  groupId: String
  apiKey: String
  token: String
  notificationId: String
  holidays: Int
  inviterEmail: String
  invitedEmail: String
  needsOnboarding: Boolean
  oauthConnected: Boolean
  motto: [MottoItem]
  tags: [String]
}

type OAuthCode {
  authCode: String
  expiresAt: String
}

type DeleteAccountResponse {
  success: String
  message: String
}

type MottoItem {
  id: ID
  mottoItem: String
}

# A routine item template (the master list; not tied to a date)
type RoutineItem {
  id: ID
  name: String
  description: String
  time: String
  points: Int
  ticked: Boolean
  passed: Boolean
  wait: Boolean
  startEvent: String
  endEvent: String
  tags: [String]
  steps: [Step]
  stimuli: [Stimulus]
}

# A daily routine snapshot — a copy of the template list with per-day ticked/passed/wait state
type Routine {
  id: ID
  date: String
  skip: Boolean
  tasklist: [RoutineItem]
}

type Step {
  id: ID
  name: String
}

type Stimulus {
  name: String
  splitRate: Float
  earned: Float
}

# Per-day D/K/G stimulus totals for the week
type DayStimuli {
  date: String
  D: Float
  K: Float
  G: Float
}

type Goal {
  id: ID
  date: String
  period: String
  goalItems: [GoalItem]
}

type GoalItem {
  id: ID
  email: String
  date: String
  period: String
  body: String
  deadline: String
  contribution: String
  reward: String
  isComplete: Boolean
  isMilestone: Boolean
  taskRef: String
  goalRef: String
  progress: Int
  tags: [String]
  status: String
  createdAt: String
  completedAt: String
  originalDate: String
  subTasks: [SubTaskItem]
  # Resolved routine item name when taskRef is set
  routine: RoutineItemRef
  # Child milestone goal items that reference this item via goalRef
  milestones: [GoalItem]
}

type SubTaskItem {
  id: ID
  body: String
  isComplete: Boolean
}

type RoutineItemRef {
  id: ID
  name: String
}

# Grouped milestone tree across all periods
type GoalMilestone {
  day: [GoalItem]
  week: [GoalItem]
  month: [GoalItem]
  year: [GoalItem]
  lifetime: [GoalItem]
}

# Priority matrix: goal items grouped by priority tag
type PriorityGoals {
  goalId: ID
  date: String
  period: String
  do: [GoalItem]
  plan: [GoalItem]
  delegate: [GoalItem]
  automate: [GoalItem]
}

type Progress {
  D: Float
  K: Float
  G: Float
  totalPoints: Float
  goalProgress: GoalProgress
}

type GoalProgress {
  day: PeriodProgress
  week: PeriodProgress
  month: PeriodProgress
  year: PeriodProgress
}

type PeriodProgress {
  complete: Int
  total: Int
}

# AI Types

type Summary {
  description: String
  nextSteps: String
}

type MilestonePlan {
  period: String
  title: String
  description: String
  entries: [MilestoneEntry]
  error: String
  rawResponse: String
}

type MilestoneEntry {
  period: String
  periodName: String
  date: String
  title: String
  description: String
}

type ExtractedTask {
  title: String
  description: String
  tags: [String]
  dueDate: String
  priority: String
  error: String
}

# ── Input Types ───────────────────────────────────────────────────────────────

input StepInputItem {
  id: ID
  name: String
}

input RoutineItemInput {
  name: String!
  description: String
  time: String!
  points: Int!
  steps: [StepInputItem]
  startEvent: String
  endEvent: String
  tags: [String]
  duration: Int
  type: String
}

input GoalItemInput {
  date: String
  period: String
  body: String
  deadline: String
  contribution: String
  reward: String
  isComplete: Boolean
  isMilestone: Boolean
  taskRef: String
  goalRef: String
  tags: [String]
  status: String
  originalDate: String
}

input AiItemInput {
  body: String
  period: String
  date: String
}

# ── Enums ─────────────────────────────────────────────────────────────────────

enum GoalPeriod {
  day
  week
  month
  year
  lifetime
}

enum TaskStatus {
  todo
  progress
  done
  missed
  rescheduled
}
`;
}

module.exports = {
  getSchemaSDL,
};
