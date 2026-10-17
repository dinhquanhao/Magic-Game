# Thiết kế âm thanh procedural — Arcane VFX Studio

**Mọi cue/skill: chưa kiểm chứng bằng tai.** Đây là thiết kế và phép đo kỹ thuật, không xác nhận nhận diện nghệ thuật hoặc chất lượng AAA.

## Bất biến và timeline

Nguồn: audio/source-audit.json trích registry/config/plans thực từ main.js; không đổi nhịp, hình ảnh, camera, hit-stop, Rune Tower hoặc START.bat. Thời điểm trong bảng là giây active; charge mặc định 4.5×pace/runeDrawSpeed, channel .58+.26×pace, cleanup bằng runeTower.timelineEnd.

| Skill ID | Tên nguyên bản | Impact / hit-stop / pre-slow | Rune fade / cleanup | Wave cấu hình |
|---|---|---|---|---|
| FIRE-01 | Thiên Nhật Diệt Thế | 3.720 / 0.135 / 0.480 | 5.690 / 9.840 | Không có wave-list riêng; bám callback/plan thực |
| FIRE-02 | Phượng Hoàng Tận Thế | 4.050 / 0.110 / 0.380 | 4.660 / 9.720 | Không có wave-list riêng; bám callback/plan thực |
| FIRE-03 | Vạn Hỏa Thiên Phạt | 4.020 / 0.130 / 0.340 | 5.220 / 10.020 | Không có wave-list riêng; bám callback/plan thực |
| WATER-01 | Hải Thần Lĩnh Vực | 9.550 / 0.120 / 0.600 | 15.550 / 17.000 | Không có wave-list riêng; bám callback/plan thực |
| EARTH-01 | Đại Lục Phân Liệt | 9.350 / 0.120 / 0.680 | 14.900 / 18.000 | Không có wave-list riêng; bám callback/plan thực |
| LIGHT-01 | Lục Dực Thánh Khải | 12.050 / 0.080 / 0.480 | 10.600 / 17.200 | scatter@2.55, concentric@4.35, sweep@6.15, carpet@8.1, finale@10.85 |
| SHADOW-01 | Vạn Ảnh Thiên Kiếp | 13.500 / 0.120 / 0.900 | 14.200 / 17.000 | rút cạn@4.45, nuốt năng lượng@6.25, cuồng thực@8.15, quá tải@10.15 |
| WIND-01 | Thiên Khí Băng Diệt | 6.000 / 0.040 / 0.220 | 6.000 / 20.250 | Không có wave-list riêng; bám callback/plan thực |
| LIGHTNING-01 | Lôi Giới Tận Thế | 12.250 / 0.080 / 0.700 | 14.500 / 17.200 | static@2.5, forked@4.25, chain@6.25, tempest@8.4, finale@11.7 |
| ICE-01 | Vĩnh Băng Thiên Kiếp | 10.850 / 0.100 / 0.620 | 13.250 / 16.000 | hoarfrost@6.6, rings@7.55, glacier@9.1, finale@10.85 |
| MAGMA-01 | Khai Thiên Nham Ngục | 2.040 / 0.100 / 0.310 | 6.300 / 9.760 | Không có wave-list riêng; bám callback/plan thực |
| MAGMA-02 | Nham Thiên Diệt Thế | 2.190 / 0.125 / 0.380 | 6.740 / 9.940 | Không có wave-list riêng; bám callback/plan thực |
| MAGMA-03 | Nham Thần Giáng Thế | 1.800 / 0.075 / 0.240 | 6.040 / 9.680 | Không có wave-list riêng; bám callback/plan thực |
| POISON-01 | Vạn Độc Diệt Giới | 12.200 / 0.100 / 0.580 | 13.300 / 16.000 | drizzle@5, spread@6.4, squall@8.1, downpour@9.55, finale@11.35 |
| SPACE-01 | Không Gian Băng Diệt | 14.500 / 0.080 / 0.450 | 16.500 / 19.200 | bụi@1.7, mảnh-vỡ@3.1, vật-thể@4.65, hội-tụ@6.2 |
| TIME-01 | Vĩnh Hằng Chung Khúc | 12.500 / 0.070 / 0.600 | 15.000 / 18.000 | Không có wave-list riêng; bám callback/plan thực |
| BLOOD-01 | Vạn Huyết Thiên Thượng | 12.720 / 0.120 / 0.620 | 14.550 / 17.400 | khai-xich@4.65, xuyen-thien@6.05, dan-xuyen@7.5, long-giam@8.95, siết-mang-luoi@10.45 |
| ASTRAL-01 | Vạn Tinh Quy Nhất | 2.190 / 0.125 / 0.380 | 6.310 / 9.820 | Không có wave-list riêng; bám callback/plan thực |
| ASTRAL-02 | Tinh Hà Tận Thế | 1.950 / 0.075 / 0.240 | 6.710 / 9.960 | Không có wave-list riêng; bám callback/plan thực |
| ASTRAL-03 | Sáng Thế Tinh Vực | 2.270 / 0.100 / 0.310 | 4.620 / 9.680 | Không có wave-list riêng; bám callback/plan thực |
| PSYCHIC-01 | Tâm Thức Băng Diệt | 2.160 / 0.125 / 0.380 | 6.540 / 9.740 | Không có wave-list riêng; bám callback/plan thực |
| PSYCHIC-02 | Vạn Niệm Thần Vực | 1.920 / 0.075 / 0.240 | 6.940 / 9.880 | Không có wave-list riêng; bám callback/plan thực |
| PSYCHIC-03 | Thần Niệm Sáng Thế | 2.040 / 0.100 / 0.310 | 7.140 / 9.820 | Không có wave-list riêng; bám callback/plan thực |

