import { WorkletSynthesizer } from 'spessasynth_lib';
import type { NotationEvent } from '../playback/event-stream.js';
import { resolvePosition, type PlaybackData } from '../playback/position.js';

export interface SoundFontAsset {
  readonly id: string;
  readonly displayName: string;
  readonly format: 'sf2' | 'sf3';
  readonly version: string;
}

export interface SoundFontManifest {
  readonly schemaVersion: number;
  readonly assets: readonly SoundFontAsset[];
}

export interface SoundFontEngineOptions {
  /** Public URL of the uploaded `soundfonts/manifest.json`. */
  readonly manifestUrl?: string;
  /** Public URL of the copied SpessaSynth AudioWorklet processor. */
  readonly processorUrl?: string;
  /** URL prefix containing the uploaded SoundFont folders. */
  readonly assetBaseUrl?: string;
  /** SoundFont asset id to load on first playback. */
  readonly assetId?: string;
  /** R2 folder/file mapping. The values are object paths relative to assetBaseUrl. */
  readonly assetPaths?: Readonly<Record<string, string>>;
}

export interface NotationSoundEngine {
  readonly asset: SoundFontAsset;
  readonly ready: Promise<void>;
  play(playback: PlaybackData, volume?: number): Promise<void>;
  pause(): void;
  stop(): void;
  setVolume(volume: number): void;
  destroy(): void;
}

const DEFAULT_ASSET_PATHS: Readonly<Record<string, string>> = {
  'ms-basic': 'ms-basic/official-deprecated-master/MS Basic.sf3',
  'musescore-general-sf3': 'musescore-general/v0.2/MuseScore_General.sf3',
  'musescore-general-sf2': 'musescore-general/v0.2/MuseScore_General.sf2',
  'generaluser-gs': 'generaluser-gs/v1.472/GeneralUser GS v1.472.sf2',
  'fluidr3-gm': 'fluidr3-gm/v3.1/FluidR3_GM.sf2',
  'salamander-grand-piano':
    'salamander-grand-piano/v3-20200602/SalamanderGrandPiano-V3+20200602.sf2',
};

const cacheName = 'notation-soundfonts-v1';
const memoryCache = new Map<string, ArrayBuffer>();

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

async function cachedArrayBuffer(url: string): Promise<ArrayBuffer> {
  const memory = memoryCache.get(url);
  if (memory) return memory.slice(0);
  const cache = 'caches' in globalThis ? await caches.open(cacheName) : undefined;
  const cached = await cache?.match(url);
  if (cached) {
    const buffer = await cached.arrayBuffer();
    memoryCache.set(url, buffer);
    return buffer.slice(0);
  }
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`SoundFont request failed (${response.status}): ${url}`);
  const copy = response.clone();
  const buffer = await response.arrayBuffer();
  memoryCache.set(url, buffer);
  if (cache) await cache.put(url, copy);
  return buffer.slice(0);
}

function assetFor(manifest: SoundFontManifest, id: string): SoundFontAsset {
  const asset = manifest.assets.find((candidate) => candidate.id === id);
  if (!asset) throw new Error(`SoundFont asset '${id}' is not listed in the R2 manifest.`);
  return asset;
}

function midiNotesFor(event: NotationEvent): readonly number[] {
  return event.midiNotesAligned ?? event.midiNotes ?? [];
}

/** Browser SoundFont adapter used by the Notation Lab host. */
export class R2SoundFontEngine implements NotationSoundEngine {
  readonly asset: SoundFontAsset;
  readonly ready: Promise<void>;
  private readonly context: AudioContext;
  private readonly synth: WorkletSynthesizer;
  private readonly partChannels = new Map<string, number>();
  private timers = new Set<number>();
  private stopped = true;
  private volume = 0.75;

  private constructor(
    context: AudioContext,
    synth: WorkletSynthesizer,
    asset: SoundFontAsset,
    ready: Promise<void>,
  ) {
    this.context = context;
    this.synth = synth;
    this.asset = asset;
    this.ready = ready;
  }

  static async create(options: SoundFontEngineOptions = {}): Promise<R2SoundFontEngine> {
    const manifestUrl = options.manifestUrl ?? 'soundfonts/manifest.json';
    const manifestResponse = await fetch(manifestUrl, { cache: 'no-cache' });
    if (!manifestResponse.ok)
      throw new Error(`SoundFont manifest request failed (${manifestResponse.status}).`);
    const manifest = (await manifestResponse.json()) as SoundFontManifest;
    const assetId = options.assetId ?? 'musescore-general-sf3';
    const asset = assetFor(manifest, assetId);
    const assetBaseUrl = options.assetBaseUrl ?? new URL('.', manifestUrl).toString();
    const assetPath = options.assetPaths?.[assetId] ?? DEFAULT_ASSET_PATHS[assetId];
    if (!assetPath) throw new Error(`No R2 path configured for SoundFont asset '${assetId}'.`);

    const context = new AudioContext();
    await context.audioWorklet.addModule(
      options.processorUrl ?? 'assets/spessasynth_processor.min.js',
    );
    const synth = new WorkletSynthesizer(context, {
      eventsEnabled: false,
      convolverMode: false,
      decodedSampleBudget: 512 * 1024 * 1024,
    });
    const ready = (async () => {
      await synth.isReady;
      const buffer = await cachedArrayBuffer(joinUrl(assetBaseUrl, assetPath));
      await synth.soundBankManager.addSoundBank(buffer, asset.id);
      synth.setSystemParameter('gain', 1);
      synth.connect(context.destination);
    })();
    return new R2SoundFontEngine(context, synth, asset, ready);
  }

  async play(playback: PlaybackData, volume = this.volume): Promise<void> {
    await this.ready;
    await this.context.resume();
    this.stop();
    this.volume = Math.max(0, Math.min(1, volume));
    this.synth.setSystemParameter('gain', this.volume);
    this.stopped = false;
    const origin = performance.now() / 1000;
    for (const event of playback.events) {
      const notes = midiNotesFor(event);
      if (notes.length === 0) continue;
      const channel = this.channelFor(event.partId);
      const startDelay = Math.max(0, event.seconds) * 1000;
      const durationSeconds = Math.max(0.02, playbackEventDuration(playback, event));
      const onTimer = window.setTimeout(
        () => {
          if (this.stopped) return;
          for (const midiNote of notes) this.synth.noteOn(channel, midiNote, 100);
          const offTimer = window.setTimeout(() => {
            for (const midiNote of notes) this.synth.noteOff(channel, midiNote);
            this.timers.delete(offTimer);
          }, durationSeconds * 1000);
          this.timers.add(offTimer);
          this.timers.delete(onTimer);
        },
        Math.max(0, startDelay - (performance.now() / 1000 - origin) * 1000),
      );
      this.timers.add(onTimer);
    }
  }

  pause(): void {
    this.stopped = true;
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    this.synth.stopAll();
  }

  stop(): void {
    this.pause();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.synth.setSystemParameter('gain', this.volume);
  }

  destroy(): void {
    this.stop();
    this.synth.destroy();
    void this.context.close();
  }

  private channelFor(partId: string): number {
    const existing = this.partChannels.get(partId);
    if (existing !== undefined) return existing;
    const channel = this.partChannels.size % 16;
    this.partChannels.set(partId, channel);
    this.synth.programChange(channel, 0);
    return channel;
  }
}

function playbackEventDuration(playback: PlaybackData, event: NotationEvent): number {
  const endTick = event.tick + event.durationTicks;
  return Math.max(0.02, resolvePosition(playback, endTick).seconds - event.seconds);
}
