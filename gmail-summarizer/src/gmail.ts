import { getAccessToken } from "./defaults";

interface listGmailMessageResponse {
  messages: GmailMessageResource[];
  nextPageToken: string;
  resultSizeEstimate: number;
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

async function getGmailMessage(
  messageId: string,
  accessToken: string
): Promise<GmailMessageResource> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (response.status !== 200) {
    console.log(`Failed to fetch message: ${response.status}`);
  }
  return (await response.json()) as GmailMessageResource;
}

async function getGmailMessageList(
  accessToken: string,
  query: string = ""
): Promise<listGmailMessageResponse> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages` +
      new URLSearchParams({
        maxResults: "2",
        q: query,
        labelIds: "INBOX,UNREAD",
      }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (response.status !== 200) {
    console.log(`Failed to fetch message: ${response.status}`);
  }
  return (await response.json()) as listGmailMessageResponse;
}

function parseGmailMessageResource(message: GmailMessageResource): string {
  const { payload } = message;
  let out = "";
  let add = "";
  if (payload.mimeType === "text/plain") {
    for (var gmailHeader of payload.headers) {
      if (
        gmailHeader.name === "Content-Type" &&
        gmailHeader.value.search("utf-8")
      ) {
        add = utf8ToPlainText(payload.body.data);
      }
    }
    out += sanitizeTextForPrompt(add);
  }
  if (payload.parts) {
    for (var part of payload.parts) {
      if (part.mimeType === "text/plain") {
        for (var gmailHeader of part.headers) {
          if (
            gmailHeader.name === "Content-Type" &&
            gmailHeader.value.search("utf-8")
          ) {
            add = utf8ToPlainText(part.body.data);
          }
        }
        out += sanitizeTextForPrompt(add);
      }
    }
  }
  //console.log("Can only parse text/plain mime type"); // TODO: handle other mime types and nested parts
  return out;
}

function sanitizeTextForPrompt(text: string): string {
  let sanitized = text.replace(/\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+/gi, "");

  // Remove email addresses
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ""
  );

  // Remove non-alphabetical "words" (keep words with at least 2 alpha chars)
  sanitized = sanitized
    .split(/\s+/)
    .filter(
      (word) => word.length > 1 && /[a-zA-Z]{2,}/.test(word) // at least 2 alpha chars
    )
    .join(" ");

  // Optionally, collapse multiple spaces and trim
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}

function isAlphaNumeric(str: string): boolean {
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

function utf8ToPlainText(text: string): string {
  try {
    // Gmail API returns base64url encoded strings for message bodies
    // Replace URL-safe chars and decode
    const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return decoded;
  } catch (e) {
    console.error("Failed to decode UTF-8 text:", e);
    return "";
  }
}

export {
  getGmailMessage,
  getGmailMessageList,
  parseGmailMessageResource,
  sanitizeTextForPrompt,
};
