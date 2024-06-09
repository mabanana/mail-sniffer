## Telegram Echo Bot

A simple Telegram Bot using Fermyon Cloud, that echoes messages sent to it back to the user.


### Build

```console
npm install
spin build
```
web-cli may fail to install, in that case use `npm install -D webpack-cli`

### Run

Export the secret token variable into your environment for local testing:
```console
export SPIN_VARIABLE_TELEGRAM_BOT_TOKEN="<TELEGRAM_TOKEN>"
```

Use `spin up` or  `spin watch` to run the app and rebuild on any changes to `package.json` or the files in `src`.

Use e.g. `curl -v http://127.0.0.1:3000` to test the endpoint.


### Deploy

Upload your secret token variable to you Fermyon Cloud App
```console
spin deploy --variable telegram_bot_token=<TELEGRAM_TOKEN>
```

### Setup Webhook

```console
curl --request POST --url https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook --header 'content-type: application/json' --data '{"url": "<LINK_YOU_GET_FROM_SERVERLESS_DEPLOY>"}'
```

Now any message sent to your bot via Telegram will make requests to you Fermyon Cloud serverless deploy.
