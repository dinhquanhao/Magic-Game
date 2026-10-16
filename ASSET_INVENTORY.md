# Kiểm kê assets — vòng audio 2026-10-17

Phạm vi: mã hiện tại của nhánh PR #1. Không tạo lại dự án hoặc đổi giấy phép repository.

| Nhóm | Hiện có | Thiếu / còn yếu | Quyết định |
|---|---|---|---|
| 15 hệ / 23 skill | Mesh, shader, particles, rune tower procedural; ID và hình thái giữ nguyên | Một số impact quá sáng, độ tương phản chưa đồng đều | Tiếp tục GĐ1 với ảnh cố định và exposure đo được |
| Pháp sư | Model procedural, idle/walk/run/jump/dash/cast, camera, MP | HP, hurt/death, thiết bị và animation chuyển tiếp chưa hoàn chỉnh | GĐ2; giữ model hiện có |
| Mục tiêu | Training dummy và phản hồi impact | Chưa có enemy AI/Boss nhiều pha | GĐ3 |
| Đấu trường | Nền, kiến trúc/rune, cây/cỏ, ánh sáng/PBR procedural | Thế giới khám phá, collision/LOD và nhiều biome | GĐ4 sau combat |
| Âm kỹ năng trước vòng này | Không có file hoặc audio engine | Toàn bộ phép không có tiếng | Tạo WAV và tích hợp trong vòng này |
| Âm kỹ năng mới | 105 WAV mono PCM16/24kHz, 7 cue × 15 hệ; 23 skill dùng bản sắc theo hệ | Chưa có biến thể riêng cho từng skill, chưa mix nghệ thuật trên thiết bị nghe thật | Precast/charging/casting/traveling/impact/shockwave/aftermath theo timeline |
| Môi trường | 1 WAV nền gió đấu trường 4 giây, tùy chọn | Chưa có nhạc, footsteps, hurt/death, enemy/boss, địa hình ướt | Tạo khi tính năng tương ứng đến giai đoạn; tránh assets vô dụng |
| UI | SVG sprite 15 ký hiệu nguyên tố gắn vào thanh hệ và skill, nhãn tiếng Việt giữ nguyên | Icon trạng thái/combat, HP/inventory | Theo GĐ2–5 |
| Tệp mô hình/texture | Không có GLB/GLTF hoặc texture bên ngoài; phần lớn tạo trực tiếp trong Three.js | Chưa xuất mô hình độc lập cho pipeline artist | Không thay asset đang tốt bằng placeholder |
| Nguồn/giấy phép | WAV/SVG mới do scripts trong repo tổng hợp toán học/hình học; không dùng sample/dịch vụ bên ngoài | Repo chưa có LICENSE; CSS cũ gọi Rajdhani/Space Mono qua Google Fonts, chưa có hồ sơ provenance trong repo | Không tự đổi license; kiểm toán font trước phân phối offline |

## Dung lượng và lifecycle

- `public/assets/audio/manifest.json` ghi URL, duration, peak, RMS, bytes và SHA-256 từng file; rebuild bằng `python scripts/generate_audio.py` (numpy), SVG bằng `python scripts/generate_icons.py`.
- Mặc định âm thanh tắt. Không fetch WAV hoặc tạo AudioContext trước thao tác bật của người chơi.
- Lazy preload đủ 7 cue của hệ đang chọn; hủy fetch hệ cũ, cache tối đa 3 bank, tối đa 10 voice kỹ năng + 1 ambient. Bản PCM giải mã có thể lớn hơn WAV; diagnostics ghi byte thực của cache, không tuyên bố là tổng bộ nhớ trình duyệt.
- Gain riêng từng cue, master, compressor và panner; file lỗi dùng tổng hợp tone dự phòng có giới hạn. Pause/hit-stop/ẩn tab/context lost dừng đồng hồ audio; slow motion đổi playback rate cùng tốc độ mô phỏng. Pitch cũng thay đổi, chưa có time stretching giữ cao độ.
- Stop/recast/chuyển hệ hủy voice cũ; pagehide đóng context và dọn nodes/cache. Ambient tùy chọn không thay nhạc nền.
- Kết quả kỹ thuật và bản nghe được lưu ở `docs/evidence/audio/`; chất lượng nghệ thuật cần nghe thử, không được suy từ test đạt.
