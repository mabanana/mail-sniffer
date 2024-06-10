import {
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";

const TELEGRAM_API_URL = "https://api.telegram.org";
const OAUTH_CLIENT_ID =
  "136721311837-gbbuar32vp811u532o9907d7nhfelt2g.apps.googleusercontent.com";
const OAUTH_REDIRECT_URI = "https://mail-sniffer.fermyon.app/oauth/callback";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function sendTextMessage(
  text: string,
  chatId: string,
  botToken: string
): Promise<void> {
  await fetch(TELEGRAM_API_URL + "/bot" + botToken + "/sendMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
  });
}

// TODO: figure out why it doesnt return a refresh token
async function fetchAccessToken(
  code: string,
  clientSecret: string
): Promise<string> {
  const body: Record<string, string> = {
    code: code,
    client_secret: clientSecret,
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    grant_type: "authorization_code",
  };
  var content = Object.keys(body)
    .map(function (key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(body[key]);
    })
    .join("&");
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: content,
  });
  //TODO: check if access token is in response, otherwise return error
  return JSON.stringify(await response.json());
}
export const handleRequest: HandleRequest = async function (
  request: HttpRequest
): Promise<HttpResponse> {
  const botToken = Config.get("telegram_bot_token");
  const clientSecret = Config.get("google_oauth_client_secret");
  const url = new URL(request.headers["spin-full-url"]);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state");
  if (code === null || userId === null) {
    return { status: 400 };
  }

  const tokenAPIResponse = await fetchAccessToken(code, clientSecret);
  console.log(tokenAPIResponse);
  // TODO: store access token as userId : accessToken
  await sendTextMessage("You have successfully logged in!", userId, botToken);
  return { status: 200 }; // TODO: return webpage that says "You have successfully logged in!"
};
