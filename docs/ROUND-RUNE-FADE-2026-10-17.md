# Phù văn mờ khi skill xuất hiện — 17/10/2026

Yêu cầu hiện tại chỉ đổi phần chuyển sang ẩn của phù văn chung trên15hệ/19skill. Không thay VFX đòn đánh, chỉ số hoặc cơ chế của skill. Giữ registry19skill sau đợt thu gọn Hỏa.

| Ưu tiên | Ý tưởng | Giá trị | Khó / rủi ro | Kiểm chứng | Quyết định |
|---|---|---|---|---|---|
| 1 | Fade smoothstep1,8giây, bỏ bước giảm opacity đột ngột lúc release | Chuyển tiếp liên tục | Thấp / vừa | Opacity/material/ảnh đầu–giữa–cuối | Đã triển khai |
| 2 | Bám hiệu ứng bật hiển thị; chờ skill xuất hiện trễ | Không tan trước hiệu ứng | Vừa / vừa | Time, root rỗng, đủ19skill | Đã triển khai |
| 3 | Đồng bộ clock, tắt hạt/đèn và giữ trạng thái đã ẩn | Pause/recast/toggle đúng | Vừa / vừa | Freeze/slow/toggle/cleanup | Đã triển khai |
| 4 | Slider thời lượng fade | Tùy chỉnh cá nhân | Vừa / thấp | Lưu/reset/giới hạn giá trị | Để sau |
| 5 | Curve fade riêng từng hệ | Tạo bản sắc | Vừa / vừa | Ma trận mới và cân bằng | Để sau |
| 6 | Tan theo cạnh vòng, có dither | Tăng chi tiết | Cao / cao: shader | Compile/alias/banding | Để sau |
| 7 | Mô phỏng tro/hạt rơi riêng từng hệ | Thêm chuyển động | Cao / cao: overdraw | Ngân sách GPU/pause/cleanup | Để sau |
| 8 | Điều khiển opacity từng tầng trực tiếp trong shader | Giảm thao tác CPU | Cao / vừa | Profile trước/sau GPU thật | Để sau |
| 9 | Gợi ý thời điểm release trong UI | Dễ đọc nhịp cast | Vừa / vừa: thiết kế | Keyboard/mobile/accessibility | Để sau |
| 10 | Chế độ slow preview riêng cho artist | Xem fade dễ hơn | Cao / vừa: timeline | Không đổi tốc độ gameplay | Để sau |

Ba nhóm đầu hoàn thành trong phạm vi yêu cầu. Không tích hợp các draft gate/rune AAA cũ: bộ rune hiện có tiếp tục vẽ và hội tụ như trước. Giá trị1,8giây ở `src/rune-fade.js`; không sửa các cấu hình skill cũ để giữ fingerprint, timing đòn đánh và score âm thanh.

Mốc bắt đầu được lưu riêng trong mỗi cast khi nhóm attack hiển thị hoặc root có nội dung được bật. Root placeholder trống không được coi là đã xuất hiện. Sau mốc đó, fade chỉ dùng chênh lệch activeTime, không dựa vào đồng hồ thực hoặc thời điểm impact/aftermath. Đây là trạng thái hiển thị của scene, không phải phép đo pixel phát hiện hiệu ứng shader đầu tiên.

Lúc hoàn tất, toàn bộ opacity vật liệu, cường độ hạt và đèn phù văn về0; ẩn group và bỏ cập nhật hình học còn lại. Recast tạo group/trạng thái mới. Không thêm texture, mesh, renderer, RAF hoặc timer độc lập.

Bằng chứng: [ma trận, ảnh/video và lifecycle](evidence/rune-fade/README.md). Các kết quả trước đây về giữ nguyên rune là lịch sử trước yêu cầu đổi fade này; config/profile giữ nguyên nhưng chuyển tiếp hiển thị đã đổi có chủ đích.
