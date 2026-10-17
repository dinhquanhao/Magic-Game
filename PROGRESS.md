# Tiến độ Magic-Game


## Mới nhất — sửa START.bat theo lỗi Windows người dùng báo

- Phản hồi mới: CMD cắt đầu lệnh/chạy các mảnh tiếng Việt như lệnh. File cũ UTF-8 (235 byte ngoài ASCII), LF-only41dòng, có PowerShell dò cổng. Đổi START.bat sang ASCII/CRLF, git attribute giữ nguyên byte trong clone/ZIP; gọi npm.cmd ci và Vite --open tại127.0.0.1, kiểm tra Node/npm/version và thư mục giải nén.
- Đây là ngoại lệ mới được yêu cầu qua báo lỗi khởi chạy: START.bat được sửa có chủ đích; các ghi chú giữ nguyên/hash cũ ở lượt trước là lịch sử. Không đổi mã game/registry/timeline/15hệ/23skill, không mở nhóm nâng cấp AAA mới.
- Build PASS62modules, unit7nhóm PASS gồm guard byte-format launcher. Lệnh dev của launcher chạy được trên Linux; Chromium chọn/cast/Play/MP/pause PASS, 0 console error. Chưa chạy cmd.exe/nhấp đúp trên Windows thật vì môi trường chỉ có Linux và không có Wine/Windows runner. Chi tiết docs/evidence/windows-launcher/verification.json.
- README/START_HERE có hướng dẫn Node LTS, giải nén toàn bộ và npm.cmd cho CMD/PowerShell. Không merge main hoặc kích hoạt workflow/dịch vụ trả phí.


## Mới nhất — tiếp nối sau dừng, 17/10/2026

- Đã nhận yêu cầu tiếp tục. Bảo toàn WIP tại ce73729, audio fix tại 1a6cb41 đã push vào Draft PR #1. Không merge main/Production/scheduler/API trả phí.
- Audio: sửa Low nhận14 active voice thay vì8 trong burst; sau sửa8/8. 23/23 finale/cleanup,4preset,pause/rate/mute/rapid selection đạt. Lượt harness tổng dừng ở lỗi fixture audioLab không expose (giữ FAIL raw); fixture đã sửa và UI Lab riêng PASS nghe mới/A–B/assets/dừng. Xem docs/evidence/audio-v3/summary.json. 833 artifact mirror khớp hash, Lab hiện measurement/PASS/FAIL. 224/225 cue đạt; lightning/impact FAIL sau5vòng; 23 reference mixes đạt. Chưa kiểm chứng bằng tai.
- VFX: sau3vòng sửa bloom, Low23/23impact PASS; Medium/High/Ultra mỗi preset4ca đại diện PASS, không JS/WebGL/shader errors. Không lẫn pixel UI trong số đo. Hỏa-01 trắng73.28%→14.65%, Ánh Sáng44.56%→3.90%; Thủy khôi phục chi tiết mặt triều. Lôi vẫn flash rộng. Không gọi đây là đánh giá nghệ thuật đầy đủ mọi phase/preset.
- Production UI chọn/cast/Play/MP/pause và bật audio PASS, không console error; video mới ở docs/evidence/resumed-production. Video không audio track, bản thu Lab riêng tại docs/evidence/audio-v3. Build PASS62modules, unit6nhóm PASS. Còn cảnh báo chunk Three >500kB. Hash registry/plans/START.bat không đổi.
- Tải ảnh/ZIP so sánh tại docs/PREVIEW.md; báo cáo chi tiết docs/DEVELOPMENT-RESUMED-2026-10-17.md. 12ý tưởng có xếp hạng ở docs/ROUND-RESUME-2026-10-17.md. Không tuyên bố Live Preview tương tác hoạt động.
- Việc tiếp theo theo ưu tiên: tích hợp/compile PBR procedural và SH probes từ src/graphics/aaa (hiện chưa dùng), kiểm tra seam/normal/interpolation/lifecycle; sau đó flash/aftermath toàn hệ, rồi HP/AI/Boss/world theo roadmap. GĐ1 chưa khép; không tự đánh dấu GĐ2–5 hoàn thành. Nhóm bloom đã hết3vòng, không tiếp tục sửa vô hạn.

