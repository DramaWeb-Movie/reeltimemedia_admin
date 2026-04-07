import { createLogger } from "@/lib/logger";
import { buildMovieUrl, type NewMovieNotificationInput } from "@/lib/notifications/new-movie-input";

const log = createLogger("notifications:telegram");

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
