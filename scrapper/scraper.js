const requestPromise = require('request-promise');
const querystring = require('querystring');
const fs = require('fs');
let posts = [];
const API = 'c2c2760f-2d2f-4278-aa45-dff0ada4d0dc'; //'62770726-3484-483e-9d88-af746b57f8dd'//'ec23da3f-bd89-4d83-8fe0-ab06eb70e1d1'; //'f2885f9b-588e-4010-b76d-bc1b426968be'

//-----------Helpers-------------------------
const nFormatter = (num, digits) => {
  const lookup = [
    {
      value: 1,
      symbol: '',
    },
    {
      value: 1e3,
      symbol: 'K',
    },
    {
      value: 1e6,
      symbol: 'M',
    },
    {
      value: 1e9,
      symbol: 'G',
    },
    {
      value: 1e12,
      symbol: 'T',
    },
    {
      value: 1e15,
      symbol: 'P',
    },
    {
      value: 1e18,
      symbol: 'E',
    },
  ];

  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  const item = lookup
    .slice()
    .reverse()
    .find((item) => {
      return num >= item.value;
    });
  return item
    ? (num / item.value).toFixed(digits).replace(rx, '$1') + item.symbol
    : '0';
};

function get_url(url) {
  let payload = querystring.stringify({
    api_key: API,
    proxy: 'residential',
    timeout: '20000',
    url: url,
  });
  proxy_url = 'https://api.webscraping.ai/html?' + payload;
  return proxy_url;
}

async function fetchInstaData(username) {
  const options = {
    method: 'GET',
    url: get_url('https://www.instagram.com/' + username + '/?__a=1'),
  };
  try {
    let response = await requestPromise(options);

    return JSON.parse(response);
  } catch (error) {
    throw 'Webscrapper.ai error - ' + error;
  }
}

async function nextPage(uid, end_cursor) {
  try {
    let query_hash = 'e769aa130647d2354c40ea6a439bfc08';
    let first = '12';
    let after = end_cursor;
    let queryParams =
      'query_hash=' +
      query_hash +
      '&id=' +
      uid +
      '&first=' +
      first +
      '&after=' +
      after;
    const options = {
      method: 'GET',
      url: get_url('https://www.instagram.com/graphql/query/?' + queryParams),
    };
    console.log(options);
    let response = await requestPromise(options);
    return JSON.parse(response);
  } catch (error) {
    throw 'Scrapper next page error' + error;
  }
}

async function recursivePosts(uid, end_cursor, maximumPostpages) {
  let nextPosts = await nextPage(uid, end_cursor);
  if (!nextPosts) {
    throw 'waiting error';
  }
  getPosts(nextPosts.data.user.edge_owner_to_timeline_media.edges);
  if (posts.length >= maximumPostpages * 12) {
    return;
  }
  if (
    (uid,
    nextPosts.data.user.edge_owner_to_timeline_media.page_info.has_next_page)
  ) {
    //await sleep(360000)
    await recursivePosts(
      uid,
      nextPosts.data.user.edge_owner_to_timeline_media.page_info.end_cursor
    );
  }
}

function getPosts(edges) {
  function getTaggedUsers(UsersData) {
    let users = UsersData.map((user) => {
      user = user.node.user;
      return {
        username: user.username,
        fullName: user.full_name,
        uid: user.id,
        profilePicUrl: user.profile_pic_url,
        isFollowByViewer: user.followed_by_viewer,
        is_verified: user.is_verified,
      };
    });
    return users;
  }

  function getchildPosts(childposts) {
    let childPosts = childposts.map((post) => {
      return {
        id: post.node.id,
        media_url: post.node.is_video
          ? post.node.video_url
          : post.node.display_url,
        is_video: post.node.is_video,
        taggedUsers: getTaggedUsers(post.node.edge_media_to_tagged_user.edges),
        videoViewCount: post.node.video_view_count
          ? post.node.video_view_count
          : 0,
      };
    });
    return childPosts;
  }

  let post = [];
  for (let i = 0; i < edges.length; i++) {
    const element = edges[i].node;
    if (Object.keys(element).length === 0) {
      continue;
    }
    post.push({
      postIconImage: element.display_url,
      likesCount:
        element.edge_liked_by?.count || element.edge_media_preview_like?.count,
      commentsCount: element.edge_media_to_comment?.count,
      taggedUsers: getTaggedUsers(element.edge_media_to_tagged_user?.edges),
      postDescription: element.edge_media_to_caption.edges[0]?.node?.text,
      isCommentDisable: element.comments_disabled,
      dimensions: element.dimensions,
      postId: element.id,
      postShortcode: element.shortcode,
      postUploadTime: element.taken_at_timestamp,
      postThumbnailSrc: element.thumbnail_src,
      trackingToken: element.tracking_token,
      isVideo: element.is_video,
      videoUrl: element.video_url ? element.video_url : '',
      videoDuration: element.video_duration ? element.video_duration : null,
      videoViewCount: element.video_view_count ? element.video_view_count : 0,
      postHasAudio: element.has_audio,
      pinnedUser: element.pinned_for_users,
      childPosts: element.hasOwnProperty('edge_sidecar_to_children')
        ? getchildPosts(element.edge_sidecar_to_children.edges)
        : [],
    });
  }
  posts = posts.concat(post);
  return;
}

