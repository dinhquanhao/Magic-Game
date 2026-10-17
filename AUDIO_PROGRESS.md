# Nhật ký nâng cấp âm thanh đầy đủ

Ngày 17/10/2026 (Asia/Bangkok). Nền ab1e54c, nhánh Draft PR #1. Không sửa timeline/hình ảnh/cinematic/Rune Tower/START.bat hoặc registry 15 hệ/23 skill.

## Giai đoạn khảo sát — đã thực hiện

- Đọc toàn bộ yêu cầu mới và mã engine, cấu hình skill, các module VFX chuyên biệt, hệ thời gian. Trích dữ liệu thực bằng `node audio/audit-source.mjs` → `audio/source-audit.json`; lưu hash registry/plans/START.bat để kiểm tra bất biến.
- Hiện có: một WebAudio context lazy, 105 WAV 7 cue ×15 hệ, ambient, master tuyến tính, compressor, point panner, cache 3 bank/10 voice; chưa có true ceiling, category buses, IR, lab, cue wave riêng hay lưu settings.
- Node 24, Python 3.12, Chromium, ffmpeg, NumPy/SciPy/Matplotlib khả dụng. Không cần package trả phí. Matplotlib dùng cache trong work để tránh ghi home.
- Kế hoạch: A engine/bus/limiter/preset/settings → build/chạy/đo 4 preset; B score/cue/synthesis → từng hệ theo thứ tự người dùng; C render/đo/sửa tối đa 5 lần mỗi cue, offline whole-skill, reports và Lab; D stress/compatibility/ZIP/PR.
- File sẽ thêm: AUDIO_DESIGN.md, AUDIO_PROGRESS.md, audio/source-audit.json, src/audio/{mixer,synthesis,score,settings,lab,...}, cue registry, scripts render/test/report và reports/WAV. Sửa giới hạn ở audio hooks của main.js, audio panel, npm scripts, tài liệu. Không xóa mã/asset cũ; giữ chúng cho A/B.
- Trạng thái nghe: **chưa kiểm chứng bằng tai** cho mọi cue và mọi skill. Không đánh đồng số đo PASS với nhận diện hệ hoặc chất lượng nghệ thuật.

## Tiếp theo

Xây nền mixer, ceiling limiter có fallback, pool/quality/lifecycle và UI; kiểm tra trước khi thay cue.

## Giai đoạn A — checkpoint nền tảng đạt kiểm tra

- Thêm ceiling-limiter.js, mixer.js, settings.js, controls.js; tách legacy timeline; giữ WAV v1 cho A/B. 6 category bus, HP/compressor/brickwall, reverb IR/FDN, pool 28 slot, fade stop/steal, UI dB/localStorage.
- Build đạt 56 modules; npm test đạt 5 file gồm hot-input limiter ±11, NaN và stereo-linked ceiling. Đây là sample ceiling, true-peak sẽ kiểm tra 4× ở giai đoạn render.
- Chromium `audio/reports/stage-a/results.json`: Low8/Medium12/High20/Ultra28 voice budget, cue phát có PCM, pause giữ context time, mute về yên lặng, 20 lần test/stop không còn source. Pooled graph nodes giữ cố định. Không có lỗi JS; chưa kiểm chứng bằng tai.
- Kiểm tra đầu phát hiện ready() trả về khi mixer chưa sẵn sàng; đã sửa ready chờ init/load, chạy lại PASS. Không dùng build như bằng chứng âm thanh hoạt động.
- Node audit xác nhận registry/plans/Rune Tower/START.bat hash giữ nguyên so với đầu lượt. Sẵn sàng bắt đầu score/synthesis từng hệ sau khi đọc steering mới.

