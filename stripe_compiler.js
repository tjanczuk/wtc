'use strict';

module.exports = (options, cb) => {
    options.nodejsCompiler(options.script, (e, Func) => {
      if (e) return cb(e);
      
      let instance = new Func();
      instance.secrets = options.secrets;
      instance.meta = options.meta;
      if (options.secrets.STRIPE_KEY) {
        instance.stripe = require('stripe@4.14.0')(options.secrets.STRIPE_KEY);
      }
      let auth;
      if (options.secrets.BASIC_AUTH) {
        auth = new Buffer(options.secrets.BASIC_AUTH).toString('base64');
      }
      return cb(null, (ctx, cb) => {
        if (auth) {
          let match = (ctx.headers.authorization || '').match(/^\s*Basic\s+([^\s]+)\s*$/);
          if (!match || match[1] !== auth) {
            let error = new Error('Unauthorized.');
            error.statusCode = 403;
            return cb(error);
          }
        }
        let method = ctx.body.type;
        if (typeof instance[method] !== 'function') {
          let error = new Error(`Unuspported event: ${method}.`);
          error.statusCode = 501;
          return cb(error);
        }
        else {
          if (instance[method].length === 1) cb();
          return instance[method](ctx.body, cb);
        }
      });
    });
};