function getHashtag(entities) {
  let hashtag = [];
  entities.map((e) => {
    if (e.hashtag) hashtag.push(e.hashtag?.name);
  });
  return hashtag;
}

exports.dataMerger = (grinv, webscrapper = {}, profile = {}) => {
  try {
    function postMerger(profilePosts = [], scrapperPosts = []) {
      scrapperPosts.map((scrapper) => {
        if (
          !(profilePosts.findIndex((post) => post.id === scrapper.postId) >= 0)
        ) {
          let data = {};
          data.caption = scrapper.postDescription;
          data.comments_count = scrapper.commentsCount;
          data.like_count = scrapper.likesCount;
          data.media_url = scrapper.isVideo
            ? scrapper.videoUrl
            : scrapper.postIconImage;
          data.timestamp = new Date(scrapper.postUploadTime);
          data.video_duration = scrapper.videoDuration;
          data.video_view_count = scrapper.videoViewCount;
          data.pinnedUser = scrapper.pinnedUser;
          data.children = {
            data: scrapper.childPosts,
            id: scrapper.postId,
          };
          profilePosts.push(data);
        }
      });
      return profilePosts;
    }
    function getPostMediaStats(posts) {
      let mediaStats = {
        totalComments: 0,
        totalLikes: 0,
        totalViews: 0,
        totalMedia: posts.length,
      };
      posts.map((media) => {
        mediaStats.totalComments =
          media.comments_count + mediaStats.totalComments;
        mediaStats.totalLikes = media.like_count + mediaStats.totalLikes;
        mediaStats.totalViews = media.video_view_count + mediaStats.totalViews;
      });
      return mediaStats;
    }

    if (!profile.hasOwnProperty('about')) {
      profile.about = {};
    }
    if (!profile.hasOwnProperty('brands')) {
      profile.brands = [];
    }
    if (!profile.hasOwnProperty('data')) {
      profile.data = {};
    }
    if (!profile.hasOwnProperty('instagram')) {
      profile.instagram = {};
    }
    if (!profile.hasOwnProperty('pricing')) {
      profile.pricing = {};
    }
    profile.platform = profile.platform;
    profile.about.interests =
      profile.about.interests && webscrapper.hashtags
        ? [...new Set(profile.about.interests.concat(webscrapper.hashtags))]
        : webscrapper.hashtags
        ? webscrapper.hashtags
        : profile.about.interests
        ? profile.about.interests
        : [];

    profile.data.photo =
      webscrapper.personalDetails?.profilePic?.hd ||
      grinv?.picture ||
      profile.data.photo;
    profile.data.name =
      webscrapper.personalDetails?.fullName || grinv?.name || profile.data.name;
    profile.data.description =
      webscrapper.bio || grinv?.bio || profile.data.description;
    profile.data.handle =
      webscrapper.personalDetails?.username ||
      grinv?.username ||
      profile.data.handle;
    profile.data.location =
      grinv?.location || webscrapper.location || profile.data.location;
    profile.data.interests = grinv?.interest || profile.data.interests;
    profile.data.followers =
      webscrapper.followers?.followerCountInDigits ||
      grinv?._raw?.follower_count ||
      profile.data.followers;
    profile.data.followersInString =
      webscrapper.followers?.followerCountInString || grinv?.follower_count;
    profile.data.following = webscrapper.following || profile.data.following;
    profile.data.postsCount = webscrapper.totalPosts || profile.data.postsCount;
    profile.data.engagement =
      grinv?._raw?.engagement_count || profile?.data?.engagement;
    profile.data.engagement_rate = grinv?._raw.engagement_rate;
    (profile.instagram.biography =
      webscrapper.bio || grinv?.bio || profile.instagram.biography),
      (profile.instagram.followers_count =
        webscrapper.followers?.followerCountInDigits ||
        grinv?._raw.follower_count ||
        profile.instagram.followers_count);
    (profile.instagram.id =
      webscrapper.profileId || grinv?._raw.id || profile.instagram.id),
      (profile.instagram.gender = grinv?.gender);
    (profile.instagram.profile_picture_url =
      webscrapper.personalDetails?.profilePic?.hd ||
      grinv?.picture ||
      profile.instagram.profile_picture_url),
      (profile.instagram.username =
        webscrapper.personalDetails?.username ||
        grinv?.username ||
        profile.instagram.username),
      (profile.instagram.website =
        webscrapper.businessUrl || profile.instagram.website);
    (profile.instagram.media_count =
      webscrapper.totalPosts || profile.instagram.media_count),
      (profile.instagram.media = postMerger(
        profile.instagram.media,
        webscrapper.posts
      ));
    profile.instagram.mediaStats =
      profile.instagram.media.length > 0
        ? getPostMediaStats(
            profile.instagram.media,
            profile.instagram.mediaStats
          )
        : {};

    profile.data.estimated_cost = grinv?.estimated_cost;
    profile.data.network = grinv?._raw?.networks;
    profile.data.is_blacklisted = grinv?.is_blacklisted;
    profile.data.is_added = grinv?.is_added;
    profile.data.grin_id = grinv?.grin_id;
    profile.data.audiencePercent = grinv?.audiencePercent;
    profile.data.role = grinv?.role;
    profile.data.businessCategories = webscrapper.businessCategoryName;
    profile.data.isBusinessAccount = webscrapper.isBusinessAccount;
    profile.data.businessContactMethod = webscrapper.businessContactMethod;
    profile.data.transparencyProduct = webscrapper.transparencyProduct;
    profile.data.first_name =
      webscrapper.personalDetails?.firstName || grinv?.first_name;
    profile.data.last_name =
      webscrapper.personalDetails?.lastName || grinv?.last_name;
    profile.iusername = profile.instagram.username;

    //************ */
    let email = '';
    let mobileNumber = '';
    if (profile.data.description) {
      let emailRegex = new RegExp('[a-z0-9]+@[a-z]+.[a-z]{2,3}');
      let mobileNumberRegex = new RegExp(
        /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/
      );
      let profileText = profile.data.description;
      profileText = profileText.replace(/\n/g, ' ');
      profileText = profileText.split(' ');
      for (word of profileText) {
        if (emailRegex.test(word)) {
          email = word;
        }
        if (mobileNumberRegex.test(word)) {
          mobileNumber = word;
        }
      }
    }

    profile.data.businessEmail = email;
    profile.data.businessPhoneNumber = mobileNumber;

    return profile;
  } catch (error) {
    throw 'Data merger error - ' + error;
  }
};

