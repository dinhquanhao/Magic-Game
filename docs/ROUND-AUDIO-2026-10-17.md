# Vòng phát triển audio và assets — 2026-10-17

Nền đã kiểm chứng: `d433860` trên Draft PR #1. `npm test` và build nền đạt; không làm lại shader/AOE đã xác nhận. Trước vòng: ảnh startup/Water cùng viewport 1280×800, Low, camera Showcase, rune tắt tại `work/audio-round/before/`. VFX có randomness nên không dùng pixel diff như một phép đo chất lượng.

## Xếp hạng ý tưởng

Giá trị/khả năng kiểm thử: 1 thấp → 5 cao. Độ khó/rủi ro: 1 thấp → 5 cao. Tối đa ba nhóm được chọn cho vòng này.

| # | Ý tưởng | Giá trị | Khó | Rủi ro | Test | Quyết định |
|---|---|---:|---:|---:|---:|---|
| 1 | WAV 7 lớp × 15 hệ, timeline/pause/spatial/cache và bản nghe | 5 | 4 | 3 | 5 | Chọn: thiếu hoàn toàn, yêu cầu ưu tiên mới |
| 2 | SVG bản sắc 15 hệ trên UI hiện có | 4 | 2 | 1 | 5 | Chọn: nhỏ, dùng ngay, không đổi skill |
| 3 | Bộ điều phối chính thức có khóa task, readiness gate và PR; chưa kích hoạt | 5 | 3 | 3 | 4 | Chọn: chuẩn bị tự nối tiến độ an toàn |
| 4 | Chuẩn hóa exposure/contrast của 23 impact | 5 | 4 | 3 | 4 | Vòng kế tiếp GĐ1 |
| 5 | Ground decal mờ dần theo nguyên tố | 4 | 3 | 3 | 4 | Sau đánh giá exposure |
| 6 | Rune tower batching theo material | 4 | 4 | 3 | 3 | Cần profile native GPU |
| 7 | Biến thể audio riêng từng skill, nhạc và sound mix | 4 | 3 | 2 | 3 | Sau nghe 15 bản sắc hiện tại |
| 8 | HP/hurt/death cho pháp sư và footsteps | 5 | 4 | 4 | 5 | GĐ2 sau điều kiện VFX |
| 9 | Enemy AI báo đòn/né/nhận damage, âm nhận đòn | 5 | 5 | 4 | 5 | GĐ3 |
| 10 | LOD/collision thế giới procedural có đường khám phá | 4 | 5 | 4 | 4 | GĐ4 |
| 11 | Cắt module tải đầu và codec audio nén | 3 | 3 | 3 | 5 | Sau đo mạng/thời gian decode thực |
| 12 | Kiểm toán font offline và provenance assets | 3 | 2 | 2 | 5 | Trước phân phối bản offline |

## Preview và quyền

Vercel list-projects tìm được `magic-game-preview`, ID `prj_SogYwP11iwLpWKXDOIMjvnvGDbXj`, account/team `team_S4V3Fy3sL4ltpS8COOP3140I`. get-project và list-deployments với đúng scope trả HTTP 403, tài khoản scope `quuanghh2007-5227` không được phép. Không có Vercel CLI đã xác thực khả dụng. Chưa xác minh URL/commit/environment/audience của deployment, chưa deploy hoặc đổi quyền. Đây là giới hạn quyền của connector, không phải Live Preview hoạt động. Không có Production deployment hoặc API trả phí được gọi.

## Kết quả và giới hạn

