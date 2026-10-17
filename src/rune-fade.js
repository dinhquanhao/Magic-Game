// Simulation seconds after the skill effect first becomes visible.
export const RUNE_RELEASE_FADE_SECONDS = 1.8;

export function runeReleaseAge(cast, activeTime) {
  if (!Number.isFinite(activeTime)) return null;
  if (cast.runeFadeStartedAt == null) {
    const rootVisible = cast.root?.visible && cast.root.children?.length > 0;
    if (!rootVisible && !cast.attack?.group?.visible) return null;
    cast.runeFadeStartedAt = activeTime;
  }
  return Math.max(0, activeTime - cast.runeFadeStartedAt);
}

export function runeReleaseFade(age) {
  if (age == null) return 0;
  if (!Number.isFinite(age)) return 1;
  const t = Math.max(0, Math.min(1, age / RUNE_RELEASE_FADE_SECONDS));
  return t * t * (3 - 2 * t);
}
