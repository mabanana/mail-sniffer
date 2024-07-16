import {
  Llm,
  InferencingModels,
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";
import { sendTextMessage, RequestBody } from "./defaults";
import { sanitizeTextForPrompt } from "./gmail";

export const handleRequest: HandleRequest = async function (
  request: HttpRequest
): Promise<HttpResponse> {
  const telegram_bot_token = Config.get("telegram_bot_token");
  if (request.headers["authorization"] !== "Bearer 78Rw8iJF47pUswoOy7RcRi") {
    return { status: 401 };
  }
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

  if (requestBody.body_text === undefined) {
    return { status: 400 };
  }
  const gmailMessage = requestBody.body_text;
  const chatId = "1132358892"; // TODO: match to correct chatId using email address maybe
  let feed = sanitizeTextForPrompt(gmailMessage);
  let prompt =
    "Please summarize the contents of this email in less than 2 sentences: ";
  feed = prompt + feed;
  console.log("prompt: ", feed);
  const out = Llm.infer(InferencingModels.Llama2Chat, prompt, {
    maxTokens: 1000,
  });
  let outMessage = out.text;
  if (outMessage.startsWith(prompt)) {
    outMessage = out.text.slice(prompt.length);
  }
  await sendTextMessage(
    "AI Generated Message: " + outMessage,
    chatId,
    telegram_bot_token
  );
  console.log("AI LLAMA-2 Response: " + outMessage);
  //console.log(await getGmailMessage("190a3b05c3e85ad4", accessToken));
  return { status: 200, body: outMessage };
};
