'use strict';

const Yaml = require('js-yaml');
const Twitter = require('twitter');
const Async = require('async');
const Superagent = require('superagent');
const Url = require('url');

let twitter;
let schedule;
let scheduleError;

module.exports = (options, cb) => {
  
    twitter = new Twitter({
      consumer_key: options.secrets.TWITTER_CONSUMER_KEY,
      consumer_secret: options.secrets.TWITTER_CONSUMER_SECRET,
      access_token_key: options.secrets.TWITTER_ACCESS_TOKEN_KEY,
      access_token_secret: options.secrets.TWITTER_ACCESS_TOKEN_SECRET
    });

    try {
      schedule = Yaml.safeLoad(options.script);
    }
    catch (e) {
      scheduleError = e;
      schedule = { tweets: [] }; // a do-nothing schedule
    }
    
    if (schedule && Array.isArray(schedule.tweets)) {
      schedule.tweets.forEach(t => {
        if (t.schedule && !Array.isArray(t.schedule)) {
          t.schedule = [ t.schedule ];
        }
        if (t.media && !Array.isArray(t.media)) {
          t.media = [ t.media ];
        }
      });
    }
  
    return cb(null, (ctx, req, res) => {
        req.query = Url.parse(req.url, true).query;
        if (req.method === 'GET' && req.query.run === undefined) {
            return ctx.storage.get((e, history) => {
              let tx = createTweetPlan(history, schedule);
              let response = {
                schedule: scheduleError ? { error: scheduleError.message || scheduleError.toString() } : schedule,
                plan: { planPeriod: tx.planPeriod, plan: tx.plan },
                history: history || {},
              };
              return respond(200, response);
            });
        }
        else if (req.method === 'POST' || req.method === 'GET' && req.query.run !== undefined) {
          if (scheduleError) {
            return respond(400, { error: scheduleError.message || scheduleError.toString() });
          }
          return processSchedule(ctx, (e,r) => {
            return e 
              ? respond(500, { error: e.message || e.toString() }) 
              : respond(200, r);
          });
        }
        else {
          return respond(404, { error: 'Not found' });
        }
        
        function respond(status, value) {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(value));
        }
    });
};

function processSchedule(context, cb) {
  
  return Async.waterfall([
    (cb) => context.storage.get((e,history) => cb(e,history)),
    (history, cb) => createTweetPlan(history, schedule, cb),
    (tx, cb) => executePlan(tx, cb),
    (tx, cb) => saveHistory(tx, cb),
  ], cb);
  
  function saveHistory(tx, cb) {
    tx.history.recentTweets.splice(20);
    tx.history.lastRun = tx.now;
    context.storage.set(tx.history, { force: 1 }, e => cb(e, tx.plan));
  }
  
  function executePlan(tx, cb) {

    let now_str = new Date(tx.now).toString();

    return Async.eachLimit(tx.plan, 2, (i, cb) => {
      return Async.waterfall([
        (cb) => uploadMedia(i, cb),
        (media, cb) => postStatus(media, i, cb)
      ], cb);
      
      function uploadMedia(i, cb) {
        if (!i.media) return cb(null, null);
        return Async.mapSeries(i.media, (m, cb) => {
          return Async.waterfall([
            (cb) => downloadMedia(m, cb),
            (media, cb) => initUpload(media, cb),
            (media, cb) => upload(media, cb),
            (media, cb) => finishUpload(media, cb)
          ], cb);
          
          function downloadMedia(url, cb) {
            return Superagent
              .get(url)
              .end((e,r) => cb(e, !e && r && {
                  url,
                  payload: r.body,
                  contentType: r.headers['content-type'],
                  contentLength: r.body.length
                })
              );
          }
          
          function initUpload(media, cb) {
            twitter.post('media/upload', {
              command    : 'INIT',
              total_bytes: media.contentLength,
              media_type : media.contentType,
            }, (e, data) => {
              if (!e && data) media.mediaId = data.media_id_string;
              return cb(e, media);
            });
          }

          function upload(media, cb) {
            twitter.post('media/upload', {
              command : 'APPEND',
              media_id : media.mediaId,
              media : media.payload,
              segment_index: 0
            }, e => {
              delete media.payload;
              cb(e, media);
            });
          }
          
          function finishUpload(media, cb) {
            twitter.post('media/upload', {
              command : 'FINALIZE',
              media_id : media.mediaId
            }, e => cb(e, media));
          }
        }, cb);
      }
      
      function postStatus(media, i, cb) {
        var payload = {
          status: i.text
        };
        if (media && media.length > 0) { 
          i.media = media;
          payload.media_ids = media.map(m => m.mediaId).join(',');
        }
        twitter.post('statuses/update', payload, (e, tweet) => {
          i.result = e 
            ? { error: e.message || e.toString() } 
            : { 
              success: true, 
              tweet_id: tweet.id_str, 
              url: `https://twitter.com/${tweet.user && tweet.user.screen_name}/status/${tweet.id_str}`,
              time: now_str,
            };
          tx.history.recentTweets.unshift(i);
          return cb();
        });
      }
    }, e => cb(e, tx));
  }
};

function createTweetPlan(history, schedule, cb) {
  history = history || {};
  history.lastRun = history.lastRun || 0;
  history.recentTweets = history.recentTweets || [];
  var tx = { now: Date.now(), plan: [], history };
  schedule.tweets.forEach(t => {
    if (t.schedule.some(s => {
      try {
        var d = new Date(s);
        return d > history.lastRun && d <= tx.now;
      }
      catch (_) {
        return false;
      }
    })) {
      tx.plan.push(JSON.parse(JSON.stringify(t)));
    }
  });
  tx.planPeriod = {
    from: history.lastRun === 0 ? null : new Date(history.lastRun).toString(),
    to: new Date(tx.now).toString()
  }
  return cb ? cb(null, tx) : tx;
}