Các mục phía dưới là lịch sử; mô tả audio v1/105WAV không còn là trạng thái engine mới.

## Cập nhật mới nhất — vòng audio/assets 17/10/2026 (Asia/Bangkok)

- Tiếp nối `d433860`, bảo toàn toàn bộ checkpoint cũ trên `codex/magic-game-stability-vfx-20261017` / Draft PR #1. Không merge main, không Production, không bật paid API hoặc scheduler.
- Đã đọc hai yêu cầu bổ sung, README/roadmap/history/code/PR. [12 ý tưởng có xếp hạng](docs/ROUND-AUDIO-2026-10-17.md), chọn 3 nhóm: âm thanh phân lớp, SVG nguyên tố, bộ điều phối chưa kích hoạt.
- Tạo **105 WAV (7 cue × 15 hệ) + 1 ambient WAV**, manifest có peak/RMS/hash/provenance và scripts tái tạo. Không dùng sample/model/dịch vụ trả phí. Audio mặc định tắt, unlock gesture, master/mute/nền gió, 3D listener/panner, timeline pause/hit-stop/slow motion; cap 10 voice + ambient, cache 3 bank, hủy tải lỗi thời, fallback và dispose.
- Tạo SVG sprite 15 ký hiệu dùng ngay trên thanh hệ/skill, giữ nhãn/ID/tên/thiết kế 15 hệ/23 skill. [ASSET_INVENTORY.md](ASSET_INVENTORY.md) ghi cả assets thiếu/yếu và nguồn chưa kiểm toán; không đổi license repository. UPGRADE_PROGRESS.md giữ nguyên.
- Kiểm thử cuối: npm test đạt, build đạt (52 modules; app 383.45 kB; Three core 535.18 kB còn cảnh báo chunk). [23/23 skill đủ 7 cue, không JS/WebGL/shader error](docs/evidence/audio/matrix.json). [Hit-stop, pause/resume, context loss/restore, 10 recast, rapid select và late unlock](docs/evidence/audio/lifecycle.json) đạt. Có kiểm tra PCM đang phát, master=0 im lặng, suy giảm theo khoảng cách, ambient và fallback khi decode lỗi. Không suy đo tổng heap/native GPU hoặc chất lượng nghệ thuật từ các kiểm tra này.
- [Production cuối](docs/evidence/audio/production-final.json) đạt chọn/cast/Play/MP/pause. [Ảnh, video 76.3 giây, bản nghe 15 hệ 75 giây, audio Chromium và ZIP](docs/PREVIEW.md). Video Playwright không có audio track; audio thu riêng. Cặp ảnh trước/sau cùng camera/preset/mốc mô phỏng, còn randomness của particle. Water vẫn quá sáng — chưa đánh dấu hoàn thiện thị giác.
- Đã sửa cạnh nối loop sau kiểm tra WAV đầu. Fixture lifecycle đầu nhầm mốc impact Thủy; đã sửa theo plan thực và test lại đạt. Log lỗi cũ giữ trong work và evidence. Không chạy vòng sửa vô hạn; nhóm audio hoàn tất trong 2 vòng browser/fixture.
- [Điều phối](automation/README.md): queue/prompt/planner offline và template chính thức Codex Action pin commit, concurrency, nhánh riêng, Draft PR, kiểm thử/artifacts. YAML/input đã đối chiếu offline, planner tránh task có claim mở và gate false. **Chưa cài workflow, chưa bật lịch, chưa gọi Codex API trả phí**; cần xác minh auth/quyền, protected environment, usage/chi phí và phê duyệt trước khi kích hoạt. Template chưa được chạy end-to-end trên GitHub.
- Vercel: GitHub bot có Preview URL và status success của checkpoint cũ; connector project/team trả 403. Chromium mở branch alias bị ERR_TUNNEL_CONNECTION_FAILED do hostname ngoài allowlist. [Bằng chứng](docs/evidence/audio/vercel-access.json). Không thay policy/audience hoặc tạo bypass link. Chưa xác nhận Live Preview tương tác hay test remote của mã audio mới. Các ghi chú “chưa kết nối Vercel” bên dưới là lịch sử trước lần xác minh này.

### Đầu vào tiếp nối

