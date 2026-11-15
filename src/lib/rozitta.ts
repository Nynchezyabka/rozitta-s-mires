/** Rozitta's phrases and tiny 8-bit sounds (Web Audio, no files). */
import { ROZITTA_QUOTES, BREWING_QUOTES } from "./quotes";
export const PHRASES = ROZITTA_QUOTES;
export const BREWING = BREWING_QUOTES;
export const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]!;

const KEY = "rozitta-sound";
export const soundOn = () => typeof localStorage !== "undefined" && localStorage.getItem(KEY) !== "off";
export const setSound = (on: boolean) => localStorage.setItem(KEY, on ? "on" : "off");

let ctx: AudioContext | null = null;
function tone(freq: number, start: number, dur: number, type: OscillatorType = "square", to?: number) {
  if (!soundOn()) return;
  ctx ??= new AudioContext();
  const o = ctx.createOscillator(), g = ctx.createGain();
  const t = ctx.currentTime + start;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}
export const sfx = {
  quack: () => { tone(320, 0, 0.12, "square", 180); tone(300, 0.14, 0.14, "square", 160); },
  key: () => [1318, 1568, 2093].forEach((f, i) => tone(f, i * 0.08, 0.25, "triangle")),
  bubble: () => [0, 0.15, 0.3, 0.5].forEach((s) => tone(200 + Math.random() * 300, s, 0.1, "sine", 600)),
};
