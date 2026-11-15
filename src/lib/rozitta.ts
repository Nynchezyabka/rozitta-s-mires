/** Rozitta's phrases and tiny 8-bit sounds (Web Audio, no files). */
export const PHRASES = [
  "Этот свитер пахнет победой и старым чердаком... Записываю!",
  "В пятом сундуке замечена моль-горгулья. Держи ухо востро.",
  "Полнолуние — идеальное время рассортировать детские сапожки.",
  "Пылинки сдуты, замок смазан, ключ повёрнут дважды!",
  "В этот сундук поместится не только тёплый свитер, но и маленькое облачко.",
  "Полнолуние или нет, а порядок в сундуках душу греет.",
  "Если положить сюда леденец храбрости, переезд пройдёт веселее!",
  "Паучки докладывают: все нитки на месте, ни одна ложка не сбежала.",
  "Ква. Это значит «ты молодец» на болотном.",
  "Капуста — тоже цветок, если смотреть с любовью.",
];
export const BREWING = [
  "Буль-буль... зелье показывает, что внутри!",
  "Помешиваю против часовой стрелки, не торопи жабу.",
  "Вижу, вижу... кажется, там носки. Или дракончик.",
];
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