### WATER — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `water/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -13.22 dBTP; ngưỡng đạt.
- `water/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -15.32 dBTP; ngưỡng đạt.
- `water/casting`: PASS (vòng 1), RMS -22.08 dBFS, TP4× -3.82 dBTP; ngưỡng đạt.
- `water/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -14.56 dBTP; ngưỡng đạt.
- `water/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -5.71 dBTP; ngưỡng đạt.
- `water/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -6.35 dBTP; ngưỡng đạt.
- `water/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -18.98 dBTP; ngưỡng đạt.
- `water/secondary`: PASS (vòng 1), RMS -27.04 dBFS, TP4× -7.46 dBTP; ngưỡng đạt.
- `water/riser`: PASS (vòng 1), RMS -23.84 dBFS, TP4× -9.00 dBTP; ngưỡng đạt.
- `water/impact`: PASS (vòng 2), RMS -20.93 dBFS, TP4× -1.72 dBTP; ngưỡng đạt.
- `water/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -7.76 dBTP; ngưỡng đạt.
- `water/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -9.74 dBTP; ngưỡng đạt.
- `water/rune`: PASS (vòng 1), RMS -29.12 dBFS, TP4× -11.13 dBTP; ngưỡng đạt.
- `water/ui`: PASS (vòng 1), RMS -34.41 dBFS, TP4× -18.20 dBTP; ngưỡng đạt.
- `water/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -27.01 dBTP; ngưỡng đạt.

### WATER — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 3 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `water/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -13.22 dBTP; ngưỡng đạt.
- `water/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -15.32 dBTP; ngưỡng đạt.
- `water/casting`: PASS (vòng 1), RMS -22.08 dBFS, TP4× -3.82 dBTP; ngưỡng đạt.
- `water/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -14.56 dBTP; ngưỡng đạt.
- `water/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -5.71 dBTP; ngưỡng đạt.
- `water/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -6.35 dBTP; ngưỡng đạt.
- `water/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -18.98 dBTP; ngưỡng đạt.
- `water/secondary`: PASS (vòng 1), RMS -27.04 dBFS, TP4× -7.46 dBTP; ngưỡng đạt.
- `water/impact`: PASS (vòng 2), RMS -20.93 dBFS, TP4× -1.72 dBTP; ngưỡng đạt.
- `water/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -7.76 dBTP; ngưỡng đạt.
- `water/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -9.74 dBTP; ngưỡng đạt.
- `water/rune`: PASS (vòng 1), RMS -29.12 dBFS, TP4× -11.13 dBTP; ngưỡng đạt.
- `water/ui`: PASS (vòng 1), RMS -34.41 dBFS, TP4× -18.20 dBTP; ngưỡng đạt.
- `water/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -27.01 dBTP; ngưỡng đạt.
- `water/riser`: PASS (vòng 3), RMS -24.08 dBFS, TP4× -9.13 dBTP; ngưỡng đạt.

- Gate WATER: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### EARTH — render/đo cue

- 14/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `earth/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -12.62 dBTP; ngưỡng đạt.
- `earth/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -15.63 dBTP; ngưỡng đạt.
- `earth/casting`: PASS (vòng 1), RMS -22.16 dBFS, TP4× -5.13 dBTP; ngưỡng đạt.
- `earth/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -15.40 dBTP; ngưỡng đạt.
- `earth/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -6.02 dBTP; ngưỡng đạt.
- `earth/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -8.85 dBTP; ngưỡng đạt.
- `earth/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -19.21 dBTP; ngưỡng đạt.
- `earth/secondary`: PASS (vòng 1), RMS -27.18 dBFS, TP4× -8.69 dBTP; ngưỡng đạt.
- `earth/riser`: FAIL (vòng 1), RMS -23.97 dBFS, TP4× -10.01 dBTP; DC.
- `earth/impact`: PASS (vòng 2), RMS -19.08 dBFS, TP4× -3.74 dBTP; ngưỡng đạt.
- `earth/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -8.87 dBTP; ngưỡng đạt.
- `earth/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -9.76 dBTP; ngưỡng đạt.
- `earth/rune`: PASS (vòng 1), RMS -29.34 dBFS, TP4× -13.54 dBTP; ngưỡng đạt.
- `earth/ui`: PASS (vòng 1), RMS -35.20 dBFS, TP4× -21.53 dBTP; ngưỡng đạt.
- `earth/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -25.65 dBTP; ngưỡng đạt.

### EARTH — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `earth/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -12.62 dBTP; ngưỡng đạt.
- `earth/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -15.63 dBTP; ngưỡng đạt.
- `earth/casting`: PASS (vòng 1), RMS -22.16 dBFS, TP4× -5.13 dBTP; ngưỡng đạt.
- `earth/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -15.40 dBTP; ngưỡng đạt.
- `earth/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -6.02 dBTP; ngưỡng đạt.
- `earth/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -8.85 dBTP; ngưỡng đạt.
- `earth/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -19.21 dBTP; ngưỡng đạt.
- `earth/secondary`: PASS (vòng 1), RMS -27.18 dBFS, TP4× -8.69 dBTP; ngưỡng đạt.
- `earth/impact`: PASS (vòng 2), RMS -19.08 dBFS, TP4× -3.74 dBTP; ngưỡng đạt.
- `earth/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -8.87 dBTP; ngưỡng đạt.
- `earth/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -9.76 dBTP; ngưỡng đạt.
- `earth/rune`: PASS (vòng 1), RMS -29.34 dBFS, TP4× -13.54 dBTP; ngưỡng đạt.
- `earth/ui`: PASS (vòng 1), RMS -35.20 dBFS, TP4× -21.53 dBTP; ngưỡng đạt.
- `earth/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -25.65 dBTP; ngưỡng đạt.
- `earth/riser`: PASS (vòng 2), RMS -23.98 dBFS, TP4× -10.07 dBTP; ngưỡng đạt.

