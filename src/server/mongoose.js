const Mongoose = require('mongoose');

// Configure mongoose's promise to global promise
Mongoose.promise = global.Promise;

const { MONGDO_DB, MONGDO_DEBUG } = process.env;
Mongoose.connect(MONGDO_DB, { useNewUrlParser: true });
Mongoose.set('debug', Boolean(MONGDO_DEBUG));

module.exports = Mongoose;
