import {
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";

const TELEGRAM_API_URL = "https://api.telegram.org";

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

export const handleRequest: HandleRequest = async function (
  request: HttpRequest
): Promise<HttpResponse> {
  const botToken = Config.get("telegram_bot_token");
  const url = new URL(request.headers["spin-full-url"]);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state");
  if (code === null || userId === null) {
    return { status: 400 };
  }
  await sendTextMessage("You have successfully logged in!", userId, botToken);
  console.log(request.headers["spin-full-url"]);
  return { status: 200 }; // TODO: return webpage that says "You have successfully logged in!"
};
