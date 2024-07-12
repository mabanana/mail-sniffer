import {
  Llm,
  InferencingModels,
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";

const model = InferencingModels.Llama2Chat;
const TELEGRAM_API_URL = "https://api.telegram.org";

interface RequestBody {
  message?: GmailMessageResource;
  chatId?: string;
}

interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: {
    name: string;
    value: string;
  }[];
  body: {
    size: number;
    data: string;
  };
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessageResource {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: GmailHeader[];
    body: {
      size: number;
      data: string;
    };
    parts: GmailMessagePart[];
  };
}

function isAlphaNumeric(str: string) {
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (
      !(code > 47 && code < 58) && // numeric (0-9)
      !(code > 64 && code < 91) && // upper alpha (A-Z)
      !(code > 96 && code < 123) // lower alpha (a-z)
    ) {
      return false;
    }
  }
  return true;
}

function parseTextForPrompt(text: string): string {
  let output = [];
  for (let i = 0; i < text.length; i++) {
    if (isAlphaNumeric(text[i]) || " '.!?,".includes(text[i])) {
      output.push(text[i]);
    } else if ("\n".includes(text[i])) {
      output.push(" ");
    } else {
      output.push("");
    }
  }
  return output.join("");
}

function parseGmailMessageResource(message: GmailMessageResource): string {
  const { payload } = message;
  if (payload.mimeType === "text/plain") {
    return parseTextForPrompt(payload.body.data);
  }
  console.log("Can only parse text/plain mime type"); // TODO: handle other mime types and nested parts
  return "";
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
  const out = Llm.infer(model, prompt, { maxTokens: 1000 });
  await sendTextMessage(out.text, chatId, telegram_bot_token);
  console.log(out);
  return { status: 200, body: out.text };
};
