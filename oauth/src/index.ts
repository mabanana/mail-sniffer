import {
  HandleRequest,
  HttpRequest,
  HttpResponse,
  Config,
} from "@fermyon/spin-sdk";

import {
  kvGet,
  kvPost,
  sendTextMessage,
  fetchAccessToken,
  tokenAPIResponsePayload,
} from "./defaults";

export const handleRequest: HandleRequest = async function (
  request: HttpRequest
): Promise<HttpResponse> {
  const botToken = Config.get("telegram_bot_token");
  const clientSecret = Config.get("google_oauth_client_secret");
  const url = new URL(request.headers["spin-full-url"]);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state");
  if (code === null || userId === null) {
    return { status: 400 };
  }

  // fetch stored access token from kv store
  const storedTokenResponse = await kvGet(userId);
  const storedTokenResponseJSON = JSON.parse(storedTokenResponse);
  if (storedTokenResponse !== null) {
    console.log("Overwriting existing token...");
    console.log("Previous fetch token response: ");
    console.log(storedTokenResponse + "\n");
  }

  // fetch new access token from google token API
  let tokenAPIResponse;
  if (url.host === "127.0.0.1:3000") {
    tokenAPIResponse = await fetchAccessToken(code, clientSecret, true);
  } else {
    tokenAPIResponse = await fetchAccessToken(code, clientSecret);
  }
  if (tokenAPIResponse === null) {
    await sendTextMessage("You have failed to log in.", userId, botToken);
    return { status: 400 };
  }
  console.log("Fetch token response: ");
  console.log(tokenAPIResponse + "\n");
  const tokentAPIResponseJSON = JSON.parse(
    tokenAPIResponse
  ) as tokenAPIResponsePayload;

  // post access and refresh token to kv store
  const postBody = {
    access_token: tokentAPIResponseJSON["access_token"] ?? "",
    refresh_token:
      tokentAPIResponseJSON["refresh_token"] ??
      storedTokenResponseJSON["refresh_token"],
  };
  if (postBody["refresh_token"] === undefined) {
    console.log(
      "Did not log in properly. Please unlink your google account from mail-sniffer and log in again."
    );
    return { status: 400 };
  }
  await kvPost(userId, JSON.stringify(postBody));
  await sendTextMessage("You have successfully logged in!", userId, botToken);

  return {
    // TODO: Create HTML page for this
    status: 200,
    body: "<html><body><h1>You have successfully logged in!</h1></body></html>",
    headers: {
      "Content-Type": "text/html",
    },
  };
};
