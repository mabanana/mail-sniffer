import { Kv } from "@fermyon/spin-sdk";

const TELEGRAM_API_URL = "https://api.telegram.org";

interface RequestBody {
  body_text: string;
}

interface kvPostBody {
  access_token: string;
  refresh_token: string;
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

async function getAccessToken(userId: string): Promise<string> {
  const tokenObject: kvPostBody = JSON.parse(await kvGet(userId));
  // TODO check if the access token is expired, if so, refresh it
  return tokenObject.access_token;
}

export { sendTextMessage, RequestBody, getAccessToken };
