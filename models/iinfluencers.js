const mongoose = require('mongoose');
const schema = mongoose.Schema;

const iinfluencersSchema = new schema({
  platform: String,
  about: {},
  brands: [],
  data: {},
  instagram: {
    biography: String,
    followers_count: Number,
    id: String,
    gender: String,
    profile_picture_url: String,
    username: { type: String, unique: true, sparse: true },
    media: [],
  },
  pricing: {},
  // iusername: { type: String, unique: true, sparse: true },
});

const iinfluencers = mongoose.model('iinfluencers',iinfluencersSchema);

module.exports = iinfluencers;
