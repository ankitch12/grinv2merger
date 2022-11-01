const mongoose = require('mongoose');

var conn2 = mongoose.createConnection(
  'mongodb+srv://cybees-public:cybees-public@cluster0.7mmzh.mongodb.net/grinv3'
);

module.exports = conn2