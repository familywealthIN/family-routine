const {
  GraphQLString,
  GraphQLObjectType,
  GraphQLList,
} = require('graphql');

const mongoose = require('mongoose');

const ProgressItemSchema = new mongoose.Schema({
  name: String,
  value: String,
  total: String,
  values: [new mongoose.Schema({
    name: String,
    value: String,
    total: String,
  })],
});

const ProgressSchema = new mongoose.Schema({
  period: String,
  startDate: String,
  endDate: String,
  progressStatement: String,
  cards: [ProgressItemSchema],
});

const ProgressItemTypeFields = {
  id: { type: GraphQLString },
  name: { type: GraphQLString },
  value: { type: GraphQLString },
  total: { type: GraphQLString },
};

const ProgressItemValuesType = new GraphQLObjectType({
  name: 'ProgressItemValues',
  fields: {
    ...ProgressItemTypeFields,
  },
});

const ProgressItemType = new GraphQLObjectType({
  name: 'ProgressItem',
  fields: {
    ...ProgressItemTypeFields,
    values: { type: new GraphQLList(ProgressItemValuesType) },
  },
});

const ProgressType = new GraphQLObjectType({
  name: 'Progress',
  fields: {
    period: { type: GraphQLString },
    startDate: { type: GraphQLString },
    endDate: { type: GraphQLString },
    progressStatement: { type: GraphQLString },
    cards: { type: new GraphQLList(ProgressItemType) },
  },
});

const ProgressItemModel = mongoose.model('ProgressItem', ProgressItemSchema);
const ProgressModel = mongoose.model('Progress', ProgressItemSchema);
module.exports = {
  ProgressSchema,
  ProgressModel,
  ProgressType,
  ProgressItemSchema,
  ProgressItemModel,
  ProgressItemType,
};