### WATER — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 4 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `water/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -13.22 dBTP; ngưỡng đạt.
- `water/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -15.32 dBTP; ngưỡng đạt.
- `water/casting`: PASS (vòng 1), RMS -22.08 dBFS, TP4× -3.82 dBTP; ngưỡng đạt.
- `water/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -14.56 dBTP; ngưỡng đạt.
- `water/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -5.71 dBTP; ngưỡng đạt.
- `water/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -6.35 dBTP; ngưỡng đạt.
- `water/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -18.98 dBTP; ngưỡng đạt.
- `water/secondary`: PASS (vòng 1), RMS -27.04 dBFS, TP4× -7.46 dBTP; ngưỡng đạt.
- `water/impact`: PASS (vòng 2), RMS -20.93 dBFS, TP4× -1.72 dBTP; ngưỡng đạt.
- `water/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -7.76 dBTP; ngưỡng đạt.
- `water/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -9.74 dBTP; ngưỡng đạt.
- `water/rune`: PASS (vòng 1), RMS -29.12 dBFS, TP4× -11.13 dBTP; ngưỡng đạt.
- `water/ui`: PASS (vòng 1), RMS -34.41 dBFS, TP4× -18.20 dBTP; ngưỡng đạt.
- `water/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -27.01 dBTP; ngưỡng đạt.
- `water/riser`: PASS (vòng 4), RMS -24.08 dBFS, TP4× -9.13 dBTP; ngưỡng đạt.

- Gate WATER: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

- Gate EARTH: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### WIND — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `wind/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -11.91 dBTP; ngưỡng đạt.
- `wind/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -14.67 dBTP; ngưỡng đạt.
- `wind/casting`: PASS (vòng 1), RMS -22.14 dBFS, TP4× -2.35 dBTP; ngưỡng đạt.
- `wind/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -13.72 dBTP; ngưỡng đạt.
- `wind/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -5.88 dBTP; ngưỡng đạt.
- `wind/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -8.58 dBTP; ngưỡng đạt.
- `wind/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -18.50 dBTP; ngưỡng đạt.
- `wind/secondary`: PASS (vòng 1), RMS -27.06 dBFS, TP4× -7.51 dBTP; ngưỡng đạt.
- `wind/riser`: PASS (vòng 1), RMS -24.14 dBFS, TP4× -6.61 dBTP; ngưỡng đạt.
- `wind/impact`: PASS (vòng 2), RMS -19.77 dBFS, TP4× -1.72 dBTP; ngưỡng đạt.
- `wind/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -6.18 dBTP; ngưỡng đạt.
- `wind/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -10.19 dBTP; ngưỡng đạt.
- `wind/rune`: PASS (vòng 1), RMS -29.18 dBFS, TP4× -11.35 dBTP; ngưỡng đạt.
- `wind/ui`: PASS (vòng 1), RMS -34.57 dBFS, TP4× -18.28 dBTP; ngưỡng đạt.
- `wind/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -25.78 dBTP; ngưỡng đạt.

