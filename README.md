# Webtask Compilers

A collection of useful [webtask compilers](https://webtask.io/docs/webtask-compilers) for use with [Auth0 Webatsks](https://webtask.io). 

## Static compiler

Serve static content (HTML, JS files, CSS) using webtasks and serve over HTTP GET along with a configurable set of HTTP response headers (e.g. Content-Type). 

Webtask script: 

```
cat > page.txt <<EOF
This is text, but it could also be 
HTML, JSON, CSS, or JavaScript.
EOF
```

Create webtask using static compiler, specify custom HTTP response headers using webtask secrets:

```
wt create page.txt --name page \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/static.js \
  -s content-type=text/plain
```

*NOTE* Serving static content using webtasks is not a good idea in production systems, there are far more efficient and performant ways of doing it. But it is a convenient way to serve frequenty changing static content during development.
