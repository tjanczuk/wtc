var app = new (require('express'))();

app.use(require('cookie-parser')());

app.get('/', (req, res, next) => {
  return req.webtaskContext.storage.get((e, data) => {
    if (e) return next(e);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    var model = {
      value: data && data[req.cookies['x-nps-id']] || -1,
      filledSymbol: req.query.filledSymbol || '&#x2605',
      emptySymbol: req.query.emptySymbol || '&#x2606',
      color: req.query.color || 'orange',
      size: req.query.size || '1em',
      scale: +req.webtaskContext.secrets.SCALE || 10,
    };
    return res.end(npsView(model));
  });
});

app.get('/stats', (req, res, next) => {
  var scale = +req.webtaskContext.secrets.SCALE || 10;
  return req.webtaskContext.storage.get((e, data) => {
    if (e) return next(e);
    var stats = { histogram: {}, count: 0, avg: 0 };
    for (var i = 0; i <= scale; i++) stats.histogram[i] = 0;
    for (var id in data) {
      stats.count++;
      stats.histogram[data[id]]++;
      stats.avg += data[id];
    }
    if (stats.total > 0);
      stats.avg = stats.avg / stats.count;
    if (scale === 10) {
      stats.nps = { promoters: 0, passives: 0, detractors: 0, score: 0 };
      if (stats.count > 0) {
        for (var i = 0; i <= 6; i++) stats.nps.detractors += stats.histogram[i];
        for (var i = 7; i <= 8; i++) stats.nps.passives += stats.histogram[i];
        for (var i = 9; i <= 10; i++) stats.nps.promoters += stats.histogram[i];
        stats.nps.score = 100 * (stats.nps.promoters - stats.nps.detractors) / stats.count;
      }
    }
    return res.json(stats);
  });
});

app.post('/:value', (req, res, next) => {
  var scale = +req.webtaskContext.secrets.SCALE || 10;
  var v = +req.params.value;
  if (isNaN(v) || v < 0 || v > scale) {
    res.writeHead(400);
    return res.end();
  }
  var id = req.cookies['x-nps-id'];
  if (!id) {
    id = Math.floor((999999999 * Math.random())).toString(26);
    res.cookie('x-nps-id', id, { httpOnly: true });
  }
  return req.webtaskContext.storage.get((e, data) => {
    if (e) return next(e);
    data = data || {};
    data[id] = v;
    req.webtaskContext.storage.set(data, { force: true }, (e) => {
      if (e) return next(e);
      return res.end();
    });
  });
});

function npsView(model) {
  let fragments = [
`<body style="margin: 0; line-height: ${model.size}; font-size: ${model.size}; color: ${model.color}"><script>
  var filledSymbol = '${model.filledSymbol}';
  var emptySymbol = '${model.emptySymbol}';
  function nps(value) {
    for (var i = 0; i <= ${model.scale}; i++) {
      document.getElementById("" + i).innerHTML = i <= value ? filledSymbol : emptySymbol;
    }
    var oReq = new XMLHttpRequest();
    oReq.open('POST', window.location.pathname + '/' + value);
    oReq.send();
  }
</script>
<span style="cursor: pointer;">`
];

  for (var i = 0; i <= model.scale; i++) {
    fragments.push(`<span id="${i}" onclick="nps(${i})">${i <= model.value ? model.filledSymbol : model.emptySymbol}</span>`);
  }

  fragments.push(`</span></body>`);

  return fragments.join('');
}

module.exports = (options, cb) => cb(null, require('webtask-tools').fromExpress(app));