1. Task `stage1-contrast-matrix`: chuẩn hóa exposure/contrast của 23 impact theo camera cố định, ưu tiên Water; giữ hình thái/registry. Đọc ảnh/evidence và ROADMAP trước khi chọn tối đa 3 nhóm của vòng mới.
2. Nghe và mix 15 bản sắc trên thiết bị thật, thêm biến thể theo skill nếu có ích; tối ưu codec sau đo tải/giải mã. Music/UI/footsteps/enemy audio chưa được tạo, vì gameplay tương ứng còn ở GĐ2–5.
3. GĐ1 chưa đạt toàn bộ thị giác; chưa bắt đầu HP/enemy/Boss/world/gameplay mới. Giữ pháp sư, animation, MP và training dummy hiện hữu.
4. Dùng `automation/next-round-prompt.md` và tasks.json để tiếp nối. Không tự bật readiness/schedule hoặc vượt quyền Preview. Giải quyết quyền Vercel và allowlist riêng trước kiểm thử remote.


## Trạng thái hiện tại — 17/10/2026

- Nhánh: `codex/magic-game-stability-vfx-20261017`, nền `1a3fe3d` (`main`). Không merge/auto-merge.
- Checkpoint bảo toàn lượt đang chạy: `d2e80eb` — sửa shader, tiến trình cast, ngân sách VFX và bộ kiểm thử.
- Yêu cầu mới thay thế quy định tạm dừng nâng cấp cũ. Đã đọc toàn bộ README, `UPGRADE_PROGRESS.md` và đối chiếu mã nguồn. Giữ nguyên tài liệu lịch sử.
- Giai đoạn 0 đã khép phần nâng cấp lịch sử trong phạm vi engine; Giai đoạn 1 đang thực hiện và được lưu tại checkpoint. Các giai đoạn 2–5 chưa được tuyên bố hoàn thành; pháp sư 3D/animation/MP và training dummy đã có từ mã nền.

## Phát hiện và thay đổi

1. Build nền thành công nhưng WebGL báo shader lỗi ở 8 skill: FIRE-01/02/03, WATER-01, LIGHT-01, SHADOW-01, LIGHTNING-01, BLOOD-01. Đã sửa chỉ thị shader Hỏa thiếu xuống dòng, từ khóa GLSL `active`, màu shader Bóng Tối chưa khai báo, `instanceColor` khai báo trùng; đóng gói attribute Huyết/Lôi để chạy trong giới hạn WebGL2.
2. Tách ID lớp chớp khỏi thanh điều chỉnh `impactFlash`; thêm favicon tránh 404. Sửa phép tính alpha có thể dùng `sin(Infinity)` trước impact.
3. Thêm tiến trình cast màu nguyên tố, đồng bộ charge/channel/active/aftermath, pause và simulation time.
4. Bỏ tham chiếu mạnh đến vật liệu sau dispose; dọn geometry/material chia sẻ một lần và dispose buffer InstancedMesh. Hết timeline sẽ dọn mọi cast; auto-repeat áp dụng cả skill dài.
5. Watchdog dùng hệ số ngân sách runtime riêng, không ghi đè density/debris slider; không tự giảm tải khi adaptive tắt. F3 hiển thị số vật liệu và hệ số ngân sách.
6. Giai đoạn 0 bổ sung: gió dùng chung cho point-shader custom; cỏ dùng simulation time khi pause; Light Injection dùng vị trí nguồn sáng trong world space và đúng dấu view space; tái tạo PMREM sau context restore.

## Bằng chứng kiểm thử đã lưu

| Lượt | Kết quả | Bằng chứng |
|---|---|---|
| Baseline | Build đạt; 15 hệ/23 skill; 53 thông báo compile shader và 296 console/WebGL thông báo trong mẫu 69 mốc | `work/baseline/skills.json`, `shader-errors.json`, ảnh baseline |
| Vòng 1 | 22/23 skill không lỗi ở Low; Lôi lộ thêm lỗi vượt attribute sau khi sửa cú pháp; đã sửa | `work/round1/results.json` |
| Vòng 2 ban đầu | 23/23 Low đạt; High đạt đến Lôi; lượt bị gián đoạn do HMR khi cập nhật mã | `work/round2/results.json`; không tính là full pass |
| GĐ0 vòng 1 | 23/23 Low và 23/23 High, 4 preset, control, mana, 10 cast đạt; fixture restore context cần sửa | [matrix](docs/evidence/stage0-matrix.json) |
| GĐ0 vòng 2 | Context loss/restore đạt, PMREM được tái tạo, camera Showcase an toàn | [context](docs/evidence/context-recovery.json) |
| GĐ1 vòng 1 | 23/23 skill × AOE 120/350 m, cast lệch tâm; VFX/reticle/cast khớp | [AOE](docs/evidence/aoe-matrix.json) |
| Production cuối | Bundle thực, chọn hệ/skill, Play, cast, MP và pause đạt; không console error | [production](docs/evidence/production.json) |

