const {
  GraphQLID,
  GraphQLString,
  GraphQLObjectType,
} = require('graphql');

const Mongoose = require('../mongoose');

const MottoItemSchema = new Mongoose.Schema({
  mottoItem: String,
});

const MottoItemType = new GraphQLObjectType({
  name: 'MottoItem',
  fields: {
    id: { type: GraphQLID },
    mottoItem: { type: GraphQLString },
  },
});

const MottoItemModel = Mongoose.model('MottoItem', MottoItemSchema);
module.exports = {
  MottoItemSchema,
  MottoItemModel,
  MottoItemType,
};
