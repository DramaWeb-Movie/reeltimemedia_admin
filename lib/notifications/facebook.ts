import { createLogger } from "@/lib/logger";
import { buildMovieUrl, type NewMovieNotificationInput } from "@/lib/notifications/new-movie-input";

const log = createLogger("notifications:facebook");

function buildFacebookMessage(input: NewMovieNotificationInput): string {
  const title = input.title?.trim() || "New movie";
  const typeLabel = input.type === "series" ? "Series" : "Movie";
  const statusLabel = input.status ?? "published";
  return `${typeLabel}: ${title}\nStatus: ${statusLabel}`;
}

export async function notifyFacebookNewMovie(input: NewMovieNotificationInput): Promise<void> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const userWebBaseUrl = process.env.USER_WEB_URL;

  if (!pageId || !pageAccessToken || !userWebBaseUrl) {
    log.warn("Facebook notification skipped due to missing env variables", {
      hasPageId: Boolean(pageId),
      hasPageAccessToken: Boolean(pageAccessToken),
      hasUserWebUrl: Boolean(userWebBaseUrl),
    });
    return;
  }

  const movieUrl = buildMovieUrl(userWebBaseUrl, input.movieId);
  const formData = new URLSearchParams();
  formData.set("message", buildFacebookMessage(input));
  formData.set("link", movieUrl);
  formData.set("access_token", pageAccessToken);

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!response.ok) {
      const body = await response.text();
      log.warn("Facebook Graph API responded with non-OK status", {
        status: response.status,
        body,
        movieId: input.movieId,
      });
      return;
    }

    log.info("Facebook new movie notification sent", { movieId: input.movieId });
  } catch (error) {
    log.warn("Facebook notification request failed", {
      movieId: input.movieId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
