# Webtask Compilers

A collection of useful [webtask compilers](https://webtask.io/docs/webtask-compilers) for use with [Auth0 Webtasks](https://webtask.io). 

All you need to use the features below is [the webtask CLI](https://webtask.io/cli). 

[Static compiler](#static-compiler)  
[Webtask context extension](#webtask-context-extension)  
[ES6 classes as webtasks](#es6-classes-as-webtasks)  
[Mocha test-as-a-service](#mocha-test-as-a-service)  
[Stripe webhook](#stripe-webhook)  
[Sequence diagram](#sequence-diagram)  
[Twitter scheduler](#twitter-scheduler)  
[Embeddable NPS widget](#embeddable-nps-widget)  

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

This compiler provides a simple way of creating secure [Stripe webhooks](https://stripe.com/docs/webhooks) which support handling all Stripe events using a convenient programming model.

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

Unauthorized requests will be rejected with HTTP 403.

#### Secrets

You can provide your webhook code with secrets for communicating with external services (e.g. Slack or Twilio): 

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

## Sequence diagram

This compiler enables you to create HTTP endpoints that serve HTML showing sequence diagrams. They are implemented as webtasks using the DSL defined by [js-sequence-diagrams](https://bramp.github.io/js-sequence-diagrams/). 

![image](https://user-images.githubusercontent.com/822369/31043633-6d91867c-a574-11e7-973c-0dc18d6eb177.png)

![image](https://user-images.githubusercontent.com/822369/31043636-771c7f80-a574-11e7-9d8b-e4a30d817916.png)

Webtask script: 

```
cat > diagram.txt <<EOF
Caller->Auth0: First, you get an access token
Note over Auth0: Authenticate and\nauthorize caller
Auth0->Caller: {access_token}
Caller->API: Then, you call the API {access_token, data}
API->Caller: {result}
EOF
```

Create webtask using [sequence diagram compiler](https://github.com/tjanczuk/wtc/blob/master/sequence_diagram_compiler.js):

```
wt create diagram.txt --name diagram \
  --meta wt-compiler=https://raw.githubusercontent.com/tjanczuk/wtc/master/sequence_diagram_compiler.js \
  --meta wt-editor-linter=disabled
```

The webtask URL can be customized with the `theme` URL query parameter, which accepts two values: `simple` (default) or `hand`. The `hand` theme creates a handwritten styled diagram: 

![image](https://user-images.githubusercontent.com/822369/31043694-51672f96-a575-11e7-84bf-b1fc75825be9.png)

## Twitter scheduler

This compiler allows you to create a Twitter scheduler which runs as a CRON job on [webtasks](https://webtask.io) and sends out tweets from your account given a schedule specified in YAML. 

The tweeting schedule is first specified in YAML. You control the tweet text, any media you want to attach to it, and you can specify multiple times at which this tweet is to be sent out. This is just an initial version, you will be able to add or modify this schedule later very easily:

```
cat > buffer.yaml <<EOF
tweets:
  - text: "I just installed a free Twitter scheduler that uses @auth0_extend and @webtaskio.\n\nCheck out https://github.com/tjanczuk/wtc#twitter-scheduler\n\n#nodejs #serverless"
    media: https://tomasz.janczuk.org/assets/images/b_1.jpg
    schedule: 
      - 4/8/2018 09:00 PDT
      - 4/8/2018 15:00 PDT
  - text: "You can do amazing things with webtask.io!\n\n#nodejs #serverless"
    media: https://tomasz.janczuk.org/assets/images/b_2.jpg
    schedule: 
      - 4/5/2018 12:00 PDT
EOF
```

Now create a CRON job that will periodically (every 15 minutes) inspect your schedule and send out any tweets that are due using the [twitter compiler](https://github.com/tjanczuk/wtc/blob/master/twitter_compiler.js):

```bash
wt cron create buffer.yaml -n buffer \
  --schedule 15m \
  --no-auth \
  -d webtask-compiler \
  --meta wt-compiler=webtask-compiler/twitter \
  -s TWITTER_CONSUMER_KEY={YOUR_TWITTER_CONSUMER_KEY} \
  -s TWITTER_CONSUMER_SECRET={YOUR_TWITTER_CONSUMER_SECRET} \
  -s TWITTER_ACCESS_TOKEN_KEY={YOUR_TWITTER_ACCESS_TOKEN_KEY} \
  -s TWITTER_ACCESS_TOKEN_SECRET={YOUR_TWITTER_ACCESS_TOKEN_SECRET}
```

(You can get your Twitter credentials from [here](https://apps.twitter.com/)). 

And that's it, sit back and watch your tweets being sent out!

If you later want to add new tweets or add or modify scheduled times, you can simply edit the YAML representing your schedule:

```bash
wt edit buffer
```

This will open the Webtask Editor allowing you to modify the schedule:

![image](https://user-images.githubusercontent.com/822369/38399064-e2e9eee8-38fc-11e8-9e17-7c03dd736e9c.png)

## Embeddable NPS widget

This compiler enables you to create an embeddable HTML widget, complete with a backend, storage, and simple reporting, for tracking a single Net Promoter Score (NPS) question. It can be embedded in your website, blog, or single page app. 

Start off simple by creating a webtask using this compliler:

```bash
wt create -n nps \
  -d webtask-compiler \
  --meta wt-compiler=webtask-compiler/nps \
  -s SCALE=10 <<EOF
EOF
```

A single webtask represents a distinct NPS poll - it maintains its own set of results. If you want to run multiple NPS polls, create a separate webtask for each. 

The only parameter that must be provided at creation time is *SCALE*. It controls the upper bound of the rating end users can provide (starting from 0), and is 10 by default, following NPS methodology. You can set it arbitrary other value (e.g. 5) if you want to use the widget in contexts outside of NPS, e.g. a 5-star product rating. 

Once the webtask is created, you can navigate to it in the browser to test it:

![image](https://user-images.githubusercontent.com/822369/44885448-bacdca00-ac75-11e8-8c9c-b53ad3ffc69e.png)

Clicking on a particular star rating registers the answer on the backend using [webtask storage](). HTTP cookies are used to correlate and retrieve your answer next time you visit the widget, so that one end user will normally be only able to provide a single answer, which can be changed on a subsequent visit. This is of course not bullet-proof if the cookie is manually removed or a private browser session is used. But it may be good enough for what you want to do. 

To embed the widget on your site, use an *iframe*: 

```html
<p>How likely are you to recommend webtask.io to your friend or colleague?</p>
<p><<iframe src="{webtask_url}" style="border: 0; height: 1em; width: 11em;"></iframe></p>
```

Finally, to obtain the results of the NPS pool, navigate to *{webtask_url}/stats* endpoint, which will serve the stats in JSON:

![image](https://user-images.githubusercontent.com/822369/44885671-06cd3e80-ac77-11e8-833e-74c203c87b79.png)

### UI customization

You can control a few aspects of how the widget displays the rating with URL query parameters passed to the webtask URL:

* **color** controls the color of the widget, e.g. *blue*. Default *orange*.  
* **size** controls the font size, e.g. *2em*. Default *1em*.  
* **filledSymbol** Unicode symbol representing the "positive" rating. Default *&#x2605* (filled star).  
* **emptySymbol** Unicode symbol representing the "negative" rating. Default *&#x2606* (empty star).  

For example:

![image](https://user-images.githubusercontent.com/822369/44885819-d20db700-ac77-11e8-99ab-bd30fe6deb54.png)


