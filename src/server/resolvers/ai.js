const { GraphQLList, GraphQLString, GraphQLNonNull } = require('graphql');
const {
  SummaryType,
  AiItemInput,
  MilestonePlanType,
  ExtractedTaskType,
  GoalItemInput,
} = require('../schema/AiSchema');
const { GoalItemType } = require('../schema/GoalSchema');
const { mutation: goalMutations } = require('./goal');
const getEmailfromSession = require('../utils/getEmailfromSession');
const {
  getSummaryFromGoalItems,
  getNextStepsFromGoalItems,
  generateMilestonePlan,
  extractTaskFromNaturalLanguage,
} = require('../../utils/aiApi');

const query = {
  getGoalsSummary: {
    type: SummaryType,
    args: {
      items: {
        type: new GraphQLList(AiItemInput),
      },
    },
    resolve: async (root, { items }, context) => {
      // Require authentication even for AI operations
      getEmailfromSession(context);

      try {
        const description = await getSummaryFromGoalItems(items);
        return { description, nextSteps: null };
      } catch (error) {
        console.error('Error getting goals summary:', error);
        return { description: 'Unable to generate summary', nextSteps: null };
      }
    },
  },
  getGoalsNextSteps: {
    type: SummaryType,
    args: {
      items: {
        type: new GraphQLList(AiItemInput),
      },
    },
    resolve: async (root, { items }, context) => {
      // Require authentication even for AI operations
      getEmailfromSession(context);

      try {
        const nextSteps = await getNextStepsFromGoalItems(items);
        return { description: null, nextSteps };
      } catch (error) {
        console.error('Error getting next steps:', error);
        return { description: null, nextSteps: 'Unable to generate next steps' };
      }
    },
  },
};

const mutation = {
  generateMilestonePlan: {
    type: MilestonePlanType,
    args: {
      query: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve: async (root, { query: userQuery }, context) => {
      // Require authentication even for AI operations
      getEmailfromSession(context);

      try {
        const plan = await generateMilestonePlan(userQuery);
        return plan;
      } catch (error) {
        console.error('Error generating milestone plan:', error);
        return {
          error: `Unexpected error: ${error.message}`,
          period: null,
          title: null,
          entries: null,
        };
      }
    },
  },
  extractDayTask: {
    type: ExtractedTaskType,
    args: {
      query: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve: async (root, { query: text }, context) => {
      // Require authentication even for AI operations
      getEmailfromSession(context);

      try {
        const extractedTask = await extractTaskFromNaturalLanguage(text);
        return extractedTask;
      } catch (error) {
        console.error('Error extracting task from text:', error);
        return {
          error: `Failed to extract task: ${error.message}`,
          title: null,
          description: null,
          tags: null,
          dueDate: null,
          priority: null,
        };
      }
    },
  },
  bulkAddGoalItems: {
    type: new GraphQLList(GoalItemType),
    args: {
      goalItems: {
        type: new GraphQLNonNull(new GraphQLList(GoalItemInput)),
      },
    },
    resolve: async (root, { goalItems }, context) => {
      // Require authentication even for AI operations
      getEmailfromSession(context);

      return goalMutations.bulkAddGoalItems.resolve(root, { goalItems }, context);
    },
  },
};

module.exports = { query, mutation };
