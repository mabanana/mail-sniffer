import {
  Llm,
  InferencingModels,
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";
import { sendTextMessage, getUserTokens, inferGemini } from "./defaults";
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
  const url = new URL(request.headers["spin-full-url"]);

  if (request.headers["authorization"] !== cron_job_auth_key) {
    return { status: 401 };
  }

  // TODO: Get Gmail message from connected Gmail account instead of static chatId
  const userTokens = await getUserTokens(chatId);
  if (userTokens === null) {
    console.log("Access token returned null.");
    return { status: 400, body: "Cannot access Gmail API" };
  }
  const accessToken = userTokens.access_token;

  const gmailMessageList = await getGmailMessageList(chatId, userTokens);
  // TODO: force refresh token if response is 401
  if (gmailMessageList.messages === undefined) {
    console.log("Cannot fetch gmail message list.");
    return { status: 400, body: "Cannot access Gmail API" };
  }

  let gmailMessage: string;
  if (gmailMessageList.messages.length > 0) {
    let gmailMessageId = gmailMessageList.messages[1].id;
    let gmailMessageResource = await getGmailMessage(
      chatId,
      gmailMessageId,
      userTokens
    );
    gmailMessage = parseGmailMessageResource(gmailMessageResource);
  } else {
    return { status: 400 };
  }

  let feed = sanitizeTextForPrompt(gmailMessage);
  let prompt =
    "Please summarize this email including who its from and what it wants from me in less than 2 sentences: ";
  prompt = prompt + feed;
  console.log("prompt: ", feed);

  if (!url.host.startsWith("127.0.0.1")) {
    const out = Llm.infer(InferencingModels.Llama2Chat, prompt, {
      maxTokens: 200,
    });
    let outMessage = out.text;
    if (outMessage.startsWith(prompt)) {
      outMessage = out.text.slice(prompt.length);
    }
    await sendTextMessage(
      "AI LLAMA-2: " + outMessage,
      chatId,
      telegram_bot_token
    );
    console.log("AI LLAMA-2 Response: " + outMessage);
  }

  const geminiMessage = await inferGemini(prompt);
  if (geminiMessage !== null) {
    await sendTextMessage(
      "AI Gemini 2.0 Flash: " + geminiMessage,
      chatId,
      telegram_bot_token
    );
    console.log("AI Gemini 2.0 Flash Response: " + geminiMessage);
  } else {
    console.log("AI Gemini 2.0 Flash Response: No Response");
  }

  return { status: 200, body: geminiMessage ?? "" };
};
