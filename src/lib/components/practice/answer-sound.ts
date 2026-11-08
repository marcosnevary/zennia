/** How long after Check the pronunciation waits, so it starts once both notes are heard while their ring fades. */
export const ANSWER_SOUND_MS = 600;

const VOLUME = 0.5;
const PAN = 0.35;

interface Note {
  midi: number;
  at: number;
  pan: number;
}

/** Each partial is [frequency ratio, relative amplitude, relative decay]. */
interface Timbre {
  gain: number;
  decay: number;
  partials: [number, number, number][];
}

const KALIMBA: Timbre = {
  gain: 0.26,
  decay: 0.75,
  partials: [
    [1, 1, 1],
    [2, 0.18, 0.5],
    [3.01, 0.3, 0.35],
    [6.1, 0.14, 0.18],
    [9.2, 0.06, 0.1],
  ],
};

const MARIMBA: Timbre = {
  gain: 0.32,
  decay: 0.75,
  partials: [
    [1, 1, 1],
    [2, 0.1, 0.5],
    [4, 0.3, 0.25],
    [10, 0.08, 0.08],
  ],
};

const CORRECT: Note[] = [
  { midi: 76, at: 0, pan: -PAN },
  { midi: 81, at: 0.08, pan: PAN },
];
const INCORRECT: Note[] = [
  { midi: 64, at: 0, pan: -PAN },
  { midi: 60, at: 0.11, pan: PAN },
];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Plays the sound of a checked answer, synthesized so there are no files to load. */
export class AnswerSound {
  #ctx?: AudioContext;
  #out?: GainNode;
  #room?: ConvolverNode;
  #click?: AudioBuffer;

  /**
   * Starts the audio ahead of Check: opening it and building the room take long enough to be heard as a lag. It needs a
   * user gesture, so it's called on typing.
   */
  prepare(): void {
    if (!this.#ctx) {
      const ctx = new AudioContext();
      this.#out = ctx.createGain();
      this.#out.connect(ctx.destination);
      this.#room = ctx.createConvolver();
      this.#room.buffer = roomImpulse(ctx, 1.4);
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      this.#room.connect(wet).connect(this.#out);
      this.#click = clickNoise(ctx);
      this.#ctx = ctx;
    }
    if (this.#ctx.state === "suspended") void this.#ctx.resume();
  }

  play(correct: boolean): void {
    this.prepare();
    const ctx = this.#ctx!;
    this.#out!.gain.cancelScheduledValues(ctx.currentTime);
    this.#out!.gain.setValueAtTime(VOLUME, ctx.currentTime);
    for (const note of correct ? CORRECT : INCORRECT)
      this.#note(
        ctx,
        ctx.currentTime + note.at,
        note,
        correct ? KALIMBA : MARIMBA,
      );
  }

  stop(): void {
    if (!this.#ctx) return;
    this.#out!.gain.setTargetAtTime(0, this.#ctx.currentTime, 0.02);
  }

  #note(ctx: AudioContext, t: number, note: Note, timbre: Timbre) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = note.pan;
    panner.connect(this.#out!);
    panner.connect(this.#room!);
    this.#pluck(ctx, t, panner);
    for (const [ratio, amp, decayScale] of timbre.partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const end = t + 0.004 + timbre.decay * decayScale;
      osc.frequency.value = hz(note.midi) * ratio;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(timbre.gain * amp, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(panner);
      osc.start(t);
      osc.stop(end + 0.05);
    }
  }

  /** The click of the tine or mallet at the attack, which makes the note sound open rather than muffled. */
  #pluck(ctx: AudioContext, t: number, out: AudioNode) {
    const src = ctx.createBufferSource();
    src.buffer = this.#click!;
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 3000;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    src.connect(highpass).connect(gain).connect(out);
    src.start(t);
  }
}

function clickNoise(ctx: AudioContext): AudioBuffer {
  const length = Math.ceil(ctx.sampleRate * 0.012);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  return buffer;
}

/** Decaying stereo noise, standing in for a recorded room. */
function roomImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const impulse = ctx.createBuffer(
    2,
    Math.ceil(ctx.sampleRate * seconds),
    ctx.sampleRate,
  );
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
  }
  return impulse;
}