- Gate WIND: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### FIRE — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `fire/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -13.54 dBTP; ngưỡng đạt.
- `fire/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -16.29 dBTP; ngưỡng đạt.
- `fire/casting`: PASS (vòng 1), RMS -22.21 dBFS, TP4× -6.20 dBTP; ngưỡng đạt.
- `fire/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -15.13 dBTP; ngưỡng đạt.
- `fire/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -7.67 dBTP; ngưỡng đạt.
- `fire/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -8.75 dBTP; ngưỡng đạt.
- `fire/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -19.24 dBTP; ngưỡng đạt.
- `fire/secondary`: PASS (vòng 1), RMS -27.03 dBFS, TP4× -10.55 dBTP; ngưỡng đạt.
- `fire/riser`: PASS (vòng 1), RMS -23.90 dBFS, TP4× -8.05 dBTP; ngưỡng đạt.
- `fire/impact`: PASS (vòng 2), RMS -19.04 dBFS, TP4× -3.25 dBTP; ngưỡng đạt.
- `fire/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -8.04 dBTP; ngưỡng đạt.
- `fire/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -11.28 dBTP; ngưỡng đạt.
- `fire/rune`: PASS (vòng 1), RMS -29.18 dBFS, TP4× -12.70 dBTP; ngưỡng đạt.
- `fire/ui`: PASS (vòng 1), RMS -34.20 dBFS, TP4× -18.94 dBTP; ngưỡng đạt.
- `fire/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -24.06 dBTP; ngưỡng đạt.

- Gate FIRE: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### ICE — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `ice/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -13.79 dBTP; ngưỡng đạt.
- `ice/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -17.96 dBTP; ngưỡng đạt.
- `ice/casting`: PASS (vòng 1), RMS -22.10 dBFS, TP4× -2.91 dBTP; ngưỡng đạt.
- `ice/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -17.07 dBTP; ngưỡng đạt.
- `ice/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -6.70 dBTP; ngưỡng đạt.
- `ice/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -7.58 dBTP; ngưỡng đạt.
- `ice/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -21.68 dBTP; ngưỡng đạt.
- `ice/secondary`: PASS (vòng 1), RMS -27.05 dBFS, TP4× -7.52 dBTP; ngưỡng đạt.
- `ice/riser`: PASS (vòng 1), RMS -23.93 dBFS, TP4× -8.21 dBTP; ngưỡng đạt.
- `ice/impact`: PASS (vòng 2), RMS -19.06 dBFS, TP4× -1.93 dBTP; ngưỡng đạt.
- `ice/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -6.90 dBTP; ngưỡng đạt.
- `ice/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -10.03 dBTP; ngưỡng đạt.
- `ice/rune`: PASS (vòng 1), RMS -29.11 dBFS, TP4× -9.56 dBTP; ngưỡng đạt.
- `ice/ui`: PASS (vòng 1), RMS -34.46 dBFS, TP4× -17.02 dBTP; ngưỡng đạt.
- `ice/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -25.69 dBTP; ngưỡng đạt.

- Gate ICE: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### LIGHTNING — render/đo cue

