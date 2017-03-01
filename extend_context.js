var request = require('superagent');

module.exports = (options, cb) => {
    // First compile the user-defined webtask code into a function 
    options.nodejsCompiler(options.script, (e, func) => {
        if (e) return cb(e);
        // Behavior now depends on the arity of the user-defined function
        switch (func.length) {
            case 1: 
                // The function has `function (cb)` signature, which means the code is
                // not using the context, and there is no point enhancing it. 
                // Just return the compiled function.
                return cb(null, func);
            case 2:
                // The function has `function (ctx, cb)` signature.
                // Return a function that enhances the context and then calls the 
                // user defined function. 
                return cb(null, (ctx, cb) => {
                    enhanceContext(ctx, e => e ? cb(e) : func(ctx, cb));
                });
            case 3:
                // The function has `function (ctx, req, res)` signature.
                // Return a function that enhances the context and then calls the 
                // user defined function. 
                return cb(null, (ctx, req, res) => {
                    enhanceContext(ctx, e => {
                        if (e) {
                            res.writeHead(500);
                            return res.end(e.message || e.toString());
                        }
                        return func(ctx, req, res);
                    });
                });
            default:
                return cb(new Error(`Webtask function has unsupported arity of ${func.length}.`));

        };
    });
};

function enhanceContext(ctx, cb) {
    // Enhance context by adding to it the data downloaded from 
    // a url specified with ctx.secrets.DATA_URL.
    if (!ctx.secrets.DATA_URL) return cb();
    request
        .get(ctx.secrets.DATA_URL)
        .end((e, res) => {
            // Add text downloaded from the DATA_URL to the context
            ctx.externalData = res && res.text;
            return cb(e);
        });
}
