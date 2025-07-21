/**
 * Shared MCP GraphQL Schema Definition
 * This schema is used by both STDIO and HTTP MCP servers
 */

function getSchemaSDL() {
  return `
# Family Routine GraphQL Schema
# This schema provides access to user routines, goals, tasks, and related data

type Query {
  # User queries
  user: User
  users: [User]
  
  # Routine queries
  routineItems: [RoutineItem]
  routineDate(date: String!): RoutineDate
  
  # Goal queries
  goals: [Goal]
  dailyGoals(date: String!): [Goal]
  agendaGoals(date: String!): [Goal]
  goalDatePeriod(period: String!, date: String!): Goal
  
  # Progress and analytics
  weeklyProgress(startDate: String!, endDate: String!): [Progress]
  monthlyProgress(month: String!): [Progress]
}

type Mutation {
  # User mutations
  updateUser(name: String, picture: String): User
  generateApiKey: UserItem
  authGoogle(accessToken: String!, notificationId: String!): UserItem
  
  # Routine item mutations
  addRoutineItem(
    name: String!
    description: String!
    time: String!
    points: Int!
    steps: [StepInputItem]!
    startEvent: String
    endEvent: String
    tags: [String]!
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
    tags: [String]!
  ): RoutineItem
  
  deleteRoutineItem(id: ID!): RoutineItem
  
  # Routine date mutations
  addRoutine(date: String!): RoutineDate
  tickRoutineItem(id: ID!, taskId: String!, ticked: Boolean!): RoutineDate
  passRoutineItem(id: ID!, taskId: String!, ticked: Boolean!, passed: Boolean!): RoutineDate
  waitRoutineItem(id: ID!, taskId: String!, wait: Boolean!): RoutineDate
  skipRoutine(id: ID!, skip: Boolean!): RoutineDate
  
  # Goal mutations
  addGoal(date: String!, period: String!): Goal
  updateGoal(id: ID!, date: String!, period: String!): Goal
  deleteGoal(id: ID!): Goal
  
  # Goal item mutations
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
  
  updateGoalItem(
    id: ID!
    body: String!
    period: String!
    date: String!
    isMilestone: Boolean!
    deadline: String!
    contribution: String!
    reward: String!
    taskRef: String!
    goalRef: String!
    tags: [String]
  ): GoalItem
  
  # New simplified contribution update mutation
  updateGoalItemContribution(
    id: ID!
    contribution: String!
  ): GoalItem
  
  updateGoalItemStatus(id: ID!, status: String!): GoalItem
  deleteGoalItem(id: ID!): GoalItem
  
  # Sub-task mutations
  addSubTask(goalItemId: ID!, body: String!): SubTask
  updateSubTask(id: ID!, body: String, isComplete: Boolean): SubTask
  deleteSubTask(id: ID!): SubTask
}

# Core Types
type User {
  id: ID!
  name: String
  email: String!
  picture: String
  groupId: String
  apiKey: String
  preferences: UserPreferences
  createdAt: String
  lastActiveAt: String
}

type UserItem {
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
  motto: [MottoItem]
  tags: [String]
}

type MottoItem {
  text: String
  category: String
}

type UserPreferences {
  theme: String
  notifications: Boolean
  timezone: String
}

type RoutineItem {
  id: ID!
  name: String!
  description: String
  time: String!
  points: Int!
  ticked: Boolean
  passed: Boolean
  wait: Boolean
  startEvent: String
  endEvent: String
  tags: [String]
  steps: [Step]
  stimuli: [Stimulus]
}

type Step {
  id: ID!
  name: String!
}

type Stimulus {
  name: String!
  splitRate: Float
  earned: Float
}

type RoutineDate {
  id: ID!
  date: String!
  skip: Boolean
  tasklist: [RoutineItem]
}

type Goal {
  id: ID!
  date: String!
  period: String!
  goalItems: [GoalItem]
}

type GoalItem {
  id: ID!
  body: String!
  isComplete: Boolean
  isMilestone: Boolean
  deadline: String
  contribution: String
  reward: String
  taskRef: String
  goalRef: String
  tags: [String]
  subTasks: [SubTask]
  status: String
  progress: Int
  createdAt: String
  completedAt: String
  originalDate: String
}

type SubTask {
  id: ID!
  body: String!
  isComplete: Boolean
}

type Progress {
  date: String!
  completed: Int
  total: Int
  percentage: Float
  points: Int
}

# Input Types
input StepInputItem {
  id: ID!
  name: String!
}

input UserInput {
  name: String
  picture: String
  preferences: UserPreferencesInput
}

input UserPreferencesInput {
  theme: String
  notifications: Boolean
  timezone: String
}

input RoutineInput {
  name: String!
  description: String
  time: String!
  points: Int!
  steps: [StepInputItem]
  startEvent: String
  endEvent: String
  tags: [String]
}

input GoalInput {
  date: String!
  period: String!
  goalItems: [GoalItemInput]
}

input GoalItemInput {
  body: String!
  isComplete: Boolean
  isMilestone: Boolean
  deadline: String
  contribution: String
  reward: String
  taskRef: String
  goalRef: String
  tags: [String]
}

# Enums
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