## Giai đoạn A — nền tảng

Một AudioContext lazy, được resume ngay trong gesture. 6 category bus: SFX, Impact, Ambience, Magic, Drone, UI. Category dry/wet → master dB → HP 22 Hz → compressor 2.5:1 → lookahead brickwall worklet → analyser → destination. Ceiling sample -1.8 dBFS để dành headroom intersample, yêu cầu true peak đo 4× ≤-1 dBTP. Fallback Waveshaper ceiling -2 dBFS khi không có worklet; không coi fallback là cùng thuật toán lookahead.

Pool node: 28 slot tối đa, mỗi slot có gain/envelope, low/high shelf, low-pass, panner, dry/send. BufferSource là node one-shot bắt buộc tạo theo cue, disconnect trong onended; không tạo graph node mỗi frame. Steal ưu tiên thấp trước, fade 40 ms, cue mới bắt đầu sau fade. Stop/Replay/Reset/chuyển hệ fade 50 ms; pending sources bị hủy. AudioContext suspend chỉ cho Pause/tab hidden/context lost, hit-stop dùng duck/low-pass mượt.

| Preset | Voice nghe đồng thời | Bank | PCM budget | Panner | Reverb |
|---|---:|---:|---:|---|---|
| Low | 8 | 2 | 12 MiB | equalpower | 2 delay lines |
| Medium | 12 | 3 | 20 MiB | equalpower | 2 delay lines |
| High | 20 | 3 | 32 MiB | HRTF/fallback | cached procedural IR |
| Ultra | 28 | 4 | 48 MiB | HRTF/fallback | cached procedural IR |

Frame-cost proxy >35ms liên tục 2s giảm voice/reverb; hồi sau 8s tốt. Đây là proxy main thread, không phải chứng cứ audio underrun. WebAudio không công khai underrun count trên mọi browser: báo null khi không đo được. baseLatency/outputLatency được ghi nếu API có.

IR: noise seeded, lọc + exponential decay; arena 1.8s, cave 2.8s, void 4.2s, underwater 1.1s, cathedral 4s; predelay24ms; cache3 IR. Low/Medium dùng delayed feedback .073/.109s với damping2700Hz.

Mặc định master -9dB; SFX0dB, ambience-10dB, drone-15dB. Master/SFX/Ambience/Drone dB có smoothing; Impact0–150%; spatial, Doppler, Reduced Intensity, UI sounds, mute, room và Test Sound được lưu localStorage (không lưu enable/autoplay).

## Ngưỡng nghiệm thu cue / mix

Mục tiêu cue material/motion/environment -25..-19dB RMS; release -22..-16; impact -20..-14 (Time nhẹ hơn được ghi riêng). Sample peak ≤-.2dB trước mix; master true peak4× ≤-1dBTP, không NaN/DC lớn, seam loop <.02, fade-tail RMS giảm≥15dB. Đơn vị LUFS trong Lab/report là xấp xỉ K-weighted ungated hoặc short-window; không gọi là phép đo EBU R128 chứng nhận. Cross-system loudness cùng loại cue nằm ±3dB quanh median; trường hợp Time nhẹ hơn được đánh dấu ngoại lệ thiết kế, không giấu.

Mỗi cue tối đa 5 vòng render→đo→chẩn đoán→sửa tham số→đo lại; ghi mọi iteration JSON. Tạo waveform/spectrogram mỗi logical cue (overlay variants), mix đủ timeline từng skill, đường loudness và playlist từng hệ. Mỗi hệ phải có build + chạy + đo trước khi sang hệ kế.