- `npm test`: toàn bộ nhóm kiểm thử đạt (WAV/timeline, planner gate/claim, lifecycle Three.js, AOE). Bản test planner ban đầu dùng subprocess bị sandbox chặn EPERM, chạy bằng quyền thực thi được cấp đã đạt; bản cuối tách hàm lập kế hoạch để test không cần subprocess và tiếp tục hợp lệ khi readiness được duyệt về sau. Không có auto-review rejection.
- Build cuối đạt: 52 modules, app 383.45 kB, Three core 535.18 kB. Cảnh báo chunk >500 kB vẫn còn.
- [Matrix cuối](evidence/audio/matrix.json): 23/23 skill, mỗi skill đủ 7 cue duy nhất; không JS/WebGL/shader error. PCM mẫu đang phát có peak 0.02959, RMS 0.00998; đây là một mẫu tại thời điểm kiểm tra, không phải peak toàn game. Cache 3 bank khoảng 3.73 MB PCM ở fixture; giới hạn 10 voice + ambient.
- [Lifecycle](evidence/audio/lifecycle.json): hit-stop rate=0, resume .35, WebGL loss/restore, rapid select/abort, 10 recast/stop và unlock muộn đều đạt. Voice/cache được giới hạn; chưa chứng minh tổng heap trình duyệt không rò rỉ bằng profiler dài hạn.
- [Production](evidence/audio/production-final.json) đạt UI 15 hệ, chọn/cast, Play/MP/pause. [Lượt ghi video](evidence/audio/production-results.json) bật âm qua UI thật và ghi 76.3 giây; video không có audio track. Audio browser thu riêng qua MediaStreamDestination/WebAudio, có Opus/WebM và MP3.
- [Bản nghe 15 hệ](evidence/audio/fifteen-elements.mp3): 75 giây, mỗi hệ 5 giây; cue sequence tham chiếu có gain riêng, peak PCM 0.85/RMS 0.09155 trước encode. Không gọi đây là mix điện ảnh hoặc đánh giá nghệ thuật đã đạt. Chưa nghe trên thiết bị người chơi/đo loudness dài hạn.
- WAV kiểm tra header, duration, peak, RMS, DC, hash khác nhau và đường nối loop. Một số loop có cạnh quá gắt trong kiểm tra đầu; đã taper biên 3 ms và chạy lại đạt. Fixture lifecycle đầu dùng thời điểm 5 giây trước impact thực của Thủy nên nhầm traveling loop thành cue cũ; sửa fixture theo `cinematicPlans` rồi đạt. Các kết quả lỗi cũ vẫn lưu trong work và lifecycle-fixture-failure.json.
- [Cặp ảnh trước/sau](evidence/audio/index.html) dùng cùng viewport, preset, góc máy và mốc thời gian (startup .05s, Water 9.55s), rune tắt. Geometry/particles vẫn có randomness; không dùng pixel diff hoặc tuyên bố VFX đã đẹp hơn từ thay đổi audio/icon. Điểm cháy sáng Water còn rõ và được giữ trong backlog contrast GĐ1.
- Template YAML parse đạt, inputs Codex Action khớp metadata chính thức tại commit đã pin; phát hiện tag v1 là annotated tag nên dùng commit peel `bdf19a4...`, không dùng SHA tag object. Planner offline loại claim mở và dừng khi chưa ready. Chưa thực thi workflow/Codex API trên GitHub.

Giữ riêng đo PCM/cue/lifecycle với đánh giá nghệ thuật. Trình duyệt dùng ANGLE/SwiftShader, không đại diện native GPU. `UPGRADE_PROGRESS.md` giữ nguyên. GĐ1 chưa hoàn tất về thị giác; HP/enemy/Boss/world/gameplay đầy đủ chưa triển khai trong vòng này.


URL Preview được tìm thêm từ Vercel bot trên PR: https://magic-game-preview-git-codex-magic-gam-593430-quuanghh2007-5227.vercel.app . Thử Chromium từ cloud thất bại ngay navigation với `ERR_TUNNEL_CONNECTION_FAILED`; hostname không có trong allowlist mạng. Không đổi policy, không tạo bypass URL, không mở audience. Không tính lượt này là kiểm thử game từ xa đã đạt. [Bằng chứng quyền/kết nối](evidence/audio/vercel-access.json). Branch alias có thể cập nhật qua Git integration sau push; cần đối chiếu status của đúng commit.
