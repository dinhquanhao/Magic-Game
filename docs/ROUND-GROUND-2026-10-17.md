# Nền đất nâu — 17/10/2026

Yêu cầu hiện tại: tạo nền đất màu nâu trên game hiện có. Chọn ba mục đầu dưới đây; các ý tưởng còn lại là backlog, không tự mở thêm phạm vi. Không thay thiết kế/cấu hình 15 hệ, 21 skill.

| Ưu tiên | Ý tưởng | Giá trị | Độ khó / rủi ro | Nghiệm thu | Trạng thái |
|---|---|---|---|---|---|
| 1 | Nền nâu ấm, roughness cao, metalness bằng 0 | Đúng yêu cầu; mặt đất rõ hơn | Thấp / thấp | Ảnh cùng camera trước/sau | Đã làm |
| 2 | Vân đất procedural tĩnh, giảm chi tiết khi nhỏ hơn pixel | Có chất liệu, không thêm texture/draw call | Thấp / vừa: shader | Chromium chạy shader trên bốn preset | Đã làm |
| 3 | Kiểm tra phản ứng nguyên tố và phục hồi nền | Giữ hiệu ứng đang hoạt động | Vừa / thấp | Wet/burn/frost/mud/moss; Thảo và reset khớp pixel Low/High | Đã làm |
| 4 | Thanh chọn tông màu đất | Người chơi tùy chỉnh cảnh | Vừa / vừa: lưu cấu hình | Reload/reset giữ đúng lựa chọn | Để sau |
| 5 | Đá nhỏ instanced ở mép đấu trường | Thêm chiều sâu | Vừa / vừa: che ngắm | Culling/preset/reticle | Để sau |
| 6 | Cỏ thưa quanh rìa | Tăng cảm giác tự nhiên | Vừa / vừa: overdraw | Gió/pause/cleanup/GPU thật | Để sau |
| 7 | Vết chân pháp sư có giới hạn | Phản hồi di chuyển | Vừa / vừa: pooling | Chạy/dừng/reset/quota | Để sau |
| 8 | Vết nứt địa hình mờ dần theo đòn | Impact rõ hơn | Cao / vừa: lifecycle | Timeline toàn registry | Để sau |
| 9 | Đường mòn và vùng chiến đấu | Hỗ trợ định hướng | Cao / vừa: thiết kế cảnh | Camera/collision/đọc VFX | Để sau |
| 10 | LOD địa hình cho khu vực lớn | Chuẩn bị khám phá | Cao / cao: seam/collision | Đo GPU native và streaming | Để sau |

Chỉ sửa vật liệu nền/lưới và lớp màu/roughness nền trong shader hiện có. Hai lớp noise dùng tọa độ mặt đất tĩnh; chi tiết hạt giảm theo footprint pixel. Các lớp rêu, nước, băng, cháy và bùn tiếp tục phủ lên màu cơ sở; không cấp phát texture, mesh hoặc render pass mới.

Bằng chứng và lệnh tái chạy: [báo cáo nền đất](evidence/brown-ground/README.md). SwiftShader không chứng minh hiệu năng GPU thật. Các yêu cầu đồ họa lớn còn dang dở vẫn ở roadmap; lượt này không tự đánh dấu chúng hoàn tất.
