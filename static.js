module.exports = (options, cb) => {
    return cb(null, (ctx, req, res) => {
        if (req.method !== 'GET') {
            res.writeHead(405);
            return res.end();
        }
        res.writeHead(200, options.secrets);
        res.end(options.script);
    });
};
