const {
  GraphQLID,
  GraphQLString,
  GraphQLObjectType,
} = require('graphql');

const mongoose = require('mongoose');

const MottoItemSchema = new mongoose.Schema({
  mottoItem: String,
});

const MottoItemType = new GraphQLObjectType({
  name: 'MottoItem',
  fields: {
    id: { type: GraphQLID },
    mottoItem: { type: GraphQLString },
  },
});

const MottoItemModel = mongoose.model('MottoItem', MottoItemSchema);
module.exports = {
  MottoItemSchema,
  MottoItemModel,
  MottoItemType,
};
