/**
 * Build a canonical YouTube embed URL from common watch / Shorts / youtu.be shapes.
 * Returns null if the string is not a recognized YouTube video URL.
 */
export function getYouTubeEmbedUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;

  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\//, "").split("/")[0]?.split("?")[0];
    if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
    return null;
  }

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const v = url.searchParams.get("v");
    if (v) {
      return `https://www.youtube.com/embed/${encodeURIComponent(v)}`;
    }

    const embed = url.pathname.match(/^\/embed\/([^/?]+)/);
    if (embed?.[1]) {
      return `https://www.youtube.com/embed/${encodeURIComponent(embed[1])}`;
    }

    const shorts = url.pathname.match(/^\/shorts\/([^/?]+)/);
    if (shorts?.[1]) {
      return `https://www.youtube.com/embed/${encodeURIComponent(shorts[1])}`;
    }

    const legacyV = url.pathname.match(/^\/v\/([^/?]+)/);
    if (legacyV?.[1]) {
      return `https://www.youtube.com/embed/${encodeURIComponent(legacyV[1])}`;
    }
  }

  return null;
}

export function isLikelyDirectVideoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return /\.(mp4|webm|ogg)(\?|$)/i.test(u) || u.includes("/video/") || u.startsWith("blob:");
}