- 14/15 logical cue đạt ngưỡng kỹ thuật, max 5 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `lightning/precast`: PASS (vòng 1), RMS -25.01 dBFS, TP4× -12.18 dBTP; ngưỡng đạt.
- `lightning/charging`: PASS (vòng 1), RMS -27.01 dBFS, TP4× -13.68 dBTP; ngưỡng đạt.
- `lightning/casting`: PASS (vòng 2), RMS -22.47 dBFS, TP4× -2.72 dBTP; ngưỡng đạt.
- `lightning/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -14.02 dBTP; ngưỡng đạt.
- `lightning/material`: PASS (vòng 1), RMS -24.01 dBFS, TP4× -5.88 dBTP; ngưỡng đạt.
- `lightning/motion`: PASS (vòng 1), RMS -26.01 dBFS, TP4× -7.08 dBTP; ngưỡng đạt.
- `lightning/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -19.45 dBTP; ngưỡng đạt.
- `lightning/secondary`: PASS (vòng 1), RMS -28.83 dBFS, TP4× -2.63 dBTP; ngưỡng đạt.
- `lightning/riser`: PASS (vòng 1), RMS -24.02 dBFS, TP4× -8.31 dBTP; ngưỡng đạt.
- `lightning/impact`: FAIL (vòng 5), RMS -22.12 dBFS, TP4× -0.62 dBTP; RMS/crest.
- `lightning/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -7.56 dBTP; ngưỡng đạt.
- `lightning/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -8.65 dBTP; ngưỡng đạt.
- `lightning/rune`: PASS (vòng 1), RMS -29.16 dBFS, TP4× -13.14 dBTP; ngưỡng đạt.
- `lightning/ui`: PASS (vòng 1), RMS -34.24 dBFS, TP4× -19.21 dBTP; ngưỡng đạt.
- `lightning/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -25.74 dBTP; ngưỡng đạt.

## Thay môi trường thực thi — bảo toàn

- Môi trường cloud được thay khi đang chạy; cây mã, WAV, ảnh và lịch sử số đo vẫn còn. Các tiến trình browser/server cũ không được coi là đang hoạt động. Baseline đồ họa ghi được Fire Low opening/climax trước gián đoạn, chưa full pass.
- Không bắt đầu lại: A đạt; Water/Earth/Wind/Fire/Ice đã qua cổng; Lightning impact hết 5 vòng còn RMS -22.12 dBFS so với mục tiêu -19±2.8, TP4× -0.62 dBTP, giữ FAIL. Sẽ ghi ngoại lệ có lý do và tiếp tục các cue/hệ còn lại, không làm vòng thứ sáu.

- Lôi impact: giữ FAIL sau 5 vòng, không đổi ngưỡng. Lần cuối -22.12 dBFS, thấp hơn cận -21.8 là 0.32 dB; true peak -0.62 dBTP đạt ngưỡng cue -0.2, master sẽ đo riêng. Tăng gain không giải quyết intersample peak. Ghi ngoại lệ để tiếp tục đủ các hệ còn lại, chưa gọi toàn bộ cue đạt.

- Gate WATER: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

- Gate EARTH: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

- Gate WIND: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

- Gate FIRE: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

- Gate ICE: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

- Gate LIGHTNING: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### POISON — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `poison/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -12.13 dBTP; ngưỡng đạt.
- `poison/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -15.60 dBTP; ngưỡng đạt.
- `poison/casting`: PASS (vòng 1), RMS -22.06 dBFS, TP4× -3.95 dBTP; ngưỡng đạt.
- `poison/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -13.94 dBTP; ngưỡng đạt.
- `poison/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -5.19 dBTP; ngưỡng đạt.
- `poison/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -8.73 dBTP; ngưỡng đạt.
- `poison/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -19.39 dBTP; ngưỡng đạt.
- `poison/secondary`: PASS (vòng 1), RMS -27.07 dBFS, TP4× -6.06 dBTP; ngưỡng đạt.
- `poison/riser`: PASS (vòng 1), RMS -23.98 dBFS, TP4× -8.47 dBTP; ngưỡng đạt.
- `poison/impact`: PASS (vòng 2), RMS -21.59 dBFS, TP4× -1.72 dBTP; ngưỡng đạt.
- `poison/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -6.71 dBTP; ngưỡng đạt.
- `poison/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -9.71 dBTP; ngưỡng đạt.
- `poison/rune`: PASS (vòng 1), RMS -29.19 dBFS, TP4× -10.71 dBTP; ngưỡng đạt.
- `poison/ui`: PASS (vòng 1), RMS -34.78 dBFS, TP4× -18.56 dBTP; ngưỡng đạt.
- `poison/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -26.41 dBTP; ngưỡng đạt.

