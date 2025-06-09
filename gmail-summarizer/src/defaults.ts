import { Config, HttpRequest, Kv } from "@fermyon/spin-sdk";

const TELEGRAM_API_URL = "https://api.telegram.org";
const OAUTH_CLIENT_ID =
  "136721311837-gbbuar32vp811u532o9907d7nhfelt2g.apps.googleusercontent.com";
const OAUTH_REDIRECT_URI = "https://mail-sniffer.fermyon.app/oauth/callback";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface tokenRefreshResponsePayload {
  access_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
}

interface RequestBody {
  body_text: string;
}

interface kvPostBody {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

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

async function getDailyUpdate(accessToken: string): Promise<void> {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1);
  const query = "after:" + currentDate.toISOString();
  return;
}

async function getAccessToken(userId: string): Promise<string | null> {
  let tokenObject: kvPostBody = JSON.parse(await kvGet(userId));
  // check if the access token is expired, if so, refresh it
  if (
    tokenObject["expires_in"] !== undefined &&
    tokenObject["expires_in"] <= Date.now()
  ) {
    return await refreshAccessToken(userId, tokenObject["refresh_token"]);
  }

  return tokenObject.access_token;
}

async function refreshAccessToken(
  userId: string,
  refreshToken: string
): Promise<string | null> {
  // fetch new access token from google token API
  let tokenAPIResponse;
  tokenAPIResponse = await getNewAccessToken(refreshToken);

  if (tokenAPIResponse === null) {
    return "";
  }
  console.log("Fetch refresh token response: ");
  console.log(tokenAPIResponse + "\n");
  const tokentAPIResponseJSON = JSON.parse(
    tokenAPIResponse
  ) as tokenRefreshResponsePayload;

  const newAccessToken = tokentAPIResponseJSON["access_token"];
  // post access and refresh token to kv store
  const postBody = {
    access_token: newAccessToken,
    refresh_token: refreshToken,
    expires_in: Date.now() + tokentAPIResponseJSON["expires_in"] * 1000,
  };

  await kvPost(userId, JSON.stringify(postBody));
  return newAccessToken;
}

async function getNewAccessToken(refreshToken: string): Promise<string | null> {
  const clientSecret = Config.get("google_oauth_client_secret");

  const body: Record<string, string> = {
    refresh_token: refreshToken,
    client_secret: clientSecret,
    client_id: OAUTH_CLIENT_ID,
    grant_type: "refresh_token",
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
    console.log("Failed to refresh access token: " + response.status);
    return null;
  }
  const responseJson = await response.json();
  return JSON.stringify(responseJson);
}
export { sendTextMessage, RequestBody, getAccessToken };
