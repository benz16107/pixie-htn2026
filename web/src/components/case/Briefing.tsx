"use client";
import { useEffect, useRef, useState } from "react";
import { briefingFor, type Briefing as Data } from "@/lib/explain";
import { PROXY } from "@/lib/live";

/**
 * The case read aloud. Each sentence carries the part of the page it is about, so as the voice
 * reaches it that region takes a thin ochre ring: `[data-brief="score" | "facts" | "flip" |
 * "challenge" | "action"]` anywhere on the page, styled in globals.css.
 *
 * Sound is never a prerequisite. The script is listed as text, and clicking a line moves the
 * highlight (and the playhead) whether or not anything is playing.
 */
export function Briefing({ caseId }: { caseId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [second, setSecond] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let live = true;
    briefingFor(caseId).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [caseId]);

  const marks = data?.marks ?? [];
  const current = marks.findIndex((m) => second >= m.startSec && second < m.endSec);
  const anchor = current >= 0 ? marks[current].anchor : null;

  // The regions live in server-rendered sections all over the page, so the ring is set on the DOM
  // rather than threaded through as props.
  useEffect(() => {
    const ring = (on: boolean) =>
      document.querySelectorAll<HTMLElement>("[data-brief]").forEach((el) => {
        el.classList.toggle("brief-on", on && el.dataset.brief === anchor);
      });
    ring(true);
    return () => ring(false);
  }, [anchor]);

  if (!data) return null;

  const go = (sec: number) => {
    setSecond(sec);
    if (audio.current) audio.current.currentTime = sec;
  };

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      if (second >= 0) el.currentTime = second;
      else setSecond(0); // ring the first region straight away, before the first timeupdate
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  };

  return (
    <div className="relative flex shrink-0 items-center gap-1.5">
      <audio
        ref={audio}
        src={PROXY + data.audioUrl}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setSecond(-1);
        }}
        onTimeUpdate={(e) => setSecond(e.currentTarget.currentTime)}
      />
      <button
        onClick={toggle}
        aria-label={playing ? "Pause the briefing" : "Read this case aloud"}
        className="flex items-center gap-1.5 rounded-sm border border-rule bg-paper px-2 py-1 text-[11px] transition-colors duration-150 hover:border-edge active:scale-[0.97]"
      >
        <span aria-hidden className="font-mono text-[10px] leading-none">
          {playing ? "❙❙" : "▶"}
        </span>
        {playing ? "Pause" : "Read this case"}
        <span className="num text-[10px] text-dim">{clock(data.durationSec)}</span>
      </button>
      <button
        onClick={() => setShowScript((v) => !v)}
        aria-expanded={showScript}
        className="rounded-sm border border-rule px-1.5 py-1 text-[11px] text-dim transition-colors duration-150 hover:border-edge hover:text-ink"
      >
        Script
      </button>

      {showScript && (
        <ol className="absolute left-0 top-full z-30 mt-1 w-[420px] rounded-sm border border-edge bg-paper p-2 text-[11px] leading-snug shadow-[0_6px_20px_rgba(47,42,34,0.14)]">
          {marks.map((m, i) => (
            <li key={m.startSec}>
              <button
                onClick={() => go(m.startSec)}
                className={`block w-full rounded-sm px-1.5 py-1 text-left transition-colors duration-150 hover:bg-land ${
                  i === current ? "bg-ochre-soft" : ""
                }`}
              >
                <span className="num mr-2 text-[10px] text-dim">{clock(m.startSec)}</span>
                {m.text}
              </button>
            </li>
          ))}
          <li className="px-1.5 pt-1 text-[10px] text-dim">
            Read by {data.model}. Every number in it was computed before it was spoken.
          </li>
        </ol>
      )}
    </div>
  );
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
