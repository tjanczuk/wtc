'use strict';

const Async = require('async');

module.exports = (options, cb) => {
    options.nodejsCompiler(options.script, (e, Func) => {
      if (e) return cb(e);
      
      let instance = new Func(options.secrets, options.meta);
      
      return cb(null, (ctx, req, res) => {
        let method = req.method.toLowerCase();
        
        Async.series([ ensureMethod, readBody, dispatch ], (e) => {
          if (e) {
            res.writeHead(e.statusCode || 400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message, statusCode: e.statusCode || 400 }));
          }
        });
        
        function ensureMethod(cb) {
          if (typeof instance[method] === 'function') return cb();
          
          let error = new Error(`Unuspported method: ${method}.`);
          error.statusCode = 405;
          return cb(error);
        }
        
        function readBody(cb) {
          if (ctx.body) return cb();
          if (['post','put','patch'].indexOf(method) === -1) return cb();
          let body = '';
          req.on('data', (d) => body += d);
          req.on('end', () => {
            req.removeAllListeners();
            try {
              ctx.body = JSON.parse(body);
            }
            catch (e) {
              return cb(new Error(`Request body must be JSON: ${e.message}`));
            }
            return cb();
          });
          req.on('error', cb);
        }
        
        function dispatch(cb) {
          instance[method](ctx, (e, d) => {
            if (e) return cb(e);
            try {
              d = JSON.stringify(d);
            }
            catch (e) {
              return cb(new Error(`Unable to serialize response as JSON: ${e.message}.`));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(d);
            return cb();
          })
        }
      });
    });
};
