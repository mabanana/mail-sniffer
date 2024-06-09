import {
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";

const TELEGRAM_API_URL = "https://api.telegram.org";

interface TelegramUpdate {
  message?: {
    text?: string;
    chat: {
      id: number;
    };
  };
}

async function sendTextMessage(text: string, chatId: number, botToken: string) {
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

export const handleRequest: HandleRequest = async function (
  request: HttpRequest
): Promise<HttpResponse> {
  const botToken = Config.get("telegram_bot_token");
  const body: TelegramUpdate = request.json();

  if (body.message === undefined) {
    return {
      status: 200,
    };
  }
  const chatId = body.message.chat.id;

  if (body.message.text === undefined) {
    await sendTextMessage("Message text not found.", chatId, botToken);
    return {
      status: 200,
    };
  }
  const message = body.message.text;

  await sendTextMessage(message + " from bot", chatId, botToken);

  return {
    status: 200,
  };
};
