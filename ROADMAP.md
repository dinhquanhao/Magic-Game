# Lộ trình Magic-Game

Lộ trình được cập nhật ngày 17/10/2026 (Asia/Bangkok), tiếp nối mã hiện có. Mỗi giai đoạn phải có build và bằng chứng Playwright; tối đa 3 vòng sửa/kiểm thử cho mỗi nhóm thay đổi. Các giới hạn mô phỏng vật lý trong tài liệu lịch sử được ghi rõ, không tự xem mô tả “chưa có FFT/ray tracing/N-body” là yêu cầu thay toàn bộ engine.

| Giai đoạn | Phạm vi | Điều kiện hoàn thành | Trạng thái |
|---|---|---|---|
| 0 — Nâng cấp cũ | Shader, PBR, post-effects, Bóng Tối, trường gió, lifecycle và D/E trong log cũ | Đối chiếu mã/lịch sử; sửa lỗi shader; kiểm tra 23 skill Low/High, 4 preset hậu kỳ, pause, context recovery, cast lặp; xác nhận chuyển động Nham/Tinh Tú/Tinh Thần; ghi giới hạn đồ họa | Đạt trong phạm vi engine; xem bằng chứng |
| 1 — 15 hệ | VFX, ánh sáng, particle, AOE, camera và hiệu năng toàn registry | Giữ nguyên ID/tên/thiết kế; bán kính VFX/reticle/va chạm thống nhất; ảnh release/impact/aftermath; không lỗi JS/WebGL/shader trong ma trận; tài nguyên ổn định khi chuyển hệ | Đang thực hiện: shader/AOE đạt, còn thị giác/cân bằng |
| 2 — Nhân vật | Hoàn thiện pháp sư procedural có sẵn, animation, di chuyển, HP/MP, chiến đấu | Không tạo lại model hiện có; đi/chạy/nhảy/lướt/ngắm/cast hoạt động; HP/MP, trạng thái bị đánh/chết/reset có kiểm thử; đủ 23 skill kết nối | Chưa bắt đầu |
| 3 — Quái và Boss | Enemy registry, AI, sát thương, animation, Boss nhiều giai đoạn | Vòng AI truy đuổi/báo đòn/đánh/hồi phục; chết/dọn tài nguyên; Boss chuyển pha theo HP; người chơi có thể thắng/thua và chơi lại | Chưa bắt đầu |
| 4 — Assets và cảnh | Địa hình, rừng/núi, công trình, nước/thời tiết/ánh sáng | Cảnh có chủ đề, đường đi và vùng chiến đấu rõ; collision phù hợp; culling/instancing và preset được kiểm tra; không che reticle/UI | Chưa bắt đầu |
| 5 — Gameplay | Khám phá, gặp địch, tiến trình, Boss và vòng chơi hoàn chỉnh | Có bắt đầu, mục tiêu, tiến trình, thắng/thua/restart; combat và khám phá liên tục; tài nguyên/HP/MP hợp lý; smoke test trọn vòng | Chưa bắt đầu |
| 6 — Cải tiến | Đánh giá, sửa lỗi, đo và backlog | Chạy kiểm thử tích hợp; báo cáo thực tế, giới hạn và 10 ý tưởng ưu tiên; checkpoint/PR, không auto-merge | Thực hiện ở mỗi mốc bàn giao |

## 10 ý tưởng của lượt hiện tại

| # | Ý tưởng | Lợi ích | Quyết định |
|---|---|---|---|
| 1 | Tiến trình thi triển theo đồng hồ mô phỏng, màu hệ và đếm ngược | Đọc rõ charge/channel/impact/aftermath, pause đúng | Đã triển khai |
| 2 | Dọn vật liệu dùng chung, geometry và buffer instance; bỏ tham chiếu sau dispose | Hạn chế tăng bộ nhớ qua nhiều cast và chuyển hệ | Đã triển khai |
| 3 | Ngân sách VFX thích ứng độc lập với giá trị slider người chơi | Giảm tải có giới hạn, tôn trọng bật/tắt adaptive | Đã triển khai |
| 4 | Một nguồn bán kính AOE cho module/reticle/va chạm | Sửa scale bị áp hai lần, ngắm đáng tin cậy | Ưu tiên GĐ1 |
| 5 | Chuẩn hóa drift gió cho particle và smoke dùng chung | Hoàn thiện giao thoa Phong trong nâng cấp cũ | Đã bổ sung, kiểm thử GĐ0 |
| 6 | Pool/batch các nét Rune Tower theo vật liệu và tầng | Giảm draw calls mà giữ nguyên tạo hình | Sau đo profile |
| 7 | Bloom giảm độ phân giải theo ngân sách frame | Giảm chi phí hậu kỳ, tránh cháy sáng | Cần benchmark native GPU |
| 8 | Phản hồi trúng đòn và kháng nguyên tố trên HP của mục tiêu | Kỹ năng có ý nghĩa trong combat | GĐ2–3 |
| 9 | Ánh sáng tiếp xúc và vết mặt đất mờ dần theo nguyên tố | Đòn đánh gắn kết với môi trường | GĐ1/4 |
| 10 | Nạp module skill theo nhu cầu và màn hình tải rõ ràng | Giảm tải ban đầu và mở đường assets lớn | Sau khi gameplay ổn định |

Không coi các ý tưởng chưa triển khai là tính năng đã có. Nội dung roadmap có thể được tinh chỉnh theo kết quả đo, nhưng thay đổi điều kiện phải được ghi trong `PROGRESS.md`.
