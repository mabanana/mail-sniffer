import {
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";

const OAUTH_URL =
  "https://accounts.google.com/o/oauth2/auth?client_id=136721311837-gbbuar32vp811u532o9907d7nhfelt2g.apps.googleusercontent.com&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly&redirect_uri=https%3A%2F%2Fmail-sniffer.fermyon.app%2Foauth%2Fcallback&response_type=code&state=";
const HELP_MESSAGE =
  "Welcome to Mail Sniffer! Here are the commands you can use:\n\n/login - Login to your Google account\n/getmail - Get your Gmail rundown\n/help - Get this message";
const TELEGRAM_API_URL = "https://api.telegram.org";

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

async function sendTextMessage(text: string, chatId: string, botToken: string) {
  return fetch(TELEGRAM_API_URL + "/bot" + botToken + "/sendMessage", {
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

function handleLogin(userId: string, chatId: string, botToken: string) {
  sendTextMessage(
    "Please login to your Google account by clicking on the following link: \n" +
      OAUTH_URL +
      userId,
    chatId,
    botToken
  );
}

function handleHelp(hasMessage: boolean, chatId: string, botToken: string) {
  if (hasMessage) {
    sendTextMessage(
      "I did not understand you message, please refer to these instructions: ",
      chatId,
      botToken
    );
  }
  sendTextMessage(HELP_MESSAGE, chatId, botToken);
}

function handleGetMail(userId: string, chatId: string, botToken: string) {
  sendTextMessage("This feature is not ready yet.", chatId, botToken);
}

export const handleRequest: HandleRequest = async function (
  request: HttpRequest
): Promise<HttpResponse> {
  const botToken = Config.get("telegram_bot_token");
  const body: TelegramUpdate = request.json();

  if (body.message === undefined) {
    return { status: 200 };
  }
  const chatId = body.message.chat.id;
  const userId = body.message.from.id;

  // handle /commands and returns help message if command is not recognized
  if (body.message.text === undefined) {
    await handleHelp(false, chatId, botToken);
    return { status: 200 };
  } else if (body.message.text.toLowerCase().startsWith("/login")) {
    handleLogin(userId, chatId, botToken);
    return { status: 200 };
  } else if (body.message.text.toLowerCase().startsWith("/getmail")) {
    handleGetMail(userId, chatId, botToken);
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
