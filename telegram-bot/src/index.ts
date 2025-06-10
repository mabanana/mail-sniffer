import {
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";
import {
  handleLogin,
  handleHelp,
  TelegramUpdate,
  handleLogOut,
} from "./defaults";

export const handleRequest: HandleRequest = async function (
  request: HttpRequest
): Promise<HttpResponse> {
  let body: TelegramUpdate;
  try {
    body = request.json() as TelegramUpdate;
  } catch (err: any) {
    if (err.message === undefined) {
      return { status: 400, body: "Cannot parse request" };
    } else {
      return { status: 400, body: "Cannot parse request: " + err.message };
    }
  }
  const botToken = Config.get("telegram_bot_token");
  if (body.message === undefined) {
    return { status: 400 };
  }
  const chatId: string = body.message.chat.id;
  const userId: string = body.message.from.id;

  // handle /commands and returns help message if command is not recognized
  if (body.message.text === undefined) {
    await handleHelp(false, chatId, botToken);
    return { status: 200 };
  } else if (body.message.text.toLowerCase().startsWith("/login")) {
    await handleLogin(userId, chatId, botToken);
    return { status: 200 };
  } else if (body.message.text.toLowerCase().startsWith("/logout")) {
    await handleLogOut(userId, chatId, botToken);
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
