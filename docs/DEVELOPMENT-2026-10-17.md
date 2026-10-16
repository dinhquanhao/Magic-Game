# Checkpoint phát triển — 17/10/2026

Lượt này tiếp tục `dinhquanhao/Magic-Game` từ `1a3fe3d`, giữ nguyên 15 hệ và 23 tuyệt kỹ. Không bắt đầu lại game. Yêu cầu mở rộng được tích hợp sau checkpoint `d2e80eb`; xem [ROADMAP](../ROADMAP.md) và [PROGRESS](../PROGRESS.md). Giai đoạn 0 đã hoàn tất phần nâng cấp lịch sử trong phạm vi engine hiện tại. Giai đoạn 1 đã có sửa AOE và kiểm thử toàn registry, còn đánh giá thị giác/cân bằng; các giai đoạn 2–5 chưa triển khai trong checkpoint này.

## Thay đổi

- Sửa lỗi shader trên 8 skill: Hỏa thiếu newline trước chỉ thị GLSL, Thủy/Ánh Sáng/Lôi dùng tên `active` bị GLSL cấm, Bóng Tối tham chiếu màu JavaScript trong GLSL, Lôi khai báo trùng `instanceColor`; Huyết/Lôi vượt attribute budget. Dữ liệu scalar được đóng gói giữ nguyên hình thái, timeline và ngân sách skill.
- Bổ sung tiến trình cast màu nguyên tố, đếm ngược theo simulation time và pause. Tách lớp flash khỏi slider trùng ID; tránh alpha `NaN` trước impact.
- Dọn shared geometry/material đúng một lần và buffer instance; loại vật liệu đã dispose khỏi danh sách theo dõi. Tất cả cast kết thúc theo timeline, gồm auto-repeat cho skill dài.
- Watchdog giảm ngân sách runtime, giữ giá trị density/debris người chơi và tôn trọng công tắc adaptive. F3 thể hiện ngân sách và vật liệu đang theo dõi.
- Hoàn thiện phần cũ: point shader đọc chung gió với mặt đất/cỏ/áo choàng; cỏ dùng simulation time khi pause; sửa tọa độ Light Injection; tái tạo procedural PMREM sau context restore; dùng góc orbit an toàn khi trở về Showcase.
- Thống nhất tính AOE cho VFX/reticle/impact, bỏ tỷ lệ bị nhân hai lần ở nhiều module. Giữ các giới hạn vật lý riêng của nước/băng/không gian/thời gian. Cast lưu bán kính khi dựng, không đổi vùng va chạm nếu slider được sửa giữa cast. Phong vẫn có vùng ảnh hưởng gió và lõi va chạm riêng, thể hiện bằng hai vòng.

## Kiểm thử và bằng chứng

| Kiểm tra | Kết quả | Log |
|---|---|---|
| Cú pháp JavaScript | 23 tệp đạt | `node --check` cho `src/**/*.js` và Vite config |
| Unit/resource tests | Đạt | `npm test`: shared disposal, instance buffers, linear AOE và cap |
| Build cuối | Đạt, 51 modules | `npm run build` |
| Baseline | 8 skill lỗi; 53 thông báo compile shader, 296 thông báo console/WebGL trong 69 mẫu | [baseline](evidence/baseline.json) |
| Toàn registry Low | 23/23 × release/impact/aftermath, không bad program/GL error/transform lỗi | [ma trận](evidence/stage0-matrix.json) |
| Toàn registry High | 23/23 tại impact, gồm PBR/shadows/SSR/GTAO và 9 skill nhóm D cũ | [ma trận](evidence/stage0-matrix.json) |
| 4 preset và hậu kỳ | Low/Medium/High/Ultra; DoF bật/tắt, resize; không console error | [console](evidence/console.json) |
| Lifecycle | 10 cast Huyết render/dispose; luôn về 24 geometry, 16 texture, 24 vật liệu theo dõi trong fixture này | [ma trận](evidence/stage0-matrix.json) |
| Gameplay/control | Pause/feedback, mana/cooldown, reset, auto-repeat skill ngắn/dài, watchdog giữ sliders | [ma trận](evidence/stage0-matrix.json) và test assertions |
| Mất/khôi phục WebGL | Đạt; PMREM texture mới, render lại không lỗi | [context](evidence/context-recovery.json) |
| AOE | 23/23 × 120/350 m, cast lệch tâm; VFX/cast/reticle khớp; cast hiện tại giữ vùng khi sửa slider | [AOE](evidence/aoe-matrix.json) |
| Build production, UI thật | Chọn hệ/skill, vào Play, cast, MP giảm, pause: đạt; không chèn fixture | [production](evidence/production.json) |

Có một lượt hồi quy bị gián đoạn bởi HMR trong khi mã được cập nhật. Đã giữ log tại `work/round2/` và chuyển sang server không HMR. Lượt GĐ0 đầu đã qua ma trận, control và lifecycle nhưng dừng ở fixture restore context vì gọi lại extension sau khi mất context. Đã lưu extension trước khi mất và chạy lại riêng context/camera thành công. Không ghi hai lượt này thành full pass.

Playwright dev fixture vô hiệu RAF scheduling, điều khiển đồng hồ và lấy mẫu mốc trên cùng module thật; một số ảnh dùng cập nhật simulation liên tiếp. Production smoke test dùng bundle thực và thao tác UI, không chèn API. Kết quả sampling không thay thế một lượt chơi dài trên phần cứng người dùng.

## Ảnh kiểm chứng

[Play Mode của bản production](evidence/production-play.png) · [Bóng Tối](evidence/shadow.png) · [Huyết](evidence/blood.png) · [Rune Tower](evidence/rune-tower.png)

Ảnh là ảnh chụp render trong browser, không phải ảnh minh họa tạo bằng AI. Các ảnh VFX dùng fixture kiểm thử để chọn thời điểm; không phải benchmark thị giác chuẩn hóa giữa phần cứng.

## Giới hạn và công việc tiếp theo

- Chromium dùng ANGLE/SwiftShader, chạy WebGL bằng phần mềm. Chưa có FPS/VRAM/native GPU benchmark; giữ cảnh báo bundle Three core 535.18 kB, không tăng ngưỡng để che cảnh báo.
- VFX vẫn có vùng sáng gắt/tương phản không đồng đều giữa các hệ. Cần chuẩn hóa ảnh theo góc máy và exposure, đánh giá đủ 23 skill ở release/impact/aftermath và cân bằng camera trước khi đóng GĐ1.
- SSR không temporal; nước/SSS/volume/caustic/lensing vẫn theo giới hạn analytic/xấp xỉ của engine. Không tuyên bố ray tracing, FFT fluid hay mô phỏng vật lý AAA.
- GĐ2 kế tiếp chỉ bắt đầu sau tiêu chí GĐ1: hoàn thiện HP/MP/trạng thái bị đánh/chết và combat của pháp sư sẵn có. Enemy/Boss, thế giới và vòng gameplay hoàn chỉnh còn trong roadmap, chưa được tuyên bố đã làm.
- [10 ý tưởng và quyết định triển khai](../ROADMAP.md#10-ý-tưởng-của-lượt-hiện-tại) là backlog cho các vòng tiếp theo. Ba cải tiến chọn ban đầu là tiến trình cast, lifecycle và ngân sách thích ứng; AOE/gió được làm thêm theo yêu cầu mở rộng.

Checkpoint bàn giao qua PR nháp để bảo toàn mã, bằng chứng và nhiệm vụ tiếp theo khi kết thúc ngân sách lượt chạy. Không merge/auto-merge vào main.
