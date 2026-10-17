# Vòng tiếp nối sau lệnh dừng — 17/10/2026

Bảo toàn fb6a84d và toàn bộ WIP; build hiện trạng 61 modules và 5 nhóm unit PASS. Không merge main/Production/API trả phí. Registry/timeline/START.bat giữ nguyên.

Điểm 1–5: Giá trị/Khó/Rủi ro/Khả năng kiểm thử.

| Ý tưởng | Giá trị | Khó | Rủi ro | Test | Chọn |
|---|---:|---:|---:|---:|---|
| Hồi quy score/mixer/voice/prewarm trên browser |5|3|3|5|Có, nhóm 1|
| Đồng bộ WAV/report với Audio Lab và production URLs |5|2|2|5|Có, nhóm 2|
| Chuẩn hóa HDR/độ sáng VFX, ưu tiên Water |5|3|3|5|Có, nhóm 3|
| Tích hợp triplanar PBR |4|4|4|4|Sau gate hiện tại|
| Tích hợp lưới SH irradiance |4|4|4|4|Sau vật liệu|
| Ground decal theo hệ |4|3|3|4|Sau exposure|
| Batch Rune Tower |3|4|3|3|Cần profile GPU thực|
| HP/hurt/death nhân vật |5|4|4|5|GĐ2 sau GĐ1|
| Enemy AI/Boss |5|5|4|5|GĐ3|
| Terrain LOD/collision |4|5|4|4|GĐ4|
| Codec audio/tải theo nhu cầu |3|3|3|4|Sau browser regressions|
| Kiểm toán fonts/offline assets |3|2|2|5|Sau nhóm hiện tại|

Acceptance: browser Audio Lab thật phát cue/A-B/dừng; 4 quality budgets, 23 score/timeline, pause/rate/hitstop/late unlock/rapid selection/voice cleanup, assets HTTP200 + hash; không JS/WebGL/shader errors. VFX có ảnh trước/sau cùng fixture và số đo vùng render, giữ ID/hình thái, không suy FPS native GPU từ SwiftShader. Tối đa 3 vòng sửa cho mỗi nhóm. lightning/impact vẫn giữ FAIL lịch sử sau 5 vòng, không âm thầm thêm vòng hoặc thay kết quả cũ.
