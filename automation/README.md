# Điều phối Codex — CHƯA KÍCH HOẠT

Đã chuẩn bị template chính thức `openai/codex-action`, queue task, bộ chọn task offline và prompt tiếp nối. Template nằm ngoài `.github/workflows`, không có cron và chưa được GitHub thực thi. Không có API key được tạo, API trả phí được gọi hay lịch nền đã chạy.

## Phần đã kiểm tra offline

- `npm run automation:plan` đọc các tài liệu bắt buộc, chọn task queued theo stage/priority, loại task đang có marker `<!-- magic-task:task-id -->` trong open Draft/PR.
- `--require-ready` dừng khi bất kỳ readiness flag còn false. Cờ trong JSON là hồ sơ quyết định của quản trị viên, **không tự xác minh quyền hoặc giới hạn tiền**.
- Concurrency group cố định serialize workflow trong repository, `cancel-in-progress: false`. Chỉ những job dùng cùng group mới chịu khóa này. Tác vụ thủ công cần kiểm tra queue/PR và không chỉnh cùng task; không có khóa toàn cục cho mọi người/máy.
- Mỗi run tạo nhánh `codex/autonomy-<run>-<attempt>` từ integration branch được duyệt; không sửa nhánh PR #1. Task đang xử lý được nhận diện qua Draft PR mở của run đã publish. Hai run của workflow không chạy song song; run lỗi lưu artifacts và không tự ghi task done.
- Test/build/observe chạy trước publish, PR luôn Draft. Chỉ đọc base trong checkout, credentials không lưu lại trong git. Agent không được giao GH_TOKEN; bước publish riêng dùng token GitHub với quyền contents/PR. Mọi action pin SHA; CLI/model phải được quản trị duyệt và chốt version tương thích (`permission-profile` cần Codex CLI >=0.138.0).

## Phần cần xác minh trước khi bật

1. Người quản trị xem diff và SHA actions, model/version, queue, prompt và quyền write/PR. Đặt protected environment `magic-game-autonomy-reviewed` với reviewer, chỉ cho nhánh được duyệt. Không chạy mã PR/fork chưa tin cậy với API key.
2. Xác nhận tài khoản OpenAI, hạn mức và ngân sách chi phí cụ thể được người dùng duyệt. Codex API trong GitHub Actions không mặc nhiên bao gồm trong quyền ChatGPT hiện tại. Timeout 45 phút và concurrency 1 không phải hard dollar cap. Thiết lập giới hạn chi tiêu có hiệu lực/giám sát/cơ chế dừng phù hợp với tài khoản trước khi chạy. Không gửi key qua chat.
3. Người quản trị tự đặt `OPENAI_API_KEY` trong protected environment và vars `MAGIC_CODEX_MODEL`, `MAGIC_CODEX_VERSION`; xác minh GitHub token được tạo nhánh/Draft PR, Actions minutes và artifact storage có trong mức đã duyệt.
4. Sau kiểm tra thực tế, chỉnh 5 flags trong readiness thành true qua review. Chuyển template vào `.github/workflows` chỉ sau khi đã được phép. Chạy manual một lượt, xem artifacts/PR và kiểm tra claims/retry. Template chưa được xác thực end-to-end trên GitHub nên không gọi là sẵn sàng production.
5. Chỉ thêm lịch sau khi manual run đạt và quyền/chi phí cho **lịch định kỳ** được duyệt. Không tự mở vòng tiếp theo nếu còn PR cùng task. Task done cập nhật queue qua review/merge được con người chấp thuận; không auto-merge.

## Khôi phục và dừng

- Giữ readiness false hoặc disable workflow ở GitHub để dừng lượt sau; cancel job hiện hành qua Actions nếu cần. Không xóa tiến độ cũ.
- Run thất bại lưu `work/autonomy` (plan/last-message nếu có) và `test-results` dưới artifact 7 ngày; mở log và PROGRESS trước khi retry. Tăng retention chỉ sau kiểm tra quota.
- Không thêm secrets vào prompt/log/artifact. Workflow chưa được cấp quyền Vercel và không deploy Preview/Production. Quyền Vercel dự án hiện trả 403; giải quyết membership/scope bằng tài khoản quản trị, không đổi audience để né chặn.

Nguồn chính thức đã đọc: https://github.com/openai/codex-action và tài liệu runtime Vercel. Các placeholder auth/model/cost cố ý chưa điền; đây là bàn giao cấu hình để duyệt, không phải hệ thống đang tự chạy liên tục.
