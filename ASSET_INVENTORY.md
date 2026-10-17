# Hiện trạng assets sau cập nhật Thảo

Fade phù văn chung: giữ toàn bộ hình học, shader, icon và audio hiện có. Thêm logic opacity/timeline tại src/rune-fade.js, không tạo texture/mesh/renderer/RAF/timer mới. Vòng phép cũ và hạt/đèn được làm mờ rồi ẩn theo simulation time. Bằng chứng: docs/evidence/rune-fade/README.md.

Cập nhật thu gọn Hỏa: registry15hệ/19skill, chỉ giữ FIRE-01. Gỡ audio mix/biểu đồ/report riêng của hai skill bị xóa và các record liên quan; giữ nguyên shader lửa/ember/icon và bank cue dùng chung vì FIRE-01 vẫn sử dụng. Không tạo asset mới hoặc đổi asset của hệ khác. Báo cáo lịch sử đã lọc các hàng bị gỡ được đánh dấu riêng; không đổi số đo của các skill được giữ.

Bổ sung nền nâu 17/10: vật liệu đất nâu không kim loại, lưới tông đất và hai lớp noise shader tĩnh, có giảm chi tiết hạt ở xa. Không thêm asset bên ngoài, texture, mesh hoặc render pass; không đổi license. Bằng chứng: docs/evidence/brown-ground/README.md. Đá/cỏ rìa/vết chân vẫn là backlog trong docs/ROUND-GROUND-2026-10-17.md.

NATURE-01 dùng sáu cây procedural tự tạo, bark/leaf/circle shader, instanced roots/spikes/fruits/leaves, pooled analytic pollen/soil/spores và SVG lá mới. Audio gỗ/lá/hạt do công thức tạo, không sample bên ngoài: 15 cue logic/24 WAV biến thể, một mix tham chiếu mới. Audio của 14 hệ còn lại giữ nguyên. Registry có 15 hệ/21 skill; nguồn gốc/số đo và phạm vi kiểm thử ở THAO_PROGRESS.md.

Bảng dưới mô tả lịch sử audio/assets trước đợt thay hệ cuối. Số23 trong phần lịch sử không phải số skill hiện tại. Các record của hệ đã thay đã gỡ, không chuyển kết quả đo cũ sang Thảo.

# Kiểm kê assets — vòng audio 2026-10-17

Phạm vi: mã hiện tại của nhánh PR #1. Không tạo lại dự án hoặc đổi giấy phép repository.

| Nhóm | Hiện có | Thiếu / còn yếu | Quyết định |
|---|---|---|---|
| 15 hệ / 21 skill | Mesh, shader, particles, rune tower procedural; ID và hình thái giữ nguyên | Một số impact quá sáng, độ tương phản chưa đồng đều | Tiếp tục GĐ1 với ảnh cố định và exposure đo được |
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

## Cập nhật audio v3 — 17/10/2026

- Thay thế mô tả engine v1 ở bảng lịch sử: 225 cue logic/360 cue WAV có biến thể +23 skill WAV; 6 bus, limiter lookahead/fallback, spatial/preset8/12/20/28, bank2/3/3/4 với cache12/20/32/48MiB và Audio Lab. Unlock qua gesture; có prewarm tổng hợp AudioBuffer/OfflineAudioContext trước gesture, không tạo speaker AudioContext trước gesture.
- 833 WAV/PNG mirror được xác minh SHA256; npm run audio:report đồng bộ và xuất public/audio/qa-summary.json. Nguồn đo audio/reports; 224/225 cue PASS, lightning/impact FAIL sau5vòng; 23 reference mixes PASS nhưng không phải bản ghi browser. Chưa kiểm chứng bằng tai.
- Audio runtime/regression và Lab evidence ở docs/evidence/audio-v3; public/assets/audio v1 vẫn giữ cho A/B.