- Gate POISON: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### LIGHT — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `light/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -14.17 dBTP; ngưỡng đạt.
- `light/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -18.52 dBTP; ngưỡng đạt.
- `light/casting`: PASS (vòng 1), RMS -22.07 dBFS, TP4× -3.79 dBTP; ngưỡng đạt.
- `light/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -17.53 dBTP; ngưỡng đạt.
- `light/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -6.23 dBTP; ngưỡng đạt.
- `light/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -7.98 dBTP; ngưỡng đạt.
- `light/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -22.11 dBTP; ngưỡng đạt.
- `light/secondary`: PASS (vòng 1), RMS -27.03 dBFS, TP4× -8.01 dBTP; ngưỡng đạt.
- `light/riser`: PASS (vòng 1), RMS -23.90 dBFS, TP4× -9.38 dBTP; ngưỡng đạt.
- `light/impact`: PASS (vòng 2), RMS -19.07 dBFS, TP4× -2.10 dBTP; ngưỡng đạt.
- `light/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -6.95 dBTP; ngưỡng đạt.
- `light/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -9.63 dBTP; ngưỡng đạt.
- `light/rune`: PASS (vòng 1), RMS -29.08 dBFS, TP4× -9.97 dBTP; ngưỡng đạt.
- `light/ui`: PASS (vòng 1), RMS -34.26 dBFS, TP4× -16.80 dBTP; ngưỡng đạt.
- `light/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -26.16 dBTP; ngưỡng đạt.

- Gate LIGHT: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### SHADOW — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `shadow/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -12.04 dBTP; ngưỡng đạt.
- `shadow/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -17.82 dBTP; ngưỡng đạt.
- `shadow/casting`: PASS (vòng 1), RMS -22.13 dBFS, TP4× -5.47 dBTP; ngưỡng đạt.
- `shadow/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -14.92 dBTP; ngưỡng đạt.
- `shadow/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -9.13 dBTP; ngưỡng đạt.
- `shadow/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -10.21 dBTP; ngưỡng đạt.
- `shadow/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -19.70 dBTP; ngưỡng đạt.
- `shadow/secondary`: PASS (vòng 1), RMS -27.06 dBFS, TP4× -11.65 dBTP; ngưỡng đạt.
- `shadow/riser`: PASS (vòng 1), RMS -23.81 dBFS, TP4× -7.89 dBTP; ngưỡng đạt.
- `shadow/impact`: PASS (vòng 2), RMS -19.04 dBFS, TP4× -2.68 dBTP; ngưỡng đạt.
- `shadow/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -9.07 dBTP; ngưỡng đạt.
- `shadow/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -12.68 dBTP; ngưỡng đạt.
- `shadow/rune`: PASS (vòng 1), RMS -29.25 dBFS, TP4× -11.92 dBTP; ngưỡng đạt.
- `shadow/ui`: PASS (vòng 1), RMS -35.12 dBFS, TP4× -22.28 dBTP; ngưỡng đạt.
- `shadow/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -27.30 dBTP; ngưỡng đạt.

- Gate SHADOW: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### BLOOD — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `blood/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -14.31 dBTP; ngưỡng đạt.
- `blood/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -16.42 dBTP; ngưỡng đạt.
- `blood/casting`: PASS (vòng 1), RMS -22.13 dBFS, TP4× -7.93 dBTP; ngưỡng đạt.
- `blood/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -14.49 dBTP; ngưỡng đạt.
- `blood/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -8.35 dBTP; ngưỡng đạt.
- `blood/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -10.34 dBTP; ngưỡng đạt.
- `blood/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -20.91 dBTP; ngưỡng đạt.
- `blood/secondary`: PASS (vòng 1), RMS -27.04 dBFS, TP4× -10.85 dBTP; ngưỡng đạt.
- `blood/riser`: PASS (vòng 1), RMS -23.98 dBFS, TP4× -7.67 dBTP; ngưỡng đạt.
- `blood/impact`: PASS (vòng 2), RMS -19.01 dBFS, TP4× -1.72 dBTP; ngưỡng đạt.
- `blood/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -7.90 dBTP; ngưỡng đạt.
- `blood/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -11.92 dBTP; ngưỡng đạt.
- `blood/rune`: PASS (vòng 1), RMS -29.27 dBFS, TP4× -10.78 dBTP; ngưỡng đạt.
- `blood/ui`: PASS (vòng 1), RMS -34.49 dBFS, TP4× -17.18 dBTP; ngưỡng đạt.
- `blood/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -24.97 dBTP; ngưỡng đạt.

