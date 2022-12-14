const scrapper = require('./scraper');
const fs = require('fs');
const iinfluencers = require('../models/iinfluencers');
const profileModel = require('../models/profile');
const Grins = require('../models/grin');

require('../cybeesdb');

async function instaProfileMerger(username) {
  try {
    let profileData = await profileModel
      .findOne({
        'data.handle': username,
      })
      .lean(true);

    if (!profileData) {
      profileData = {};
    }
    let grinData = await Grins.findOne({
      username: username,
    });
    if (!grinData) {
      grinData = {};
    }
    // let webscrapingData = await scrapper.instaScraper('insdschool', 1);
    let mergedProfile = scrapper.dataMerger(
      grinData,
      (webscrapingData = {}),
      profileData
    );
    delete mergedProfile._id;
    delete mergedProfile.__v;
    return mergedProfile;
  } catch (error) {
    throw error;
  }
}

async function mainScript(start,len, limit) {
  try {
    let data = [];
    len= parseInt(len/limit)
    start = parseInt(start/limit)
    console.log(start,len)
    for (let i = start; i < len; i++) {
      let grinData = await Grins.find({}, { username: true })
        .skip(i * limit)
        .limit(limit); //.skip(skip)
      console.log(start, i * limit, len * limit);
      let promices = [];
      grinData.forEach(async (profile) => {
        promices.push(
          new Promise(async (resolve, reject) => {
            try {
              let mergedProfile = await instaProfileMerger(profile.username);
              let is_create = await iinfluencers.create(mergedProfile);
              //fs.writeFile('../jsons/'+is_create.iusername+'.json',JSON.stringify(mergedProfile),'utf-8',()=>{});

              resolve({
                username: profile.username,
                success: true,
                message: 'success',
              });
            } catch (error) {
              console.log(profile.username + 'failed' + error.message);
              resolve({
                username: profile.username,
                success: false,
                message: error.message ? error.message : error,
              });
            }
          })
        );
      });
      let resp = await Promise.all(promices);
      data.push(resp);
    }
    return data;
  } catch (error) {
    console.log(error);
  }
}
let response = mainScript(0,179000, 1000); // total maximum length , limit pr loop

fs.writeFile(
  '../jsons/response' + '.json',
  JSON.stringify(response),
  'utf-8',
  () => {}
);
// name changes ***
// file move recheck ****
// order change Parms ***
// promises.all ***
// skip limit testing **
// variable name update ***
// add username in innfluencers **
// sparse testing null
// success in iinf > delete from grin // do not test