exports.instaScraper = async (username, maximumPostpages = 1) => {
  try {
    let instaData = await fetchInstaData(username);

    if (!instaData) {
      throw 'Unauthorized error';
    }
    let user = instaData.graphql.user;
    let fullName = user.full_name.split(' ');
    let email = '';
    let mobileNumber = '';
    if (user.biography) {
      let profileText = user.biography.replace(/\n/g, ' ');
      profileText = user.biography.split(' ');
      let emailRegex = new RegExp('[a-z0-9]+@[a-z]+.[a-z]{2,3}');
      let mobileNumberRegex = new RegExp(
        /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/
      );
      for (word of profileText) {
        if (emailRegex.test(word)) {
          email = word;
        }
        if (mobileNumberRegex.test(word)) {
          mobileNumber = word;
        }
      }
    }
    let instaProfile = {
      profileId: user.id,
      hashtags: user.hasOwnProperty('biography_with_entities')
        ? getHashtag(user.biography_with_entities?.entities)
        : [],
      bio: user.biography,
      followers: {
        followerCountInDigits: user.edge_followed_by.count,
        followerCountInString: nFormatter(user.edge_followed_by.count, 3),
      },
      following: user.edge_follow.count,
      totalPosts: user.edge_owner_to_timeline_media.count,
      personalDetails: {
        firstName: fullName.shift(),
        lastName: fullName.join(' '),
        fullName: user.full_name,
        username: user.username,
        anotherUsername:
          user.biography_with_entities?.entities[0]?.user?.username,
        profilePic: {
          normal: user.profile_pic_url,
          hd: user.profile_pic_url_hd,
        },
      },
      location: user.location_transparency_country,
      businessCategoryName: user.business_category_name,
      businessEmail: email,
      businessUrl: user.external_url,
      linkshimmedUrl: user.external_url_linkshimmed,
      categories: user.category_enum,
      businessContactMethod: user.business_contact_method,
      businessPhoneNumber: mobileNumber,
      transparencyProduct: user.transparency_product,
      isBusinessAccount: user.is_business_account,
    };
    getPosts(user.edge_owner_to_timeline_media?.edges);
    if (user.edge_owner_to_timeline_media.page_info.has_next_page) {
      await recursivePosts(
        user.id,
        user.edge_owner_to_timeline_media.page_info.end_cursor,
        maximumPostpages
      );
      instaProfile.posts = posts;
    }
    return instaProfile;
  } catch (error) {
    throw 'Scraping error - ' + error;
  }
};

//count check grinv3
// grinv3  without webscraping and deletion
//message on start
//share progress on 50% completion
//& on completion
