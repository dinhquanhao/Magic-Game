import { ACTIVE_DURATION_MULTIPLIER } from './cast-timing.js';
// Reads the simulation clock, so pause, hit-stop and slow motion stay in sync.
export function createCastFeedback(panel) {
  const label = panel.querySelector('[data-cast-phase]');
  const remaining = panel.querySelector('[data-cast-remaining]');
  const progress = panel.querySelector('progress');
  let previousLabel = '';
  return {
    update({ data, elapsed, config, impactAt = 0, color = '#6cdad7' }) {
      panel.hidden = !data;
      if (!data) return;
      const chargeDuration = data.timing.charge;
      const channelDuration = data.timing.channel;
      let phase, fraction, seconds;
      if (data.phase === 'charging') {
        phase = 'VẼ PHÙ VĂN'; seconds = Math.max(0, chargeDuration - elapsed);
        fraction = elapsed / chargeDuration;
      } else if (data.phase === 'channeling') {
        phase = 'HỘI TỤ'; seconds = Math.max(0, channelDuration - data.channelTime);
        fraction = data.channelTime / channelDuration;
      } else {
        const time = data.activeTime;
        phase = time < impactAt ? 'KHAI TRIỂN' : 'DƯ CHẤN';
        seconds = Math.max(0, (time < impactAt ? impactAt : data.runeTower.timelineEnd) - time) * ACTIVE_DURATION_MULTIPLIER;
        fraction = time / data.runeTower.timelineEnd;
      }
      const text = config.paused ? 'TẠM DỪNG' : phase;
      if (text !== previousLabel) { label.textContent = text; previousLabel = text; }
      remaining.textContent = `${seconds.toFixed(1)} s`;
      progress.value = Math.max(0, Math.min(1, fraction));
      progress.setAttribute('aria-label', `${data.skill.vi} · ${text}`);
      panel.style.setProperty('--cast-color', color);
    }
  };
}
