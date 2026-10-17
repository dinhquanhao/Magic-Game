// Authored skill markers stay intact; playback converts them to simulation seconds.
export const DEFAULT_RITUAL_SECONDS = 10;
export const ACTIVE_DURATION_MULTIPLIER = 2;

export function castTiming(config) {
  const seconds = Number.isFinite(config.castTime) ? Math.max(.3, config.castTime) : DEFAULT_RITUAL_SECONDS;
  const speed = Number.isFinite(config.runeDrawSpeed) ? Math.max(.1, config.runeDrawSpeed) : 1;
  const ritual = seconds / speed;
  return { charge: ritual * .85, channel: ritual * .15, ritual };
}

export function skillPlaybackRate(phase) {
  return phase === 'active' ? 1 / ACTIVE_DURATION_MULTIPLIER : 1;
}

export function isCastingPhase(phase) {
  return phase === 'charging' || phase === 'channeling' || phase === 'active';
}
