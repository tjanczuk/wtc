'use strict';

const Fs = require('fs');
const Path = require('path');
const Uuid = require('uuid');
const spawn = require('child_process').spawn;

module.exports = (options, cb) => {
    let testFile = Path.join('/tmp', Uuid.v4() + '.js');
    let testCode = `module.webtask={secrets:${JSON.stringify(options.secrets)}};${options.script}`;
    Fs.writeFile(testFile, testCode, (e) => {
      if (e) return cb(e);
      return cb(null, (ctx, req, res) => {
        console.log('NEW REQUEST');
        if (req.method !== 'GET') {
          res.writeHead(405);
          return res.end();
        }
        res.writeHead(200, { 'cache-control': 'no-cache', 'content-type': 'text/plain' });
        let mochaBin = Path.join(require.resolve('mocha'), '../bin/mocha');
        let args = [];
        if (options.meta.MOCHA_ARGS) {
          options.meta.MOCHA_ARGS.split(' ').forEach((a) => { 
            a = a.trim();
            if (a.length > 0) args.push(a);
          });
        }
        for (let p in ctx.query) {
          args.push(`--${p}`);
          if (typeof ctx.query[p] === 'string' && ctx.query[p].length > 0) args.push(ctx.query[p]);
        }
        args.push(testFile);
        let mocha = spawn(mochaBin, args, {});
        mocha.stdout.pipe(res);
        mocha.on('end', () => res.end());
      });
    });
};