`npm test` đạt kiểm tra giải phóng shared resources và buffer instance. Build cuối đạt (51 modules); cảnh báo cũ Three core 535.18 kB vẫn còn. Log/ảnh chọn lọc đã lưu tại `docs/evidence/`; xem [báo cáo bàn giao](docs/DEVELOPMENT-2026-10-17.md).

## Đối chiếu nâng cấp cũ

- A: SSR/GTAO/SSAO/DoF, OutputPass, PBR, adaptive và F3 đã có trong mã; đã kiểm thử WebGL qua Chromium/SwiftShader, gồm 4 preset và context recovery.
- B/C: hình thái Thủy/Thổ/Phong và các module riêng đã có. Phần thiếu chính là shader thực thi, trường gió dùng chung và kiểm chứng lifecycle; đã bổ sung gió point shader và kiểm thử shader/lifecycle.
- D: Nham/Tinh Tú đã có vật liệu và chuyển động từ bản tạm dừng; không dựng lại. Cả 9 skill Low/High đạt. Đánh giá thị giác có hệ thống tiếp tục ở GĐ1.
- E: registry/ID/tên giữ nguyên so với main; build, audit, tài liệu và bằng chứng đã lưu. `dist/` sinh bằng build, không commit.
- Các xấp xỉ analytic về nước/khói/gió, SSS, GI và lensing vẫn được công khai; chưa có ray tracing, FFT fluid hay solver vật lý tổng quát.

## Việc tiếp theo

