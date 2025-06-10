import { Config, HttpRequest, Kv } from "@fermyon/spin-sdk";

const TELEGRAM_API_URL = "https://api.telegram.org";
const OAUTH_CLIENT_ID =
  "136721311837-gbbuar32vp811u532o9907d7nhfelt2g.apps.googleusercontent.com";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GEMENI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface Part {
  thought?: boolean;
  text: string;
}

interface Candidate {
  content: {
    parts: Part[];
    role: string;
  };
}

interface GenerateContentResponse {
  candidates: Candidate[];
  modelVersion: string;
  responseId: string;
}

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

async function getAllUsers(): Promise<string[]> {
  const store = Kv.openDefault();
  const keys = store.getKeys();
  return keys;
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

async function getUserTokens(userId: string): Promise<kvPostBody | null> {
  let tokenObject: kvPostBody = JSON.parse(await kvGet(userId));
  // check if the access token is expired, if so, refresh it
  if (
    tokenObject["expires_in"] !== undefined &&
    tokenObject["expires_in"] <= Date.now()
  ) {
    return await refreshAccessToken(userId, tokenObject["refresh_token"]);
  }

  return tokenObject;
}

async function refreshAccessToken(
  userId: string,
  refreshToken: string
): Promise<kvPostBody | null> {
  // fetch new access token from google token API
  let tokenAPIResponse;
  tokenAPIResponse = await getNewAccessToken(refreshToken);

  if (tokenAPIResponse === null) {
    return null;
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
  return postBody;
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

async function inferGemini(prompt: string): Promise<string | null> {
  const apiKey: string = Config.get("google_ai_api_key");

  var url = GEMENI_API_URL + "?key=" + apiKey;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (response.status == 200) {
    const responseJson = (await response.json()) as GenerateContentResponse;
    const responseText = responseJson.candidates[0].content.parts[0].text;
    return responseText;
  } else {
    console.log(`Failed to get Gemini Response: ${response.status}}`);
    return null;
  }
}

export {
  sendTextMessage,
  RequestBody,
  kvPostBody,
  getUserTokens,
  refreshAccessToken,
  inferGemini,
  getAllUsers,
};
