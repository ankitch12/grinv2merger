const db2 = require('../grindb');
const mongoose = require('mongoose');
const schema = mongoose.Schema;

const influencersSchema = new schema({}, { strict: false });

module.exports = db2.model('influencers', influencersSchema);
