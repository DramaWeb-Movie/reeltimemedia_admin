"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

interface HlsQualityPlayerProps {
  manifestUrl?: string | null;
  fallbackUrl?: string | null;
  poster?: string;
  className?: string;
}

type FixedQuality = 1080 | 720 | 360;
const FIXED_QUALITIES: FixedQuality[] = [1080, 720, 360];

export function HlsQualityPlayer({ manifestUrl, fallbackUrl, poster, className }: HlsQualityPlayerProps) {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const [availableHeights, setAvailableHeights] = useState<number[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [nativeHls, setNativeHls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;
    setAvailableHeights([]);
    setSelectedQuality("auto");
    setNativeHls(false);

    if (manifestUrl && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(manifestUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const heights = Array.from(new Set(hls.levels.map((level) => level.height))).sort((a, b) => b - a);
        setAvailableHeights(heights);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        hls.destroy();
        hlsRef.current = null;
        if (fallbackUrl) {
          video.src = fallbackUrl;
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (manifestUrl && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = manifestUrl;
      setNativeHls(true);
      return;
    }

    if (fallbackUrl) {
      video.src = fallbackUrl;
    }
  }, [manifestUrl, fallbackUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const onLoadedMetadata = () => setDuration(video.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);

    onLoadedMetadata();
    onTimeUpdate();
    onVolumeChange();

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
    };
  }, [manifestUrl, fallbackUrl]);

  useEffect(() => {
    function onFullscreenChange() {
      const current = playerRef.current;
      setIsFullscreen(Boolean(current && document.fullscreenElement === current));
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    keepControlsVisible();
  }, [isPlaying]);

  const qualityOptions = useMemo(
    () =>
      FIXED_QUALITIES.map((q) => ({
        value: String(q),
        label: `${q}p`,
        available: availableHeights.includes(q),
      })),
    [availableHeights]
  );

  const canManualQualitySwitch = Boolean(manifestUrl) && !nativeHls;
  const playbackModeLabel = manifestUrl ? (nativeHls ? "HLS Native" : "HLS.js") : "Original MP4";

  function onQualityChange(value: string) {
    setSelectedQuality(value);
    const hls = hlsRef.current;
    if (!hls) return;

    if (value === "auto") {
      hls.currentLevel = -1;
      return;
    }

    const height = Number(value);
    const targetIndex = hls.levels.findIndex((level) => level.height === height);
    if (targetIndex >= 0) {
      hls.currentLevel = targetIndex;
    }
  }

  async function toggleFullscreen() {
    const current = playerRef.current;
    if (!current) return;

    if (document.fullscreenElement === current) {
      await document.exitFullscreen();
      return;
    }

    await current.requestFullscreen();
  }

  async function togglePlayPause() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play();
    } else {
      video.pause();
    }
  }

  function onSeek(nextValue: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = nextValue;
    setCurrentTime(nextValue);
  }

  function onVolumeInput(nextValue: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = nextValue;
    video.muted = nextValue === 0;
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }

  function rewind10() {
    const video = videoRef.current;
    if (!video) return;
    onSeek(Math.max(0, video.currentTime - 10));
  }

  function forward10() {
    const video = videoRef.current;
    if (!video) return;
    onSeek(Math.min(duration || 0, video.currentTime + 10));
  }

  function keepControlsVisible() {
    setShowControls(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    if (isPlaying) {
      hideTimerRef.current = window.setTimeout(() => {
        setShowControls(false);
        setShowQualityMenu(false);
      }, 2200);
    }
  }

  return (
    <div
      ref={playerRef}
      className="overflow-hidden rounded-2xl border border-slate-700/70 bg-black shadow-xl"
      onMouseMove={keepControlsVisible}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <div className="relative hls-quality-player bg-black">
        <video
          ref={videoRef}
          className={`${className ?? "w-full h-full object-contain"} hls-quality-video`}
          controls={false}
          controlsList="nofullscreen noremoteplayback nodownload"
          disablePictureInPicture
          playsInline
          preload="metadata"
          poster={poster}
          onClick={() => void togglePlayPause()}
        >
          Your browser does not support the video tag.
        </video>

        <div
          className={`absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/92 via-black/65 to-transparent px-4 pb-3 pt-9 transition-opacity duration-200 ${
            showControls ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <input
            type="range"
            min={0}
            max={Math.max(duration, 0)}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="rt-range h-1.5 w-full"
          />

          <div className="mt-2 flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void togglePlayPause()} className="rounded-full p-1.5 hover:bg-white/15" aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? "||" : "▶"}
              </button>
              <button type="button" onClick={rewind10} className="rounded-full p-1.5 hover:bg-white/15" aria-label="Rewind 10 seconds">
                ↺10
              </button>
              <button type="button" onClick={forward10} className="rounded-full p-1.5 hover:bg-white/15" aria-label="Forward 10 seconds">
                ↻10
              </button>
              <button type="button" onClick={toggleMute} className="rounded-full p-1.5 hover:bg-white/15" aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted ? "M" : "V"}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeInput(Number(e.target.value))}
                className="rt-range h-1.5 w-20"
              />
              <span className="text-sm font-medium tracking-wide text-white/95">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="relative flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowQualityMenu((v) => !v)}
                className="rounded-full p-1.5 hover:bg-white/15"
                aria-label="Quality settings"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.16.32.24.67.24 1s-.08.68-.24 1z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="rounded-full p-1.5 hover:bg-white/15"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 9h6" />
                    <path d="M21 3v6" />
                    <path d="m21 3-7 7" />
                    <path d="M9 15H3" />
                    <path d="M3 21v-6" />
                    <path d="m3 21 7-7" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m15 3 6 6" />
                    <path d="M21 3h-6" />
                    <path d="M21 3v6" />
                    <path d="m9 21-6-6" />
                    <path d="M3 21h6" />
                    <path d="M3 21v-6" />
                  </svg>
                )}
              </button>

              {showQualityMenu ? (
                <div className="absolute bottom-10 right-0 rounded-lg border border-white/20 bg-black/90 p-2 shadow-xl backdrop-blur">
                  <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">Quality</div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onQualityChange("auto")}
                      disabled={!canManualQualitySwitch}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        selectedQuality === "auto" ? "border-red-500 bg-red-500 text-white" : "border-white/30 text-white"
                      } ${!canManualQualitySwitch ? "opacity-40" : "hover:bg-white/15"}`}
                    >
                      Auto
                    </button>
                    {qualityOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={!canManualQualitySwitch || !opt.available}
                        onClick={() => onQualityChange(opt.value)}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          selectedQuality === opt.value ? "border-red-500 bg-red-500 text-white" : "border-white/30 text-white"
                        } ${!canManualQualitySwitch || !opt.available ? "opacity-40" : "hover:bg-white/15"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
