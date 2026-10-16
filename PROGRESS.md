# Tiến độ Magic-Game

## Trạng thái hiện tại — 17/10/2026

- Nhánh: `codex/magic-game-stability-vfx-20261017`, nền `1a3fe3d` (`main`). Không merge/auto-merge.
- Checkpoint bảo toàn lượt đang chạy: `d2e80eb` — sửa shader, tiến trình cast, ngân sách VFX và bộ kiểm thử.
- Yêu cầu mới thay thế quy định tạm dừng nâng cấp cũ. Đã đọc toàn bộ README, `UPGRADE_PROGRESS.md` và đối chiếu mã nguồn. Giữ nguyên tài liệu lịch sử.
- Giai đoạn 0 đã khép phần nâng cấp lịch sử trong phạm vi engine; Giai đoạn 1 đang thực hiện và được lưu tại checkpoint. Các giai đoạn 2–5 chưa được tuyên bố hoàn thành; pháp sư 3D/animation/MP và training dummy đã có từ mã nền.

## Phát hiện và thay đổi

1. Build nền thành công nhưng WebGL báo shader lỗi ở 8 skill: FIRE-01/02/03, WATER-01, LIGHT-01, SHADOW-01, LIGHTNING-01, BLOOD-01. Đã sửa chỉ thị shader Hỏa thiếu xuống dòng, từ khóa GLSL `active`, màu shader Bóng Tối chưa khai báo, `instanceColor` khai báo trùng; đóng gói attribute Huyết/Lôi để chạy trong giới hạn WebGL2.
2. Tách ID lớp chớp khỏi thanh điều chỉnh `impactFlash`; thêm favicon tránh 404. Sửa phép tính alpha có thể dùng `sin(Infinity)` trước impact.
3. Thêm tiến trình cast màu nguyên tố, đồng bộ charge/channel/active/aftermath, pause và simulation time.
4. Bỏ tham chiếu mạnh đến vật liệu sau dispose; dọn geometry/material chia sẻ một lần và dispose buffer InstancedMesh. Hết timeline sẽ dọn mọi cast; auto-repeat áp dụng cả skill dài.
5. Watchdog dùng hệ số ngân sách runtime riêng, không ghi đè density/debris slider; không tự giảm tải khi adaptive tắt. F3 hiển thị số vật liệu và hệ số ngân sách.
6. Giai đoạn 0 bổ sung: gió dùng chung cho point-shader custom; cỏ dùng simulation time khi pause; Light Injection dùng vị trí nguồn sáng trong world space và đúng dấu view space; tái tạo PMREM sau context restore.

## Bằng chứng kiểm thử đã lưu

| Lượt | Kết quả | Bằng chứng |
|---|---|---|
| Baseline | Build đạt; 15 hệ/23 skill; 53 thông báo compile shader và 296 console/WebGL thông báo trong mẫu 69 mốc | `work/baseline/skills.json`, `shader-errors.json`, ảnh baseline |
| Vòng 1 | 22/23 skill không lỗi ở Low; Lôi lộ thêm lỗi vượt attribute sau khi sửa cú pháp; đã sửa | `work/round1/results.json` |
| Vòng 2 ban đầu | 23/23 Low đạt; High đạt đến Lôi; lượt bị gián đoạn do HMR khi cập nhật mã | `work/round2/results.json`; không tính là full pass |
| GĐ0 vòng 1 | 23/23 Low và 23/23 High, 4 preset, control, mana, 10 cast đạt; fixture restore context cần sửa | [matrix](docs/evidence/stage0-matrix.json) |
| GĐ0 vòng 2 | Context loss/restore đạt, PMREM được tái tạo, camera Showcase an toàn | [context](docs/evidence/context-recovery.json) |
| GĐ1 vòng 1 | 23/23 skill × AOE 120/350 m, cast lệch tâm; VFX/reticle/cast khớp | [AOE](docs/evidence/aoe-matrix.json) |
| Production cuối | Bundle thực, chọn hệ/skill, Play, cast, MP và pause đạt; không console error | [production](docs/evidence/production.json) |

`npm test` đạt kiểm tra giải phóng shared resources và buffer instance. Build cuối đạt (51 modules); cảnh báo cũ Three core 535.18 kB vẫn còn. Log/ảnh chọn lọc đã lưu tại `docs/evidence/`; xem [báo cáo bàn giao](docs/DEVELOPMENT-2026-10-17.md).

## Đối chiếu nâng cấp cũ

- A: SSR/GTAO/SSAO/DoF, OutputPass, PBR, adaptive và F3 đã có trong mã; đã kiểm thử WebGL qua Chromium/SwiftShader, gồm 4 preset và context recovery.
- B/C: hình thái Thủy/Thổ/Phong và các module riêng đã có. Phần thiếu chính là shader thực thi, trường gió dùng chung và kiểm chứng lifecycle; đã bổ sung gió point shader và kiểm thử shader/lifecycle.
- D: Nham/Tinh Tú/Tinh Thần đã có vật liệu và chuyển động từ bản tạm dừng; không dựng lại. Cả 9 skill Low/High đạt. Đánh giá thị giác có hệ thống tiếp tục ở GĐ1.
- E: registry/ID/tên giữ nguyên so với main; build, audit, tài liệu và bằng chứng đã lưu. `dist/` sinh bằng build, không commit.
- Các xấp xỉ analytic về nước/khói/gió, SSS, GI và lensing vẫn được công khai; chưa có ray tracing, FFT fluid hay solver vật lý tổng quát.

## Việc tiếp theo

1. GĐ1: chuẩn hóa góc máy/exposure và ảnh cho đủ 23 skill, xử lý vùng cháy sáng/thiếu tương phản. Shader đã biên dịch nhưng chưa gọi là hoàn thiện thị giác toàn bộ game.
2. AOE đã sửa: một nguồn bán kính, không nhân tỷ lệ hai lần; test bounds 120/350 m và cast lệch tâm đạt cho cả 23 skill. Giữ bán kính cast khi thay slider trong lúc đang thi triển.
3. GĐ2–5 chưa bắt đầu trong lượt này. Sau khi GĐ1 đạt, hoàn thiện HP/MP/trạng thái chiến đấu của pháp sư sẵn có, rồi enemy/Boss, cảnh vật và vòng gameplay theo roadmap.
4. Checkpoint cuối được commit và tạo PR nháp, không merge main. Mã nguồn, log cũ và ảnh trong `work/` được bảo toàn; bằng chứng bàn giao có trong repository.

## Giới hạn môi trường

- Chromium dùng ANGLE/SwiftShader (WebGL chạy bằng phần mềm), có compile/render thực; không đại diện FPS hoặc driver trên GPU người chơi.
- Terminal mặc định chặn mở localhost/kết nối proxy; chạy server/browser và Git qua quyền thực thi đã được công cụ cấp. Không có auto-review rejection còn tồn đọng.
- Chưa có kết quả kiểm thử native GPU. Không dùng số frame cost của SwiftShader làm tuyên bố tối ưu GPU thực.
