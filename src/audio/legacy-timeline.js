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

