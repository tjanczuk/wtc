# Webtask Compilers

A collection of useful [webtask compilers](https://webtask.io/docs/webtask-compilers) for use with [Auth0 Webtasks](https://webtask.io). 

All you need to use the features below is [the webtask CLI](https://webtask.io/cli). 

## Static compiler

Host static content (HTML, JS files, CSS) on webtasks and serve over HTTP GET along with a configurable set of HTTP response headers (e.g. Content-Type). 

**NOTE** Serving static content using webtasks is not a good idea in production systems, there are far more efficient and performant ways of doing it. But it is a convenient way to serve frequenty changing static content during development.

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

## Webtask context extension

This compiler demonstrates how the webtask context can be enhanced with additional data or properties before the user-defined webtask function is called. In this example, the compiler will fetch the content from a URL specified via the `DATA_URL` secret and add it to the context object where the webtask function can immediately use it. Similar mechanism can be used to add data from an external database, or add any other utility functions or properties to the webtask context. 

Webtask script: 

```
cat > webtask.js <<EOF
module.exports = function (ctx, cb) {
  // The `ctx.externalData` property will be added by the compiler
  cb(null, { length: ctx.externalData.length });
};
EOF
```

Create webtask using [extend_context.js](https://github.com/tjanczuk/wtc/blob/master/extend_context.js) compiler and specify the `DATA_URL` secret to indicate where the compiler should download external content from: 

```
wt create webtask.js \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/extend_context.js \
  -s DATA_URL=https://google.com
```

## ES6 classes as webtasks

This compiler demonstrates how a JavaScript class can be used as a programming model for webtasks with simple built-in dispatch mechanism: 

* constructor of the class is called once during initialization call and provided with webtask secrets and metadata, 
* requests are dispatched to instance methods based on the HTTP verb of the request (you can easily modify dispatch logic to determine method to call using other criteria).

Webtask script: 

```
cat > webtask.js <<EOF
'use strict';

module.exports = class MyWebtask {

  constructor(secrets, meta) {
    this.secrets = secrets;
    this.meta = meta;
  }
  
  get(ctx, cb) {
    cb(null, { hello: 'from get' });
  }  
  
  post(ctx, cb) {
    cb(null, { hello: 'from post' });
  }
  
  patch(ctx, cb) {
    cb(null, { hello: 'from patch' });
  }

  // if an HTTP verb is not defined, compiler responds with HTTP 405
};
EOF
```

Create webtask using [class_compiler.js](https://github.com/tjanczuk/wtc/blob/master/class_compiler.js) compiler: 

```
wt create webtask.js \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/class_compiler.js
```

## Mocha test-as-a-service

This compiler allows you to easily implement and configure mocha tests as a webtask, and later run those tests with a simple HTTP call (e.g. via curl).

Webtask script: 

```
cat > test.js <<EOF
describe('sanity', () => {
  it('check', (done) => {
    done();  
  })
});
EOF
```

Create webtask using [mocha_compiler.js](https://github.com/tjanczuk/wtc/blob/master/mocha_compiler.js) compiler: 

```
wt create test.js \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/mocha_compiler.js
```

You can then run the tests by simply calling the created webtask: 

![image](https://cloud.githubusercontent.com/assets/822369/24326418/032b12dc-116b-11e7-9407-712ef2116154.png)

You can pass additional parameters to mocha when creating the webtask, e.g: 

```
wt create test.js \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/mocha_compiler.js \
  --meta MOCHA_ARGS="--reporter json"
```

You can override these parameters with URL query params when calling the webtask, e.g: 

```
curl https://tjanczuk.run.webtask.io/mocha-webtask?reporter=json\&timeout=2000
```

You can provide secret parameters to your test code (e.g. API keys) using secrets: 

```
wt create test.js \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/mocha_compiler.js \
  --secret MY_KEY=12
```

and they are available within your mocha test code with `module.webtask.secrets`: 

```javascript
describe('sanity', () => {
  it('check', (done) => {
    console.log('PSSST, MY_KEY is', module.webtask.secrets.MY_KEY);
    done();  
  })
});
```

## Stripe webhook

This compiler provides a simple way of creating secure [Stripe webhooks](https://stripe.com/docs/webhooks) which supports handling all Stripe events using a convenient programming model.

Webtask script: 

```
cat > stripe-handler.js <<EOF
'use strict';
module.exports = class StripeHandler {
  'charge.succeeded'(data) {
    console.log("You've got money!");
  }
};
EOF
```

Create webtask using [stripe_compiler.js](https://github.com/tjanczuk/wtc/blob/master/stripe_compiler.js) compiler: 

```
wt create stripe-handler.js \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/stripe_compiler.js
```

You can then take the resulting URL and use it as a webhook that receives the *charge.succeeded* event from Stripe. 

#### Other Stripe events

All Stripe events are supported with a simple programming model. Use the [stripe_handler.js](https://github.com/tjanczuk/wtc/blob/master/stripe_handler.js) as a template of your webtask and uncomment any events you wish to handle. The webtask will respond with HTTP 501 to any events received from Stripe that your code does not implement. 

```
wt create https://raw.githubusercontent.com/tjanczuk/wtc/master/stripe_handler.js \
  --name stripe-handler \
  --capture \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/stripe_compiler.js
wt edit stripe-handler
```

#### Authentication

The compiler can optionally enforce Basic authentication supported by Stripe. To set it up, specify the *username:password* pair as the *BASIC_AUTH* secret when creating your webtask: 

```
wt create stripe-handler.js \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/stripe_compiler.js \
  --secret BASIC_AUTH=username:password
```

You must then configure your webhook in Stripe by specifying the *username:password* credentials in the webhook URL itself, e.g. 

```
https://username:password@james.run.webtask.io/stripe-handler
```

#### Secrets

You can provide your webhook code with secrets for communicating with downstream APIs (e.g. Slack or Twilio): 

```
wt create stripe-handler.js \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/stripe_compiler.js \
  --secret TWILIO_KEY=abc \
  --secret SLACK_URL=https://...
```

These secrets can be accessed within the webhook code in the following way:

```javascript
'use strict';
module.exports = class StripeHandler {
  'charge.succeeded'(data) {
    let twilio_key = this.secrets.TWILIO_KEY;
    let slack_url = this.secrets.SLACK_URL;
  }
};
```

#### Calling Stripe APIs

If you specify the *STRIPE_KEY* as one of the secrets when creating your webtask:

```
wt create stripe-handler.js \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/stripe_compiler.js \
  --secret STRIPE_KEY=abc
```

the compiler will provide you with a preconfigured [Stripe client](https://www.npmjs.com/package/stripe) you can use to all Stripe APIs: 

```javascript
'use strict';
module.exports = class StripeHandler {
  'charge.succeeded'(data) {
    this.stripe.customers.create(...);
  }
};
```