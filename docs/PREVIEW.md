# Chạy và xem bản cập nhật Thảo

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
