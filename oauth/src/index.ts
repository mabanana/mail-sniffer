import {
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
  Kv,
} from "@fermyon/spin-sdk";

interface tokenAPIResponsePayload {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

const TELEGRAM_API_URL = "https://api.telegram.org";
const OAUTH_CLIENT_ID =
  "136721311837-gbbuar32vp811u532o9907d7nhfelt2g.apps.googleusercontent.com";
const OAUTH_REDIRECT_URI = "https://mail-sniffer.fermyon.app/oauth/callback";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function kvPost(key: string, value: string): Promise<void> {
  const store = Kv.openDefault();
  store.set(key, value || new Uint8Array().buffer);
  //console.log("kvPost {key: ", key, ", value: ", value, "}");
}

async function kvGet(key: string): Promise<string> {
  const store = Kv.openDefault();
  const keys = store.getKeys();
  const decoder = new TextDecoder();
  const res: Record<string, any> = {};
  keys.map((k) => {
    if (k != "kv-credentials") {
      res[k] = decoder.decode(store.get(k) || new Uint8Array());
    }
  });
  return res[key] || null;
}

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

async function fetchAccessToken(
  code: string,
  clientSecret: string,
  local: boolean = false
): Promise<string | null> {
  let redirect_uri = OAUTH_REDIRECT_URI;
  if (local) {
    redirect_uri = "http://127.0.0.1:3000/oauth/callback";
  }
  const body: Record<string, string> = {
    code: code,
    client_secret: clientSecret,
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirect_uri,
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
  // check if the response is valid
  if (response.status !== 200) {
    console.log("Failed to fetch access token: " + response.status);
    return null;
  }
  const responseJson = await response.json();
  return JSON.stringify(responseJson); // has access token and refresh token, no need to JSON.parse
  // does not contain a refresh token if the previous refresh token has not expired
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
  const storedTokenResponse = await kvGet(userId);
  const storedTokenResponseJSON = JSON.parse(storedTokenResponse);
  if (storedTokenResponse !== null) {
    console.log("Overwriting existing token...");
    console.log("Previous fetch token response: ");
    console.log(storedTokenResponse + "\n");
  }
  let tokenAPIResponse;
  if (url.host === "127.0.0.1:3000") {
    tokenAPIResponse = await fetchAccessToken(code, clientSecret, true);
  } else {
    tokenAPIResponse = await fetchAccessToken(code, clientSecret);
  }

  if (tokenAPIResponse === null) {
    await sendTextMessage("You have failed to log in.", userId, botToken);
    return { status: 400 };
  }
  console.log("Fetch token response: ");
  console.log(tokenAPIResponse + "\n");
  const tokentAPIResponseJSON = JSON.parse(
    tokenAPIResponse
  ) as tokenAPIResponsePayload;
  const postBody = {
    access_token: tokentAPIResponseJSON["access_token"] ?? "",
    refresh_token:
      tokentAPIResponseJSON["refresh_token"] ??
      storedTokenResponseJSON["refresh_token"],
  };
  if (postBody["refresh_token"] === undefined) {
    console.log(
      "Did not log in properly. Please unlink your google account from mail-sniffer and log in again."
    );
    return { status: 400 };
  }
  await kvPost(userId, JSON.stringify(postBody)); // save json string with access and refresh token
  await sendTextMessage("You have successfully logged in!", userId, botToken);
  return { status: 200 }; // TODO: return webpage that says "You have successfully logged in!"
};
