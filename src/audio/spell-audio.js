const CUES = ['precast', 'charging', 'casting', 'traveling', 'impact', 'shockwave', 'aftermath'];
const LEVELS = {precast: .12, charging: .09, casting: .16, traveling: .10, impact: .28, shockwave: .16, aftermath: .11};
const MAX_VOICES = 10;
const CACHE_BANKS = 3;

// Driven by simulation markers, never wall-clock timers. Crossing a marker fires
// once; attaching audio halfway through a cast does not replay historic impacts.
export class CueTimeline {
  reset() { this.id = null; this.previous = null; this.seen = new Set(); }
  constructor() { this.reset(); }
  update(frame, adopt = false) {
    if (!frame?.id) { this.reset(); return {events: [], loops: []}; }
    if (this.id !== frame.id) { this.reset(); this.id = frame.id; }
    const events = [];
    const fire = (cue, eligible) => {
      if (this.seen.has(cue)) return;
      this.seen.add(cue);
      if (eligible && !adopt) events.push(cue);
    };
    const active = frame.phase === 'active';
    const t = frame.time || 0;
    if (!active) {
      fire('precast', !this.previous);
    } else {
      fire('casting', this.previous?.phase !== 'active' && t < .12);
      for (const [cue, at] of [['impact', frame.impact], ['shockwave', frame.impact + .14], ['aftermath', frame.impact + .45]]) {
        if (t >= at) fire(cue, this.previous?.phase === 'active' ? this.previous.time < at : t - at < .12);
      }
    }
    this.previous = {phase: frame.phase, time: t};
    return {events, loops: active ? (t < frame.impact ? ['traveling'] : []) : ['charging']};
  }
}