- Gate BLOOD: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### SPACE — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `space/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -14.51 dBTP; ngưỡng đạt.
- `space/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -18.26 dBTP; ngưỡng đạt.
- `space/casting`: PASS (vòng 1), RMS -22.13 dBFS, TP4× -7.33 dBTP; ngưỡng đạt.
- `space/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -14.97 dBTP; ngưỡng đạt.
- `space/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -7.95 dBTP; ngưỡng đạt.
- `space/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -9.29 dBTP; ngưỡng đạt.
- `space/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -21.77 dBTP; ngưỡng đạt.
- `space/secondary`: PASS (vòng 1), RMS -27.04 dBFS, TP4× -8.72 dBTP; ngưỡng đạt.
- `space/riser`: PASS (vòng 1), RMS -24.08 dBFS, TP4× -9.17 dBTP; ngưỡng đạt.
- `space/impact`: PASS (vòng 2), RMS -19.06 dBFS, TP4× -2.18 dBTP; ngưỡng đạt.
- `space/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -7.52 dBTP; ngưỡng đạt.
- `space/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -11.05 dBTP; ngưỡng đạt.
- `space/rune`: PASS (vòng 1), RMS -29.18 dBFS, TP4× -13.13 dBTP; ngưỡng đạt.
- `space/ui`: PASS (vòng 1), RMS -34.92 dBFS, TP4× -22.32 dBTP; ngưỡng đạt.
- `space/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -28.18 dBTP; ngưỡng đạt.

- Gate SPACE: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### TIME — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `time/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -14.18 dBTP; ngưỡng đạt.
- `time/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -18.65 dBTP; ngưỡng đạt.
- `time/casting`: PASS (vòng 1), RMS -22.06 dBFS, TP4× -3.79 dBTP; ngưỡng đạt.
- `time/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -17.66 dBTP; ngưỡng đạt.
- `time/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -6.92 dBTP; ngưỡng đạt.
- `time/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -8.69 dBTP; ngưỡng đạt.
- `time/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -22.23 dBTP; ngưỡng đạt.
- `time/secondary`: PASS (vòng 1), RMS -27.03 dBFS, TP4× -8.26 dBTP; ngưỡng đạt.
- `time/riser`: PASS (vòng 1), RMS -23.91 dBFS, TP4× -9.51 dBTP; ngưỡng đạt.
- `time/impact`: PASS (vòng 2), RMS -19.07 dBFS, TP4× -1.98 dBTP; ngưỡng đạt.
- `time/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -6.67 dBTP; ngưỡng đạt.
- `time/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -10.86 dBTP; ngưỡng đạt.
- `time/rune`: PASS (vòng 1), RMS -29.06 dBFS, TP4× -11.00 dBTP; ngưỡng đạt.
- `time/ui`: PASS (vòng 1), RMS -34.49 dBFS, TP4× -18.13 dBTP; ngưỡng đạt.
- `time/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -25.99 dBTP; ngưỡng đạt.

- Gate TIME: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### MAGMA — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `magma/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -13.02 dBTP; ngưỡng đạt.
- `magma/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -16.81 dBTP; ngưỡng đạt.
- `magma/casting`: PASS (vòng 1), RMS -22.01 dBFS, TP4× -8.02 dBTP; ngưỡng đạt.
- `magma/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -15.51 dBTP; ngưỡng đạt.
- `magma/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -8.54 dBTP; ngưỡng đạt.
- `magma/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -9.68 dBTP; ngưỡng đạt.
- `magma/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -20.36 dBTP; ngưỡng đạt.
- `magma/secondary`: PASS (vòng 1), RMS -27.01 dBFS, TP4× -11.24 dBTP; ngưỡng đạt.
- `magma/riser`: PASS (vòng 1), RMS -23.52 dBFS, TP4× -8.95 dBTP; ngưỡng đạt.
- `magma/impact`: PASS (vòng 2), RMS -19.02 dBFS, TP4× -2.91 dBTP; ngưỡng đạt.
- `magma/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -7.46 dBTP; ngưỡng đạt.
- `magma/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -11.37 dBTP; ngưỡng đạt.
- `magma/rune`: PASS (vòng 1), RMS -29.35 dBFS, TP4× -12.58 dBTP; ngưỡng đạt.
- `magma/ui`: PASS (vòng 1), RMS -35.29 dBFS, TP4× -24.11 dBTP; ngưỡng đạt.
- `magma/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -25.78 dBTP; ngưỡng đạt.

