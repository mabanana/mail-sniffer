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

const TEST_GMAIL_MESSAGE: GmailMessageResource = {
  id: "sample-email-id",
  threadId: "sample-thread-id",
  labelIds: ["UNREAD"],
  snippet: "This is a sample email",
  historyId: "sample-history-id",
  internalDate: "2022-01-01T00:00:00.000Z",
  payload: {
    partId: "sample-part-id",
    mimeType: "text/plain",
    filename: "",
    headers: [],
    body: {
      size: 0,
      data: "Hello, (@*&%)(*@$)@_i would like to tell you about the new product we have lau@(*nched! \n It is a new product that's very useful and can help you in your daily life. \n its called hello world, would you like to buy one? \n\n Thank you for your time.",
    },
    parts: [],
  },
};

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
  //const requestBody = (await request.json());
  const chatId = "1132358892"; // TODO: get chatId from requestBody
  let feed = parseGmailMessageResource(TEST_GMAIL_MESSAGE);
  let prompt =
    "I am the recipient of this is an email, please summarize the contents to me in less than 2 sentences: ";
  prompt += feed;
  console.log("prompt: ", prompt);
  const out = Llm.infer(model, prompt, { maxTokens: 1000 });
  await sendTextMessage(out.text, chatId, telegram_bot_token);
  console.log(out);
  return { status: 200, body: out.text };
};
