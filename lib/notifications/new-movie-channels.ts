import { createLogger } from "@/lib/logger";
import { notifyFacebookNewMovie } from "@/lib/notifications/facebook";
import { notifyTelegramNewMovie } from "@/lib/notifications/telegram";
import type { NewMovieNotificationInput } from "@/lib/notifications/new-movie-input";

const log = createLogger("notifications:new-movie-channels");

/**
 * Best-effort fan-out: one channel failing should not block uploads.
 */
export async function notifyNewMovieChannels(input: NewMovieNotificationInput): Promise<void> {
  const results = await Promise.allSettled([
    notifyTelegramNewMovie(input),
    notifyFacebookNewMovie(input),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      log.warn("New movie channel notification failed", {
        movieId: input.movieId,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }
}