- Gate MAGMA: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### ASTRAL — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `astral/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -14.61 dBTP; ngưỡng đạt.
- `astral/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -17.66 dBTP; ngưỡng đạt.
- `astral/casting`: PASS (vòng 1), RMS -22.05 dBFS, TP4× -4.24 dBTP; ngưỡng đạt.
- `astral/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -16.59 dBTP; ngưỡng đạt.
- `astral/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -6.10 dBTP; ngưỡng đạt.
- `astral/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -7.70 dBTP; ngưỡng đạt.
- `astral/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -21.22 dBTP; ngưỡng đạt.
- `astral/secondary`: PASS (vòng 1), RMS -27.03 dBFS, TP4× -8.36 dBTP; ngưỡng đạt.
- `astral/riser`: PASS (vòng 1), RMS -24.04 dBFS, TP4× -10.55 dBTP; ngưỡng đạt.
- `astral/impact`: PASS (vòng 2), RMS -19.06 dBFS, TP4× -2.50 dBTP; ngưỡng đạt.
- `astral/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -6.45 dBTP; ngưỡng đạt.
- `astral/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -9.70 dBTP; ngưỡng đạt.
- `astral/rune`: PASS (vòng 1), RMS -29.05 dBFS, TP4× -10.91 dBTP; ngưỡng đạt.
- `astral/ui`: PASS (vòng 1), RMS -34.50 dBFS, TP4× -18.27 dBTP; ngưỡng đạt.
- `astral/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -26.18 dBTP; ngưỡng đạt.

- Gate ASTRAL: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.

### PSYCHIC — render/đo cue

- 15/15 logical cue đạt ngưỡng kỹ thuật, max 2 vòng; lịch sử trước/sau: audio/reports/cue-history.json. Chưa kiểm chứng bằng tai.
- `psychic/precast`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -15.91 dBTP; ngưỡng đạt.
- `psychic/charging`: PASS (vòng 1), RMS -27.00 dBFS, TP4× -19.30 dBTP; ngưỡng đạt.
- `psychic/casting`: PASS (vòng 1), RMS -22.15 dBFS, TP4× -6.21 dBTP; ngưỡng đạt.
- `psychic/traveling`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -18.18 dBTP; ngưỡng đạt.
- `psychic/material`: PASS (vòng 1), RMS -24.00 dBFS, TP4× -12.18 dBTP; ngưỡng đạt.
- `psychic/motion`: PASS (vòng 1), RMS -26.00 dBFS, TP4× -13.54 dBTP; ngưỡng đạt.
- `psychic/environment`: PASS (vòng 1), RMS -31.00 dBFS, TP4× -23.07 dBTP; ngưỡng đạt.
- `psychic/secondary`: PASS (vòng 1), RMS -27.06 dBFS, TP4× -11.58 dBTP; ngưỡng đạt.
- `psychic/riser`: PASS (vòng 1), RMS -24.14 dBFS, TP4× -10.05 dBTP; ngưỡng đạt.
- `psychic/impact`: PASS (vòng 2), RMS -20.42 dBFS, TP4× -1.89 dBTP; ngưỡng đạt.
- `psychic/shockwave`: PASS (vòng 1), RMS -25.00 dBFS, TP4× -8.57 dBTP; ngưỡng đạt.
- `psychic/aftermath`: PASS (vòng 1), RMS -30.00 dBFS, TP4× -14.07 dBTP; ngưỡng đạt.
- `psychic/rune`: PASS (vòng 1), RMS -29.18 dBFS, TP4× -11.29 dBTP; ngưỡng đạt.
- `psychic/ui`: PASS (vòng 1), RMS -34.56 dBFS, TP4× -21.16 dBTP; ngưỡng đạt.
- `psychic/drone`: PASS (vòng 1), RMS -34.00 dBFS, TP4× -27.41 dBTP; ngưỡng đạt.

- Gate PSYCHIC: build đạt; Chromium material/impact/stop qua mixer đạt; ảnh waveform/spectrogram và JSON lưu. Chưa kiểm chứng bằng tai. Chuyển sang hệ kế theo thứ tự.
