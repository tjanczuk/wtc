module.exports = (options, cb) => {
    return cb(null, (ctx, req, res) => {
        if (req.method !== 'GET') {
            res.writeHead(405);
            return res.end();
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(view({
          title: ctx.query.title,
          theme: ctx.query.theme,
          script: options.script,
        }));
    });
};

function view(model) {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${ model.title || 'Auth0 Webtasks Flow Chart'}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/raphael/2.2.7/raphael.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/webfont/1.6.28/webfontloader.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/js-sequence-diagrams/1.0.6/sequence-diagram-min.js"></script>
    <style>
        /** js sequence diagrams
        *  https://bramp.github.io/js-sequence-diagrams/
        *  (c) 2012-2017 Andrew Brampton (bramp.net)
        *  Simplified BSD license.
        */
        @font-face{font-family:'danielbd';src:url(danielbd.woff2) format('woff2'),url(danielbd.woff) format('woff');font-weight:normal;font-style:normal}
    </style>
</head>
<body>
    <div id="diagram"></div>
    <script> 
        var d = Diagram.parse(${JSON.stringify(model.script)});
        var options = {theme: '${model.theme || 'simple'}'};
        d.drawSVG('diagram', options);
    </script>
</body>
</html>`;
}
