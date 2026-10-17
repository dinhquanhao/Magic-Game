# Chạy và xem Magic-Game — góc nhìn mới

**Mới:4góc camera —3/4,LoL tự do,thứ nhất,orbit360.** Vào **CHẾ ĐỘ CHƠI**, chọn **GÓC NHÌN** ở khung trái hoặc nhấn V khi điều khiển cảnh. LoL dùng chuột giữa/rê mép để pan,C về nhân vật,Y theo dõi; orbit/FPS dùng chuột phải để nhìn. [Ảnh/video và kiểm thử](evidence/camera-modes/README.md). ZIP bên dưới chứa controller mới theo sourceCommit/SHA metadata; hai video WebM nền đất lịch sử được liên kết GitHub để giữ dung lượng gói.


Mốc trước: **Cyber Bot theo ZIP người dùng, giơ hai tay/đứng yên khi cast, rune10s và thời lượng19skill dài2×**. [Ảnh, video và báo cáo model/timing](evidence/character-cast/README.md). ZIP được cập nhật theo sourceCommit/SHA trong metadata gói. Vào **CHẾ ĐỘ CHƠI** để thấy nhân vật; nhấn **E** hoặc nút **THI TRIỂN**, xoay camera bằng chuột phải. Di chuyển/nhảy/lướt được trả lại sau khi skill kết thúc.

Mốc trước: [phù văn19skill mờ dần khi skill xuất hiện — ảnh, video và ma trận kiểm thử](evidence/rune-fade/README.md). ZIP bên dưới được cập nhật theo sourceCommit/SHA trong metadata gói.

Danh mục mới nhất: **15 hệ/19 skill**, Hỏa chỉ còn Thiên Nhật Diệt Thế; dữ liệu skill giữ nguyên, runtime dùng timing mới nêu trên. [Báo cáo đối chiếu trước/sau](evidence/fire-trim/README.md). ZIP bên dưới được đóng gói lại; các báo cáo Thảo/nền đất phía dưới là bằng chứng của checkpoint trước.

- [Nền đất nâu: ảnh trước/sau, video và kiểm thử](evidence/brown-ground/README.md). ZIP bên dưới được cập nhật theo checkpoint ghi trong metadata; dùng bản mới để thấy nền nâu.

- [Draft PR #1 và từng file code](https://github.com/dinhquanhao/Magic-Game/pull/1/files).
- [Báo cáo và tiến độ Thảo](../THAO_PROGRESS.md).
- [Ảnh bốn giai đoạn và kết quả kiểm thử](evidence/thao/index.html). GitHub không chạy HTML; tải source/ZIP rồi mở file này để xem báo cáo.
- [ZIP game/source — Arcane-VFX-Studio-Thao-Update.zip](releases/Arcane-VFX-Studio-Thao-Update.zip). Trên GitHub chọn **Download raw file**. ZIP thật đã được tạo; SHA256, kích thước và commit source nằm trong [metadata gói](releases/thao-package.json).

## Trên Windows

Cài Node.js LTS, tải ZIP, **giải nén toàn bộ**, mở thư mục rồi nhấp `START.bat`. Launcher dùng npm.cmd, ASCII/CRLF. Không mở index.html trực tiếp hoặc chạy START.bat bên trong trình xem ZIP.

Có thể dùng terminal trong thư mục game:

```bat
npm.cmd ci
npm.cmd run dev
```

Mở địa chỉ Vite in trên terminal. Để thử bản build:

```bat
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4173
```

## Thử trực tiếp qua web

[Branch Preview do Vercel bot đăng](https://magic-game-preview-git-codex-magic-gam-593430-quuanghh2007-5227.vercel.app) có thể tự cập nhật theo nhánh PR qua Git integration sẵn có. Nếu Vercel yêu cầu đăng nhập, dùng tài khoản được cấp quyền dự án.

**Chưa xác nhận Live Preview tương tác từ môi trường kiểm thử này.** Lượt kiểm tra trước bị ERR_TUNNEL_CONNECTION_FAILED do hostname ngoài allowlist, connector trả403. Bằng chứng Playwright mới được chạy qua localhost, không tự chứng minh deployment từ xa hoạt động. Không tạo deployment công khai, đổi protection hoặc dùng dịch vụ trả phí.

Nếu giao diện Codex có **Ports / Preview**, có thể chuyển tiếp cổng của server đang chạy; công cụ phiên này chưa xác minh được một URL chia sẻ. `127.0.0.1` của cloud không phải địa chỉ mở từ máy Windows của bạn.

## Tái chạy kiểm thử

```sh
npm ci
npm test
npm run build
python -m pip install -r tests/requirements.txt
npm run dev:test -- --port 5183
# Terminal khác:
python tests/thao_browser.py --url http://127.0.0.1:5183/ --quality Low --stress --integration --output work/thao-local
```

Đổi `--quality` thành Medium/High/Ultra để kiểm tra từng preset. Browser test dùng Chromium và SwiftShader; số đo không phải FPS GPU của máy người chơi. Hook kiểm thử chỉ được chèn qua route Playwright, không phát hành trong game.

Bằng chứng lịch sử của các hệ còn lại: [so sánh trước/sau bloom](evidence/contrast/index.html), [báo cáo tiếp nối](DEVELOPMENT-RESUMED-2026-10-17.md). Không đổi nhãn ảnh/số đo lịch sử thành kết quả Thảo. Các ZIP/audio tổng hợp có chứa hệ đã gỡ đã được bỏ theo yêu cầu mới; bản cũ còn trong lịch sử Git.
