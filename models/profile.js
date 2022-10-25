const mongoose = require('mongoose');
const schema = mongoose.Schema;

const profileSchema = new schema({}, { strict: false });

module.exports = mongoose.model('profiles', profileSchema);
