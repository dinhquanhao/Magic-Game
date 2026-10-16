# Magic-Game — nguyên tắc phát triển

- Tiếp tục repository hiện tại; không dựng lại dự án. Đọc `ROADMAP.md`, `PROGRESS.md`, README và mã thực tế trước khi chọn việc tiếp theo.
- Giữ 15 hệ, 23 ID/tên tuyệt kỹ, hình thái và thiết kế cốt lõi. Cải tiến kỹ thuật không được xóa hệ hoặc thay thế tuyệt kỹ bằng hiệu ứng chung.
- `UPGRADE_PROGRESS.md` là tài liệu lịch sử, giữ nguyên. Tiến độ mới ghi trong `PROGRESS.md` với commit và bằng chứng kiểm thử.
- Thứ tự được người dùng cập nhật: hoàn thiện nâng cấp cũ → 15 hệ → nhân vật → quái/Boss → cảnh vật → gameplay → đánh giá tổng thể. Chỉ chuyển giai đoạn khi đạt điều kiện của roadmap.
- Chủ động xử lý kỹ thuật thông thường. Không yêu cầu người dùng gửi “tiếp tục” giữa các bước. Nếu thiếu quyền hoặc bị giới hạn môi trường, nêu rõ hành động bị chặn và phần đã hoàn tất.
- Một renderer, một vòng cập nhật, một đồng hồ mô phỏng. Pause, slow motion, hit-stop, gió và UI tiến trình phải đồng bộ. Module mới có API cập nhật/reset/dispose rõ ràng.
- Giới hạn particle, instance, đèn và hậu kỳ theo preset. Giữ cài đặt người chơi khi tự giảm tải. Không tuyên bố FPS/GPU/VRAM nếu chưa đo đúng phương pháp.
- Mỗi nhóm thay đổi: build, kiểm thử phù hợp, Playwright và thu console/WebGL/shader; sửa tối đa 3 vòng. Không gọi build thành công là bằng chứng shader đã chạy đúng.
- Kiểm thử dài chạy trên server không HMR, không sửa nguồn đang được kiểm thử. Giữ log/ảnh trong `work/`; lưu bằng chứng bàn giao chọn lọc tại `docs/evidence/`. Không commit `node_modules`, `dist`, bí mật hoặc log thừa.
- Khi gần giới hạn tác vụ: commit checkpoint, ghi rõ kiểm thử đạt/chưa đạt và bước kế tiếp; tạo Pull Request. Không merge hoặc bật auto-merge vào `main`.

## Lệnh

```sh
npm install
npm run dev
npm run build
npm test
python -m pip install -r tests/requirements.txt
npm run test:e2e
```

Kiểm thử browser dùng Chromium hệ thống nếu có, hoặc browser của Playwright. Có thể chọn executable qua `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Xem `tests/playwright_smoke.py --help`; kiểm thử production dùng `--production --url http://127.0.0.1:4173/` sau khi chạy preview.