export function createSpellAudio({onStatus = () => {}, manifestUrl = '/assets/audio/manifest.json'} = {}) {
  let ctx, master, limiter, analyser, panner, ambientGain, ambientVoice;
  let enabled = false, disposed = false, hidden = false, frozen = false, volume = .65, ambience = false;
  let manifest, manifestPromise, selection, loading, lastFrame, castId, adopt = false;
  let contextTransition = Promise.resolve();
  const banks = new Map(), voices = new Set(), loops = new Map();
  const timeline = new CueTimeline();
  const history = [];
  let fallbacks = 0, maxVoices = 0, decodedBytes = 0;

  const status = text => onStatus(text);
  function syncContext() {
    if (!ctx || disposed) return;
    const shouldRun = enabled && !hidden && !frozen;
    contextTransition = contextTransition.then(async () => {
      if (!ctx || disposed || ctx.state === 'closed') return;
      // Read latest flags here, so rapid pause/resume cannot leave a stale state.
      if (enabled && !hidden && !frozen) { if (ctx.state !== 'running') await ctx.resume(); }
      else if (ctx.state === 'running') await ctx.suspend();
    }).catch(() => status('Chạm BẬT ÂM THANH để tiếp tục'));
    return shouldRun;
  }
  function init() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) throw new Error('Trình duyệt chưa hỗ trợ âm thanh');
    ctx = new Audio({latencyHint: 'interactive'});
    master = ctx.createGain(); master.gain.value = volume;
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12; limiter.knee.value = 6; limiter.ratio.value = 12;
    limiter.attack.value = .003; limiter.release.value = .15;
    analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
    panner = ctx.createPanner(); panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse'; panner.refDistance = 12;
    panner.maxDistance = 180; panner.rolloffFactor = .6;
    ambientGain = ctx.createGain(); ambientGain.gain.value = .035;
    panner.connect(master); ambientGain.connect(master);
    master.connect(limiter); limiter.connect(analyser); analyser.connect(ctx.destination);
  }
  async function getManifest() {
    if (!manifestPromise) manifestPromise = fetch(manifestUrl).then(r => {
      if (!r.ok) throw new Error(`Audio manifest ${r.status}`);
      return r.json();
    }).then(m => { manifest = m; return m; }).catch(error => {
      manifestPromise = null; throw error;
    });
    return manifestPromise;
  }
  function fallback(element, cue) {
    fallbacks++;
    const length = Math.round(ctx.sampleRate * .4);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
    const frequency = manifest?.elements[element]?.baseFrequency || 110;
    const phase = CUES.indexOf(cue) + 1;
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      data[i] = .18 * Math.sin(2 * Math.PI * frequency * (1 + phase * .1) * t) * Math.sin(Math.PI * i / length) ** 2;
    }
    return buffer;
  }
  async function loadBank(element) {
    if (!enabled || disposed || !ctx) return;
    if (banks.has(element)) {
      const value = banks.get(element); banks.delete(element); banks.set(element, value);
      return value;
    }
    if (loading?.element === element) return loading.promise;
    loading?.controller.abort();
    const controller = new AbortController(), task = {element, controller};
    loading = task;
    task.promise = (async () => {
      let entry;
      try { entry = (await getManifest()).elements[element]; }
      catch { if (!controller.signal.aborted) status('Đang dùng âm thanh dự phòng'); }
      if (controller.signal.aborted || disposed) return;
      const pairs = await Promise.all(CUES.map(async cue => {
        try {
          const url = entry?.cues[cue]?.url;
          if (!url) throw new Error('Missing cue');
          const response = await fetch(url, {signal: controller.signal});
          if (!response.ok) throw new Error(`Audio ${response.status}`);
          const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
          return [cue, buffer];
        } catch (error) {
          if (controller.signal.aborted || disposed) return [cue, null];
          return [cue, fallback(element, cue)];
        }
      }));
      if (controller.signal.aborted || disposed) return;
      const bank = Object.fromEntries(pairs);
      banks.set(element, bank);
      while (banks.size > CACHE_BANKS) banks.delete(banks.keys().next().value);
      decodedBytes = [...banks.values()].reduce((n, b) => n + Object.values(b).reduce((s, v) => s + v.length * v.numberOfChannels * 4, 0), 0);
      if (enabled) status(fallbacks ? 'Âm thanh sẵn sàng · có lớp dự phòng' : 'Âm thanh sẵn sàng');
      return bank;
    })().finally(() => { if (loading === task) loading = null; });
    return task.promise;
  }
  function cleanup(voice) {
    if (!voices.delete(voice)) return;
    voice.source.onended = null;
    voice.source.disconnect(); voice.gain.disconnect();
    if (loops.get(voice.cue) === voice) loops.delete(voice.cue);
  }
  function stop(voice) {
    try { voice.source.stop(); } catch { /* already ended */ }
    cleanup(voice);
  }
  function play(cue, bank, frame, rate, loop = false) {
    if (!bank?.[cue] || !enabled || disposed) return;
    if (voices.size >= MAX_VOICES) {
      // Steal the oldest one-shot first; loops never multiply on repeated ticks.
      stop([...voices].find(v => !v.source.loop) || voices.values().next().value);
    }
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = bank[cue]; source.loop = loop;
    source.playbackRate.value = Math.max(.08, Math.min(3, rate));
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(LEVELS[cue], ctx.currentTime + .012);
    source.connect(gain); gain.connect(panner);
    const voice = {source, gain, cue}; voices.add(voice);
    if (loop) loops.set(cue, voice);
    source.onended = () => cleanup(voice);
    source.start();
    maxVoices = Math.max(maxVoices, voices.size);
    history.push({cast: frame.id, element: frame.element, cue, time: frame.time, rate: source.playbackRate.value, fallback: !manifest?.elements[frame.element]});
    if (history.length > 200) history.shift();
  }
  function stopCast() {
    for (const voice of [...voices]) stop(voice);
    timeline.reset(); castId = null;
  }
  async function updateAmbient() {
    if (!enabled || !ambience || disposed || ambientVoice || !ctx) return;
    const token = selection;
    try {
      const m = await getManifest(), response = await fetch(m.ambient.url);
      if (!response.ok) throw new Error('Ambient unavailable');
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      if (disposed || !enabled || !ambience || ambientVoice || token !== selection) return;
      ambientVoice = ctx.createBufferSource(); ambientVoice.buffer = buffer;
      ambientVoice.loop = true; ambientVoice.connect(ambientGain); ambientVoice.start();
    } catch { if (!disposed) status('Âm kỹ năng sẵn sàng · nền gió chưa tải được'); }
  }
  function stopAmbient() {
    if (!ambientVoice) return;
    ambientVoice.stop(); ambientVoice.disconnect(); ambientVoice = null;
  }
  function setSelection(element) {
    if (selection !== element) { stopCast(); selection = element; }
    if (enabled) void loadBank(element);
  }
  async function enable() {
    if (disposed) return false;
    try {
      if (!ctx) init();
      enabled = true; adopt = true;
      // Call resume synchronously within the actual click gesture, before fetch.
      await ctx.resume(); syncContext();
      status('Đang tải âm thanh…');
      await loadBank(selection); void updateAmbient();
      return true;
    } catch (error) { enabled = false; status(error.message); return false; }
  }
  function disable() {
    enabled = false; stopCast(); stopAmbient(); syncContext(); status('Âm thanh đã tắt');
  }
  function update(frame, {position, forward, up}, rate = 1, paused = false) {
    lastFrame = frame;
    if (!enabled || disposed || !ctx) return;
    const freeze = paused || rate === 0;
    if (freeze !== frozen) { frozen = freeze; syncContext(); }
    const now = ctx.currentTime;
    for (const [prefix, vector] of [['position', position], ['forward', forward], ['up', up]]) {
      if (!vector) continue;
      if (ctx.listener[`${prefix}X`]) for (let i = 0; i < 3; i++) ctx.listener[`${prefix}${'XYZ'[i]}`].value = vector[i];
      else if (prefix === 'position') ctx.listener.setPosition(...vector);
      else if (prefix === 'forward') ctx.listener.setOrientation(...vector, ...(up || [0, 1, 0]));
    }
    if (!frame) { if (castId) stopCast(); return; }
    if (frame.id !== castId) { stopCast(); castId = frame.id; }
    const markers = timeline.update(frame, adopt); adopt = false;
    const center = frame.center || [0, 0, 0];
    for (let i = 0; i < 3; i++) panner[`position${'XYZ'[i]}`].value = center[i];
    for (const voice of voices) voice.source.playbackRate.setTargetAtTime(Math.max(.08, Math.min(3, rate)), now, .012);
    if (freeze || hidden) return;
    const bank = banks.get(frame.element);
    for (const [cue, voice] of loops) if (!markers.loops.includes(cue)) stop(voice);
    for (const cue of markers.events) play(cue, bank, frame, rate);
    for (const cue of markers.loops) if (!loops.has(cue)) play(cue, bank, frame, rate, true);
  }
  function diagnostics() {
    const data = analyser ? new Float32Array(analyser.fftSize) : new Float32Array(0);
    analyser?.getFloatTimeDomainData(data);
    return {enabled, state: ctx?.state || 'uninitialized', currentTime: ctx?.currentTime || 0,
      volume, muted: !enabled || volume === 0, activeVoices: voices.size, maxVoices, voiceLimit: MAX_VOICES,
      banks: [...banks.keys()], decodedBytes, fallbacks, loading: !!loading, history: [...history],
      rates: [...voices].map(v => v.source.playbackRate.value),
      center: panner ? [panner.positionX.value, panner.positionY.value, panner.positionZ.value] : null,
      listener: ctx?.listener.positionX ? [ctx.listener.positionX.value, ctx.listener.positionY.value, ctx.listener.positionZ.value] : null,
      peak: data.reduce((m, v) => Math.max(m, Math.abs(v)), 0),
      rms: Math.sqrt(data.reduce((s, v) => s + v * v, 0) / (data.length || 1)),
      ambient: !!ambientVoice, cast: lastFrame?.id || null};
  }
  return {
    get enabled() { return enabled; },
    enable, disable, update, stopCast, setSelection, diagnostics,
    ready: () => loading?.promise || Promise.resolve(banks.get(selection)),
    setVolume(value) { volume = Math.max(0, Math.min(1, Number(value) || 0)); if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, .015); },
    setAmbient(value) { ambience = !!value; if (ambience) void updateAmbient(); else stopAmbient(); },
    setHidden(value) { hidden = !!value; syncContext(); },
    // Optional QA recording tap, after master/limiter; no application globals.
    createCapture() { if (!ctx) return null; const stream = ctx.createMediaStreamDestination(); limiter.connect(stream); return {stream: stream.stream, disconnect: () => {limiter.disconnect(stream); stream.disconnect();}}; },
    dispose() {
      if (disposed) return;
      disable(); disposed = true; loading?.controller.abort(); banks.clear(); history.length = 0;
      for (const node of [panner, ambientGain, master, limiter, analyser]) node?.disconnect();
      void ctx?.close(); decodedBytes = 0;
    },
  };
}
