const FEATURE_LABELS = {
  reflections: 'SSR phản chiếu', ao: 'GTAO / SSAO', ssao: 'SSAO', volumetric: 'Tia thể tích',
  caustics: 'Caustic nền', subsurface: 'Tán xạ giả lập', motionBlur: 'Nhòe chuyển động',
  dof: 'Độ sâu trường', adaptive: 'Chất lượng thích ứng'
};

export function createGraphicsDebugOverlay({ renderer, scene, getStatus }) {
  const panel = document.createElement('section');
  panel.id = 'graphicsDebugOverlay';
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  Object.assign(panel.style, {
    position: 'fixed', zIndex: '50', left: '14px', top: '88px', minWidth: '290px', maxWidth: 'min(440px, calc(100vw - 28px))',
    padding: '12px 14px', color: '#d9fbff', background: 'rgba(4,14,20,.92)', border: '1px solid rgba(91,225,222,.55)',
    boxShadow: '0 10px 35px rgba(0,0,0,.45)', font: '11px/1.5 ui-monospace,Consolas,monospace', whiteSpace: 'pre-wrap', pointerEvents: 'none'
  });
  document.body.append(panel);
  let lastUpdate = 0;
  let frameTime = 16.7;
  let fps = 60;
  let visible = false;
  let quality = '—';

  function onKey(event) {
    if (event.code !== 'F3' || event.repeat || event.target?.matches?.('input,textarea,select,[contenteditable="true"]')) return;
    event.preventDefault();
    visible = !visible;
    panel.hidden = !visible;
    if (visible) render(performance.now(), true);
  }
  function render(now, force = false) {
    if (!visible || (!force && now - lastUpdate < 250)) return;
    lastUpdate = now;
    const info = renderer.info;
    const status = getStatus();
    let instances = 0, points = 0;
    scene.traverse((object) => {
      if (object.isInstancedMesh) instances += object.count;
      else if (object.isPoints) points += object.geometry?.attributes?.position?.count || 0;
    });
    const states = Object.entries(status.features || {}).map(([key, enabled]) => `${FEATURE_LABELS[key] || key}: ${enabled ? 'bật' : 'tắt'}`).join('\n');
    const targetsMb = Number.isFinite(status.estimatedRenderTargetBytes) ? `${(status.estimatedRenderTargetBytes / 1048576).toFixed(1)} MiB (ước tính)` : 'không có số liệu';
    const unavailable = status.post?.unavailable?.length ? `\nKhông khả dụng: ${status.post.unavailable.join('; ')}` : '';
    panel.textContent = [
      'ARCANE VFX · DEBUG  (F3 đóng/mở)',
      `FPS ${fps.toFixed(0)} · khung ${frameTime.toFixed(1)} ms · ${status.quality || quality}`,
      `Draw calls ${info.render.calls} · tam giác ${info.render.triangles.toLocaleString('vi-VN')}`,
      `Instance ${instances.toLocaleString('vi-VN')} · điểm hạt ${points.toLocaleString('vi-VN')}`,
      `GPU texture ${info.memory.textures} · geometry ${info.memory.geometries}`,
      `Render target ${targetsMb}`,
      `Post: SSR ${status.post?.ssr ? status.post.ssrResolution : 'tắt'}, GTAO ${status.post?.gtao ? 'bật' : 'tắt'}, SSAO ${status.post?.ssao ? 'bật' : 'tắt'}, DoF ${status.post?.dof ? 'bật' : 'tắt'}`,
      `Tự giảm: ${status.autoReduced?.length ? status.autoReduced.join(', ') : 'không'}`,
      states,
      `Wind: ${status.fields?.windStrength?.toFixed?.(2) ?? '0.00'} · nguồn sáng ảo: ${status.fields?.activeLights ?? 0}${unavailable}`
    ].join('\n');
  }

  function update(frameMs, now = performance.now()) {
    if (Number.isFinite(frameMs) && frameMs > 0) {
      frameTime = frameTime * 0.86 + frameMs * 0.14;
      fps = 1000 / Math.max(1, frameTime);
    }
    render(now);
  }

  function init() {
    window.addEventListener('keydown', onKey);
    render(performance.now(), true);
  }

  function setQuality(nextQuality) {
    quality = nextQuality || '—';
    render(performance.now(), true);
  }

  function dispose() {
    window.removeEventListener('keydown', onKey);
    panel.remove();
  }

  return { init, update, setQuality, dispose };
}
