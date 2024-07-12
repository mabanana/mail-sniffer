import {
  Llm,
  InferencingModels,
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";
import {
  sendTextMessage,
  RequestBody,
  parseGmailMessageResource,
} from "./defaults";

export const handleRequest: HandleRequest = async function (
  request: HttpRequest
): Promise<HttpResponse> {
  const telegram_bot_token = Config.get("telegram_bot_token");
  let requestBody;
  try {
    requestBody = request.json() as RequestBody;
  } catch (err: any) {
    if (err.message === undefined) {
      return { status: 400, body: "Cannot parse request" };
    } else {
      return { status: 400, body: "Cannot parse request: " + err.message };
    }
  }

  if (requestBody.message === undefined || requestBody.chatId === undefined) {
    return { status: 400 };
  }
  const gmailMessage = requestBody.message;
  const chatId = requestBody.chatId;
  let feed = parseGmailMessageResource(gmailMessage);
  let prompt =
    "Please summarize the contents of this email in less than 2 sentences: ";
  prompt += feed;
  console.log("prompt: ", prompt);
  const out = Llm.infer(InferencingModels.Llama2Chat, prompt, {
    maxTokens: 1000,
  });
  await sendTextMessage(out.text, chatId, telegram_bot_token);
  console.log(out);
  return { status: 200, body: out.text };
};
