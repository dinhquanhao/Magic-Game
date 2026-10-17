# Góc nhìn nhân vật —18/10/2026 (Asia/Bangkok)

Tiếp nối c0e5dd2,15hệ/19skill. Story: người chơi chọn camera → state camera độc lập actor → dựng projection/view và ray ngắm → render game, di chuyển/thi triển/tạm dừng/chuyển Showcase vẫn hoạt động. Đây là client Three.js; không có API/database/secret mới.

Khảo sát trước sửa: cameraOffset và forward dùng chung motion.yaw; input/camera nhìn theo yaw nhân vật nên khi di chuyển bị kéo về sau. Orbit cao độ hẹp, thiếu menu play view, thiếu map pan/first person và đồng bộ cursor-ground. Bot/10s ritual/active0,5×/fade1,8s đã bàn giao, giữ nguyên. Baseline `npm run observe -- --label before-camera-modes --runes --hold-seconds 0` PASS, build67module, code c0e5dd2. Giữ log/ảnh/video raw trong work/camera-modes.

| # | Ý tưởng | Giá trị / độ khó / rủi ro | Kiểm chứng | Quyết định |
|---|---|---|---|---|
| 1 | Tách yaw/pitch/zoom của camera khỏi actor | Cao/vừa/vừa | Quay360, chạyW và cast không tự kéo camera | Chọn nhóm1 |
| 2 | 4preset mới:3/4,LoL,thứ nhất,orbit360 | Cao/vừa/vừa | Pose/FOV/projection, ảnh từng view | Nhóm1 |
| 3 | Map pan mép màn hình và chuột giữa, Y follow/C recenter | Cao/vừa/vừa | Pan không dịch actor, biên và quay lại | Chọn nhóm2 |
| 4 | Ngắm ray theo cursor cho3/4/LoL, first person hide body | Cao/vừa/vừa | Ray mặt đất/actor occlusion/cast snapshot | Nhóm2 |
| 5 | Menu playview rõ ràng và phímV/camera hint | Cao/thấp/thấp | UI thật, resize/focus/showcase/reset | Chọn nhóm3 |
| 6 | Camera quan sát độc lập khi pause | Vừa/thấp/vừa | Camera đổi, timeline/pose đứng yên | Nhóm2 |
| 7 | Va chạm camera và giới hạn floor/zoom | Cao/vừa/vừa | Collider, pitch/zoom cực trị, FPS near plane | Nhóm1 |
| 8 | Click phải để đi và pathfinding kiểuMOBA | Cao/cao/cao | Cần navigation/combat design; request hiện tại chỉ camera | Để sau |
| 9 | Minimap và bookmark camera | Vừa/vừa/vừa | Cần map gameplay | Backlog |
| 10 | Camera cinematic track/editor/photo mode nâng cao | Vừa/cao/vừa | Ngoài phạm vi4góc nhìn mới | Backlog |

Giữ viewTheoSau cũ; mặc định3/4. Một renderer/RAF, không import controller demo. Chuột phải xoay orbit/first-person; click cảnh ở các view trỏ chuột cast, first person nhấp để khóa chuột/Esc thoát; WASD vẫn di chuyển, Space vẫn nhảy. C/Y/V không thay hotbar. Camera chọn rõ ràng ưu tiên hơn cinematic tự động; cinematic legacy vẫn có ởTheoSau. Không sửa registry/skill/timing/audio/nền/model. Ghi test phù hợp ở docs/evidence/camera-modes; không coi SwiftShader là GPU native/LivePreview. Tối đa3vòng sửa/kiểm thử, cập nhật Draft PR#1, không merge main.
