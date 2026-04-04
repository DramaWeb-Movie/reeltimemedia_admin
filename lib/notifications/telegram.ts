import { createLogger } from "@/lib/logger";

const log = createLogger("notifications:telegram");

interface NewMovieNotificationInput {
  movieId: string;
  title?: string | null;
  type?: "single" | "series" | string | null;
  status?: "draft" | "published" | string | null;
}

function buildMovieUrl(baseUrl: string, movieId: string): string {
  const normalizedBase = baseUrl.trim().replace(/\/$/, "");
  if (normalizedBase.includes("movie_id")) {
    return normalizedBase.replaceAll("movie_id", movieId);
  }
  return `${normalizedBase}/${movieId}`;
}

export async function notifyTelegramNewMovie(input: NewMovieNotificationInput): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  const userWebBaseUrl = process.env.USER_WEB_URL;

  if (!botToken || !channelId || !userWebBaseUrl) {
    log.warn("Telegram notification skipped due to missing env variables", {
      hasToken: Boolean(botToken),
      hasChannelId: Boolean(channelId),
      hasUserWebUrl: Boolean(userWebBaseUrl),
    });
    return;
  }

  const movieUrl = buildMovieUrl(userWebBaseUrl, input.movieId);
  const text = movieUrl;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        disable_web_page_preview: false,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      log.warn("Telegram API responded with non-OK status", {
        status: response.status,
        body,
        movieId: input.movieId,
      });
      return;
    }

    log.info("Telegram new movie notification sent", { movieId: input.movieId });
  } catch (error) {
    log.warn("Telegram notification request failed", {
      movieId: input.movieId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
