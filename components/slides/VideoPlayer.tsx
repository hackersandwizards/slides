"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import Pause from "lucide-react/icons/pause";
import Play from "lucide-react/icons/play";
import { usePrintMode } from "../../lib/print-context";

function useVideoPlayback() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };
  const mediaEvents = {
    onClick: toggle,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onTimeUpdate: (e: SyntheticEvent<HTMLVideoElement>) =>
      setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1)),
  };
  return { videoRef, playing, progress, toggle, mediaEvents };
}

/** The one video player: the recording on night in the brand corner, a round teal play button
 *  straddling its bottom edge, centred (the caller leaves 2.5rem below for its lower half), and a
 *  progress line. Click the picture or the button to play or pause; playing, the button stays as
 *  the pause control, shown only to the keyboard that holds focus on it. `className` sizes player
 *  and video alike, so the frame's line is a ring: a border takes the frame's box from the video,
 *  which then runs past it. The frame alone carries the corner and clips the video and the
 *  progress line to it, so no brand corner sits inside another; the button stays outside it.
 *  `isolate`, or WebKit draws a playing video's square corners over the clip. */
export function VideoPlayer({
  src,
  poster,
  alt,
  className = "",
}: {
  src: string;
  poster?: string;
  alt?: string;
  className?: string;
}) {
  const printMode = usePrintMode();
  const { videoRef, playing, progress, toggle, mediaEvents } = useVideoPlayback();
  return (
    <div className={`relative ${className}`.trim()}>
      <div className="relative isolate overflow-hidden rounded-brand bg-night ring ring-border">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          aria-label={alt}
          muted
          playsInline
          preload={printMode ? "auto" : "metadata"}
          {...mediaEvents}
          className={`block cursor-pointer ${className}`.trim()}
        />
        {progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/15">
            <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={`${playing ? "Pause" : "Play"} ${alt ?? "video"}`}
        className={`hw-icon-button absolute -bottom-[calc(var(--hw-control-size)/2)] left-1/2 z-10 -translate-x-1/2 ${playing ? "opacity-0 focus-visible:opacity-100" : ""}`}
        data-on="picture"
      >
        {playing ? (
          <Pause className="fill-current" strokeWidth={0} />
        ) : (
          <Play className="fill-current" strokeWidth={0} />
        )}
      </button>
    </div>
  );
}