1. GĐ1: chuẩn hóa góc máy/exposure và ảnh cho đủ 23 skill, xử lý vùng cháy sáng/thiếu tương phản. Shader đã biên dịch nhưng chưa gọi là hoàn thiện thị giác toàn bộ game.
2. AOE đã sửa: một nguồn bán kính, không nhân tỷ lệ hai lần; test bounds 120/350 m và cast lệch tâm đạt cho cả 23 skill. Giữ bán kính cast khi thay slider trong lúc đang thi triển.
3. GĐ2–5 chưa bắt đầu trong lượt này. Sau khi GĐ1 đạt, hoàn thiện HP/MP/trạng thái chiến đấu của pháp sư sẵn có, rồi enemy/Boss, cảnh vật và vòng gameplay theo roadmap.
4. Checkpoint đã push; [Draft PR #1](https://github.com/dinhquanhao/Magic-Game/pull/1), không merge main. Mã nguồn, log cũ và ảnh trong `work/` được bảo toàn; bằng chứng bàn giao có trong repository.

## Giới hạn môi trường

- Chromium dùng ANGLE/SwiftShader (WebGL chạy bằng phần mềm), có compile/render thực; không đại diện FPS hoặc driver trên GPU người chơi.
- Terminal mặc định chặn mở localhost/kết nối proxy; chạy server/browser và Git qua quyền thực thi đã được công cụ cấp. Không có auto-review rejection còn tồn đọng.
- Chưa có kết quả kiểm thử native GPU. Không dùng số frame cost của SwiftShader làm tuyên bố tối ưu GPU thực.

## Hệ thống quan sát — yêu cầu bổ sung

- Đã kiểm tra Git sạch sau checkpoint `04f8452`, push nhánh riêng và mở Draft PR #1. Hai commit mã nguồn quan trọng (`d2e80eb`, `04f8452`) đã ở GitHub; lịch sử và toàn bộ bản ghi cũ trong work/ được giữ lại.
- Thêm `npm run observe`: tự build, mở Vite preview riêng + Chromium, thao tác UI production, chụp ảnh, ghi WebM, lưu console/result theo label/commit/timestamp; dọn nhóm tiến trình server sau chạy. Đã chạy thành công và xác nhận cổng 4180 được giải phóng.
- Đã có video MP4/WebM, ảnh startup/skill/Play Mode và ZIP offline trong `docs/evidence/observation/`. [Hướng dẫn xem code/game/artifacts](docs/PREVIEW.md).
- Live Preview tương tác cho người dùng **chưa được xác nhận**. Localhost chỉ đã được truy cập từ Playwright bên trong cloud. Không cung cấp localhost như một URL web công khai.
- Chuẩn bị `vercel.json` và `.vercelignore`; chưa kết nối tài khoản, chưa deploy, chưa dùng dịch vụ trả phí. Cần phê duyệt trước khi triển khai công khai hoặc phát sinh phí.
- Thứ tự tiếp tục giữ nguyên: hoàn thiện đánh giá VFX GĐ1 trước nhân vật/HP, enemy/Boss và thế giới. Do giới hạn lượt chạy, lưu checkpoint quan sát trước khi mở thêm nhóm nâng cấp lớn; nhiệm vụ kế tiếp là chuẩn hóa góc máy/exposure và ghi đủ mốc thị giác của 23 skill.


## Tiếp nối sau lệnh dừng — 17/10/2026

- Đã nhận yêu cầu tiếp tục, giữ nguyên toàn bộ WIP và ZIP bàn giao. Build baseline hiện tại đạt (61 modules), 5 nhóm unit đạt. Các kết quả browser mới chưa được xác nhận.
- Xếp hạng 12 ý tưởng tại work/ROUND-RESUME-2026-10-17.md; chọn hồi quy audio, đồng bộ assets Lab, cân bằng độ sáng VFX. Không bắt đầu lại game hoặc vượt gate roadmap.
- Checkpoint bảo toàn dưới đây chứa WIP chưa browser-test cuối; hai module AAA chưa tích hợp.

### Audio tiếp nối — nhóm 1–2 đã kiểm chứng

- Checkpoint bảo toàn WIP: ce73729. Sửa lỗi Low nhận 14 voice hoạt động thay vì 8 trong burst: chỉ lấy voice đang được nhận vào pool làm victim, không lấy voice đang fade đã nhường slot; giảm preset/adaptive cũng thực thi budget. Ca tái hiện sau sửa giữ 8/8 active; fade-tail được ghi riêng, không tính là voice mới.
- 23/23 finale phát đúng một impact và cleanup nguồn về 0, bốn preset, pause/rate/mute, rapid selection đạt; không JS error. Lượt harness tổng cuối dừng ở lỗi fixture audioLab chưa expose, không gọi toàn harness là PASS. Đã sửa route fixture và test riêng Lab đạt nghe mới/A–B/assets/dừng. Evidence: docs/evidence/audio-v3/summary.json và raw engine-and-fixture.json/lab.json.
- 833 WAV/PNG phục vụ Lab khớp hash với nguồn. Thêm audio:render/audio:report/audio:test; report xuất measurement manifest và Lab hiển thị số đo/PASS/FAIL. Không render lại hoặc kéo dài vòng hiệu chỉnh cue: lightning/impact vẫn FAIL sau 5 vòng; 224/225 PASS, 23/23 reference mixes PASS, chưa kiểm chứng bằng tai.
- Build đạt 61 modules; npm test đạt 6 nhóm gồm score thật 23 skill. Cảnh báo chunk Three >500kB còn nguyên. Asset inventory audio v1 bên dưới và PROGRESS cũ là lịch sử, được thay thế bằng mục này cho audio hiện tại.
- Các lỗi fixture và thử nghiệm chưa đạt được giữ trong work/audio-resume; historical stage-a/results.json được phục hồi sau khi lưu kết quả rerun fixture cũ riêng.

### Bằng chứng đóng nhóm bloom

- Bộ so sánh docs/evidence/contrast/index.html hiện giữ20cặp ảnh lịch sử của các skill còn lại; ZIP hỗn hợp cũ đã gỡ theo yêu cầu thay hệ cuối. Video production mới dài89.48giây, không audio track.
- Planner offline vẫn activated=false; task contrast được đề xuất done trong Draft PR, thêm queue AAA materials/probes và review flash/aftermath. Không kích hoạt readiness hoặc scheduler.
