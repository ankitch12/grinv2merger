const mongoose = require('mongoose');
const schema = mongoose.Schema;

const iinfluencersSchema = new schema({
  platform: String,
  about: {},
  brands: [],
  data: {},
  instagram: {},
  pricing: {},
  iusername: { type: String, unique: true, sparse: true },
});

const iinfluencers = mongoose.model('iinfluencers',iinfluencersSchema);

module.exports = iinfluencers;
