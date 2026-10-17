# Magic-Game — nguyên tắc phát triển

- Yêu cầu camera18/10: thêm3/4 (mặc định),LoL tự do,thứ nhất vàorbit360, giữTheoSau. Camera yaw/pitch/pan độc lập actor; WASD theo hướng nhìn, giữ khóa vị trí/hai tay khi cast. LoL pan mép/chuột giữa, C về nhân vật, Y follow, V chuyển view; ray trỏ chuột3/4/LoL. First person ẩn thân chống che mắt. Camera quan sát được khi pause nhưng đồng hồ/pose VFX phải đứng yên. Không đổi19skill/model/timing/audio/nền; không mở HP/Boss/AAA khác.

- Ngoại lệ mới nhất theo yêu cầu người dùng17/10: thay model bằng Cyber Bot trong ZIP tải lên; giữ nhân vật đứng yên/giơ hai tay suốt charging/channeling/active. Mặc định tổng vẽ+hội tụ10giây (8,5+1,5), active của19skill chạy0,5× để kéo dài2×. Giữ marker/cấu hình nội bộ, MP/cooldown; UI/audio đồng bộ playback. Fade rune vẫn1,8giây simulation từ khi hiệu ứng hiển thị. Đây là phạm vi được người dùng chọn, thay thế điều cấm đổi model/timing cũ; không mở các nhóm AAA/HP/Boss khác.

- Tiếp tục repository hiện tại; không dựng lại dự án. Đọc `ROADMAP.md`, `PROGRESS.md`, README và mã thực tế trước khi chọn việc tiếp theo.
- Registry hiện tại có 15 hệ/19 skill. Theo yêu cầu thu gọn Hỏa ngày 17/10, Hỏa chỉ còn FIRE-01 — Thiên Nhật Diệt Thế. Giữ nguyên toàn bộ 19 skill còn lại, gồm 18 skill ngoài Hỏa: ID/tên/mô tả, cấu hình, cinematic, rune, MP/cooldown và audio. Các seed tạo hình phải gắn với ID ổn định, không đổi theo vị trí UI. Không xóa thêm hệ/skill hoặc thay tuyệt kỹ bằng hiệu ứng chung.
- Ngoại lệ hình ảnh theo yêu cầu mới: phù văn chung của cả19skill mờ dần trong1,8giây mô phỏng từ khi hiệu ứng skill được bật hiển thị. Giữ hình vẽ lúc charging/channeling, không đổi skill/cinematic/audio/MP/cooldown. Skill xuất hiện trễ phải chờ nhóm hiệu ứng thật, không dùng placeholder trống; pause/hit-stop/slow motion và recast dùng cùng timeline. Phù văn đã ẩn không hiện lại ở impact/toggle.
- `UPGRADE_PROGRESS.md`: giữ lịch sử của các hệ còn lại; yêu cầu Thảo cho phép gỡ nội dung/asset của hệ đã thay khỏi mọi tài liệu hiện tại; theo yêu cầu bổ sung ngày 17/10 chỉ append mục “Bổ sung AAA” với bằng chứng mới. Tiến độ mới ghi trong `PROGRESS.md` với commit và bằng chứng kiểm thử.
- Thứ tự được người dùng cập nhật: hoàn thiện nâng cấp cũ → 15 hệ → nhân vật → quái/Boss → cảnh vật → gameplay → đánh giá tổng thể. Chỉ chuyển giai đoạn khi đạt điều kiện của roadmap.
- Chủ động xử lý kỹ thuật thông thường. Không yêu cầu người dùng gửi “tiếp tục” giữa các bước. Nếu thiếu quyền hoặc bị giới hạn môi trường, nêu rõ hành động bị chặn và phần đã hoàn tất.
- Một renderer, một vòng cập nhật, một đồng hồ mô phỏng. Pause, slow motion, hit-stop, gió và UI tiến trình phải đồng bộ. Module mới có API cập nhật/reset/dispose rõ ràng.
- Giới hạn particle, instance, đèn và hậu kỳ theo preset. Giữ cài đặt người chơi khi tự giảm tải. Không tuyên bố FPS/GPU/VRAM nếu chưa đo đúng phương pháp.
- Mỗi nhóm thay đổi: build, kiểm thử phù hợp, Playwright và thu console/WebGL/shader; sửa tối đa 3 vòng. Không gọi build thành công là bằng chứng shader đã chạy đúng.
- Kiểm thử dài chạy trên server không HMR, không sửa nguồn đang được kiểm thử. Giữ log/ảnh trong `work/`; lưu bằng chứng bàn giao chọn lọc tại `docs/evidence/`. Không commit `node_modules`, `dist`, bí mật hoặc log thừa.
- Khi gần giới hạn tác vụ: commit checkpoint, ghi rõ kiểm thử đạt/chưa đạt và bước kế tiếp; tạo Pull Request. Không merge hoặc bật auto-merge vào `main`.
- Trước/sau mỗi nhóm nâng cấp, dùng `npm run observe -- --label before-<group>` / `after-<group>` để lưu ảnh/video khi có encoder, cùng console/result. Cập nhật PROGRESS và push cùng nhánh Draft PR sau nhóm. Không gọi bản ghi Playwright là Live Preview; không deploy công khai/dùng dịch vụ trả phí khi chưa được phê duyệt.

