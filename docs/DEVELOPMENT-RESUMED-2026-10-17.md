# Tiếp nối Magic-Game — 17/10/2026

Tiếp tục từ fb6a84d và WIP, không dựng lại game. Bảo toàn WIP tại ce73729; nhóm audio đã lưu và push tại 1a6cb41. Nhánh Draft PR #1, không merge main, không Production, không bật scheduler/API trả phí.

## Thay đổi có thể xem

1. Sửa burst audio vượt giới hạn Low: trước 14 active voice dù budget 8, sau giữ 8/8. Voice đang fade đã nhường slot không được chọn lại để cấp nhiều voice mới vào một graph. Đổi preset/adaptive cũng thực thi budget.
2. Audio Lab có số đo thực và nhãn PASS/FAIL; 833 WAV/PNG khớp SHA256 với bản nguồn. Thêm audio:render/audio:report/audio:test và dev:test. Không render lại cue để vượt số vòng sửa đã chốt.
3. Bloom chỉ nhận highlight đủ sáng, có chuyển tiếp mềm và giới hạn năng lượng tán xạ; giữ ngưỡng thấp cho Shadow/Space/Time. Giữ nguyên HDR scene gốc, exposure theo skill, slider strength, timeline và hình thái 15 hệ/23 kỹ năng. Không thêm renderer/vòng cập nhật.

## Kiểm thử và giới hạn

| Nhóm | Bằng chứng | Kết quả |
|---|---|---|
| Build | Lượt build mới sau sửa bloom | PASS, 62 modules; còn cảnh báo Three core >500kB |
| Unit | npm test | PASS, 6 nhóm, gồm score của đủ 23 kỹ năng |
| Audio engine | evidence/audio-v3/summary.json | 23/23 finale/cleanup, bốn budget, pause/rate/mute/rapid selection đạt |
| Audio Lab | evidence/audio-v3/lab.json | PASS nghe mới/A–B/WAV/ảnh/dừng |
| Ma trận VFX Low | evidence/contrast/after/results.json | PASS 23/23 impact, 0 lỗi JS/WebGL/shader |
| Preset khác | evidence/contrast/{medium,high,ultra}/results.json | Mỗi preset PASS 4 ca đại diện; không phải ma trận mọi skill × mọi phase × mọi preset |
| UI production | evidence/resumed-production/results.json | PASS chọn/cast/Play/MP/pause, audio UI bật, 0 console error; có video |
| Bất biến | audio/source-audit.json đối chiếu checkpoint đầu lượt | Hash registry/plans/START.bat giữ nguyên |

Lượt harness audio tổng cuối có lỗi fixture chưa expose biến module audioLab; raw result vẫn giữ FAIL. Sau sửa fixture, chạy riêng UI Lab PASS. Không sửa nhãn raw FAIL thành PASS. Hai fixture cũ còn giả định bật audio thủ công sau khi mở panel; bản mới tự unlock gesture, nên observe đã xử lý trạng thái nút trước khi bấm. Các log lỗi được giữ trong work.

225 cue: 224 PASS, lightning/impact FAIL RMS sau 5 vòng; 23 reference mixes PASS ngưỡng đo nhưng là render offline, không phải âm thanh ghi browser. Tất cả chưa kiểm chứng bằng tai. Số voice fade được ghi riêng với active voice; không gọi tổng source đang fade/chờ là voice active.

## Đánh giá ảnh

So sánh seed/camera/preset/mốc impact cố định, chỉ pixel canvas, không lẫn UI. Pixel trắng là cả ba kênh RGB ≥245/255; luminance sáng dùng ngưỡng 0.95. Đây là số đo screenshot, không phải chứng nhận nghệ thuật hoặc FPS GPU thật.

| Kỹ năng | Pixel trắng trước | Sau |
|---|---:|---:|
| FIRE-01 | 73.28% | 14.65% |
| WATER-01 | 0.83% | 0.00% |
| LIGHT-01 | 44.56% | 3.90% |
| LIGHTNING-01 | 95.90% | 53.74% |

Ở Thủy, chỉ số vùng luminance ≥0.95 giảm từ khoảng 29.1% xuống 0%, giúp nhìn lại thân cá voi, vương miện nước và mặt triều. Lôi vẫn có vùng flash rộng ở mốc này; đã hết 3 vòng sửa nhóm bloom, lưu phần còn lại cho nhóm đánh giá flash/aftermath riêng. Không thay toàn bộ 15 kỹ năng bằng hiệu ứng chung.

Tải evidence/contrast-review.zip, giải nén, mở contrast/index.html để chọn kỹ năng và kéo thanh trước/sau. Ảnh được lưu; không phải Live Preview. Video production không có audio track; bản thu browser ngắn của Lab nằm riêng tại evidence/audio-v3/browser-audio.webm.

## Chạy lại trên máy phát triển

```sh
npm ci
npm run dev:test
# Trong terminal khác, không sửa nguồn khi đang đo:
npm run audio:test -- --output work/audio-review
python tests/vfx_contrast.py --label review --all-skills
```

Cần Python dependencies của tests, NumPy và Pillow cho đo ảnh, Chromium/Playwright. Kiểm tra production có thể chạy bằng npm run observe -- --label review --audio. Audio Lab mở tại ?audiolab=1. Không dùng localhost trong báo cáo như link truy cập từ máy người nhận.

## Phần tiếp nối

- Tích hợp và compile thực hai module PBR/probe đang được bảo toàn trong src/graphics/aaa; hiện chưa dùng trong game. Tối ưu seam, không gian normal, interpolation SH và lifecycle trước khi gắn vào engine.
- Kiểm tra thêm flash Lôi và release/aftermath trên đủ preset; review audio bằng thiết bị nghe thật và giữ ngoại lệ FAIL lịch sử.
- Giai đoạn 1 chưa đóng toàn bộ thị giác; chưa chuyển HP/enemy/Boss/world/gameplay mới. Các chức năng mage/animation/MP/dummy có từ nền vẫn được giữ.
- Danh sách ý tưởng xếp hạng của vòng này ở ROUND-RESUME-2026-10-17.md; không bật workflow tự động để chạy vòng sau.
