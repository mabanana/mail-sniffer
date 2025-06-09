import {
  Llm,
  InferencingModels,
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";
import { sendTextMessage, RequestBody, getAccessToken } from "./defaults";
import {
  getGmailMessage,
  getGmailMessageList,
  parseGmailMessageResource,
  sanitizeTextForPrompt,
} from "./gmail";

export const handleRequest: HandleRequest = async function (
  request: HttpRequest
): Promise<HttpResponse> {
  const telegram_bot_token = Config.get("telegram_bot_token");
  const cron_job_auth_key = Config.get("cron_job_auth_key");
  const chatId = "1132358892"; // TODO: match to correct chatId using email address maybe

  if (request.headers["authorization"] !== cron_job_auth_key) {
    return { status: 401 };
  }

  // Uses requestBody as the gmail message
  // let requestBody;
  // try {
  //   requestBody = request.json() as RequestBody;
  // } catch (err: any) {
  //   if (err.message === undefined) {
  //     return { status: 400, body: "Cannot parse request" };
  //   } else {
  //     return { status: 400, body: "Cannot parse request: " + err.message };
  //   }
  // }

  // if (requestBody.body_text === undefined) {
  //   return { status: 400 };
  // }
  // const gmailMessage = requestBody.body_text;

  // Get Gmail message from connected Gmail account

  const accessToken = await getAccessToken(chatId);
  if (accessToken === null) {
    console.log("Access token returned null.");
    return { status: 400, body: "Cannot access Gmail API" };
  }

  const gmailMessageList = await getGmailMessageList(accessToken);
  if (gmailMessageList.messages === undefined) {
    console.log("Cannot fetch gmail message list.");
    return { status: 400, body: "Cannot access Gmail API" };
  }

  let gmailMessage: string;
  if (gmailMessageList.messages.length > 0) {
    let gmailMessageId = gmailMessageList.messages[1].id;
    let gmailMessageResource = await getGmailMessage(
      gmailMessageId,
      accessToken
    );
    gmailMessage = parseGmailMessageResource(gmailMessageResource);
  } else {
    return { status: 400 };
  }

  let feed = sanitizeTextForPrompt(gmailMessage);
  let prompt =
    "Please summarize the contents of this email in less than 2 sentences: ";
  feed = prompt + feed;
  console.log("prompt: ", feed);
  const out = Llm.infer(InferencingModels.Llama2Chat, prompt, {
    maxTokens: 200,
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
  console.log(await getGmailMessage("190a3b05c3e85ad4", accessToken));
  return { status: 200, body: outMessage };
};