## Lệnh

```sh
npm install
npm run dev
npm run build
npm test
python -m pip install -r tests/requirements.txt
npm run test:e2e
npm run observe -- --label after-feature
```

Kiểm thử browser dùng Chromium hệ thống nếu có, hoặc browser của Playwright. Có thể chọn executable qua `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Xem `tests/playwright_smoke.py --help`; kiểm thử production dùng `--production --url http://127.0.0.1:4173/` sau khi chạy preview.

## Audio, assets và điều phối

- Đọc ASSET_INVENTORY.md trước khi tạo assets; ưu tiên tài nguyên được dùng ngay, không thay asset tốt bằng placeholder. Không nhập sample/font/model không rõ nguồn hoặc tự đổi license repository.
- Audio chỉ unlock qua gesture. Dùng timeline mô phỏng, giới hạn voice/cache, master/mute và cleanup; kiểm thử WebAudio thật, pause/hit-stop/slow motion, fallback và context loss. Không suy chất lượng nghệ thuật từ peak/RMS.
- Đầu mỗi vòng: xếp hạng ít nhất 10 ý tưởng theo giá trị/khó/rủi ro/test, chọn tối đa 3. Ghi task/acceptance và bằng chứng đã chạy, phần chưa làm, bước tiếp trong PROGRESS và inventory.
- automation/templates là cấu hình chưa kích hoạt. Không bật readiness, cài workflow, lịch, tạo key hoặc gọi API trả phí trước khi quyền/auth/hạn mức/chi phí được xác minh và người dùng chấp thuận. Không tự sửa các gate này trong task do scheduler giao.
- Kiểm tra claim trong automation/tasks.json và marker open PR; không sửa trùng task/nhánh đang có người khác làm. Workflow dùng concurrency group chung, không thay thế khóa giữa các tác vụ thủ công.

## Yêu cầu đồ họa bổ sung 17/10

Ưu tiên nghiệm thu trình tự rune→COMMIT→skill và fade1.8giây toàn19skill trước nền đồ họa chung/từng hệ. Giữ các tham số/cinematic nội bộ; chỉ thay gate và thời điểm bắt đầu. UPGRADE_PROGRESS ghi audit trước sửa và bằng chứng từng giai đoạn. Mỗi nhóm tối đa3vòng sửa/kiểm thử, lưu checkpoint/PR nếu gần giới hạn tài nguyên.

Cập nhật sau cùng: theo tài liệu11lớp mới nhất, GĐ1 nền tảng chung trước GĐ2 rune; giữ bản khảo sát/gate đã soạn, chỉ chuyển giai đoạn khi đủ kiểm thử. Không bỏ một trong15hệ/19skill khi lập ma trận. Yêu cầu thu gọn Hỏa mới nhất cho phép xóa hai skill Hỏa ngoài FIRE-01; không mở thêm nhóm nâng cấp.
