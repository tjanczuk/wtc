module.exports = (options, cb) => {
    return cb(null, (ctx, req, res) => {
        for (var h in options.secrets) {
            res.headers[h] = options.secrets[h];
        }
        res.end(options.script);
    });
};
