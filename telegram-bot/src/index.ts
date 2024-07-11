import {
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";

const OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const HELP_MESSAGE =
  "Welcome to Mail Sniffer! Here are the commands you can use:\n\n/login - Login to your Google account\n/help - Get this message";
const TELEGRAM_API_URL = "https://api.telegram.org";
const OAUTH_CLIENT_ID =
  "136721311837-gbbuar32vp811u532o9907d7nhfelt2g.apps.googleusercontent.com";
const OAUTH_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const OAUTH_REDIRECT_URI = "https://mail-sniffer.fermyon.app/oauth/callback";
const OAUTH_RESPONSE_TYPE = "code";
const OAUTH_ACCESS_TYPE = "offline";

interface TelegramUpdate {
  message?: {
    text?: string;
    chat: {
      id: string;
    };
    from: {
      id: string;
    };
  };
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

async function handleLogin(
  userId: string,
  chatId: string,
  botToken: string
): Promise<void> {
  await sendTextMessage(
    "Please login to your Google account by clicking on the following link: \n" +
      getOAuthUrl(userId) +
      "\n" +
      "Or use the following link to login locally: \n" +
      getLocalOAuthUrl(userId),
    chatId,
    botToken
  );
}

async function handleHelp(
  hasMessage: boolean,
  chatId: string,
  botToken: string
): Promise<void> {
  if (hasMessage) {
    await sendTextMessage(
      "I did not understand you message, please refer to these instructions: ",
      chatId,
      botToken
    );
  }
  await sendTextMessage(HELP_MESSAGE, chatId, botToken);
}

function getOAuthUrl(userId: string): string {
  let url = new URL(OAUTH_URL);
  url.searchParams.append("client_id", OAUTH_CLIENT_ID);
  url.searchParams.append("scope", OAUTH_SCOPE);
  url.searchParams.append("redirect_uri", OAUTH_REDIRECT_URI);
  url.searchParams.append("response_type", OAUTH_RESPONSE_TYPE);
  url.searchParams.append("state", userId);
  url.searchParams.append("access_type", OAUTH_ACCESS_TYPE);
  return url.toString() + "?" + url.searchParams.toString();
}

function getLocalOAuthUrl(userId: string): string {
  let url = new URL(OAUTH_URL);
  url.searchParams.append("client_id", OAUTH_CLIENT_ID);
  url.searchParams.append("scope", OAUTH_SCOPE);
  url.searchParams.append(
    "redirect_uri",
    "http://127.0.0.1:3000/oauth/callback"
  );
  url.searchParams.append("response_type", OAUTH_RESPONSE_TYPE);
  url.searchParams.append("state", userId);
  url.searchParams.append("access_type", OAUTH_ACCESS_TYPE);
  return url.toString() + "?" + url.searchParams.toString();
}

export const handleRequest: HandleRequest = async function (
  request: HttpRequest
): Promise<HttpResponse> {
  const botToken = Config.get("telegram_bot_token");
  const body: TelegramUpdate = await request.json();

  if (body.message === undefined) {
    return { status: 200 };
  }
  const chatId = body.message.chat.id;
  const userId = body.message.from.id;

  // handle /commands and returns help message if command is not recognized
  // TODO: add /logout that deletes the key:value pair from the database
  if (body.message.text === undefined) {
    await handleHelp(false, chatId, botToken);
    return { status: 200 };
  } else if (body.message.text.toLowerCase().startsWith("/login")) {
    await handleLogin(userId, chatId, botToken);
    return { status: 200 };
  } else {
    await handleHelp(
      body.message.text.toLowerCase().startsWith("/help"),
      chatId,
      botToken
    );
    return { status: 200 };
  }
};
