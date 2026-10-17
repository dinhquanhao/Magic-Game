# Ghi chú danh mục sau thu gọn Hỏa

Danh mục hiện tại có15hệ/19skill. Báo cáo Thảo bên dưới ghi checkpoint trước khi thu gọn Hỏa; số21và các kết quả kiểm thử đó là lịch sử, không phải số skill hiện tại. Các record của hai skill đã gỡ không còn được phân phối. Bằng chứng mới: docs/evidence/fire-trim/README.md.

---

# Trạng thái bàn giao Thảo

Runtime Thảo đã hoàn tất trong phạm vi kiểm thử nêu dưới:15hệ/21skill;20skill khác và START.bat giữ nguyên. Báo cáo tổng hợp ở docs/evidence/thao/verification.json; ảnh/video/console ở docs/evidence/thao/index.html. ZIP thật và checksum do scripts/package_thao.py tạo trong docs/releases. Các mục “đang thực hiện/chưa hoàn tất” phía dưới là nhật ký trước khi chốt; phần hạn chế và phạm vi11lớp chưa làm vẫn còn hiệu lực.

# Tiến độ hệ Thảo — 17/10/2026

## Yêu cầu và phạm vi

Tiếp tục repository hiện tại từ 3c09082, một renderer/một animation loop. Yêu cầu mới thay hệ cuối thanh UI; cho phép xóa code/assets/text của hệ bị thay, ghi đè quy định bảo toàn hệ và tài liệu cũ trong phạm vi này. Không thay bất kỳ hệ còn lại, START.bat, cơ chế Rune Tower, Play Mode hoặc các cinematic khác.

## Khảo sát đã hoàn tất trước sửa nguồn

- Mã thực có15hệ/23skill, hệ cuối có3skill. Thay bằng1skill NATURE-01 (Thảo, Vạn Mộc Sinh Giới, shape verdantGenesis): kết quả15hệ/21skill, giảm2slot ở cuối; hotbar hệ vẫn cùng vị trí/bố cục. Không tạo hai skill giả để giữ số cũ.
- Tìm được137tên file và46file text/462dòng có tham chiếu trực tiếp hoặc hình thái riêng. Không có module src độc lập chỉ dành cho hệ bị thay: các nhánh hình học và update nằm trong main.js; một nhánh self-centered ở playable.js; audio/SVG/generator và nhiều báo cáo/tài liệu cần dọn.
- Khuôn chuẩn: charging theo elapsed/castTime/pace/runeDrawSpeed → channeling .58+pace*.26 → active theo activeTime/world time → kết thúc runeTower.timelineEnd. Callback preSlow/hitStop/shake dùng controller hiện có; Rune Tower release/fade/hit pulse không thay cơ chế. Cast/replay/select/reset disposeObjectTree rồi resetSurface; pause giữ simulation time. Module mới có updateCast/update/reset/dispose.
- Tái sử dụng getSkillAreaRadius, InstancedMesh, pooled GPU particles, shared wind uniform, Light Injection, surface shader, existing distortion/volumetric uniforms. Mục tiêu chiến đấu hiện tại là8training dummy, chưa có enemy AI/HP mới; Thảo phải thật sự chọn/đánh/trói chúng qua API riêng, không giả nhận quái hoàn chỉnh.
- Audit đầy đủ và snapshot trước thay được lưu ngoài cây bàn giao tại /workspace/work/thao-task để đối chiếu các hệ còn lại; không chuyển tên/kết quả cũ thành bằng chứng cho Thảo.

## File dự kiến

Sửa main.js/playable.js/graphics-upgrade.js, registry/generator/score audio, SVG, tests count/registry và tài liệu. Thêm src/nature-growth.js, src/nature-geometry.js, tests/thao_* và bằng chứng. Xóa nhánh VFX cũ, asset/audio/icon/báo cáo chỉ thuộc hệ bị gỡ; lọc các record cũ trong JSON hỗn hợp. Dọn ZIP cũ chứa nội dung đã gỡ, giữ bản an toàn ngoài thư mục đóng gói và Git history (không rewrite lịch sử Git).

## Thiết kế sẽ triển khai

- Vòng ground procedural SDF subdivided, rune lá/dây leo, pulse sinh trưởng; cấp phát trong init, thời gian shader theo world time.
- 6variant cây phân nhánh/taper/rễ, bark/leaf PBR gần đúng + translucency/veins/moss; InstancedMesh, animation GPU, canopy/contact shadow giả có giới hạn.
- Mọc theo đợt cỏ/dây leo → gai → cây → cổ thụ, overshoot đàn hồi. Rễ trói, gai so le, cành quất, hạt ballistic/drag, phấn/lá/mảnh vỏ analytic GPU. Chọn mục tiêu nearest theo nhịp thấp, không raycast từng cây mỗi frame.
- Quality budgets và Reduced Motion; target arrays tối đa8, clamp HDR/NaN, frame loop cũ. Sau fade/cleanup phục hồi bề mặt/gió/đèn/bind và dispose mọi GPU allocation; CPU template geometry có cache được ghi rõ.

## Trạng thái

Khảo sát: đạt. Gỡ hệ cũ: đang thực hiện. Module/asset/tích hợp/kiểm thử/ZIP: chưa hoàn tất, chưa kiểm chứng bằng mắt.

## Tích hợp và kiểm thử đang chạy

- Registry đã đổi thành15hệ/21skill. Snapshot trước/sau xác nhận bằng deep equality và SHA256: toàn bộ20cấu hình skill được giữ, gồm cinematic plan, không đổi;14element còn lại cũng không đổi. START.bat giữ đúng SHA256 67f2f70c870abd45d2604f1b20ddbf506907d6913cbf9a1598162f04cf159f72.
- Đã triển khai6variant cây, instancing/shader growth/sway/attack/wither; vòng phép, bark/leaf/petal/sap, rễ/gai/quả, bóng tán/contact, pollen/soil/spores, lá/cánh hoa/mảnh vỏ và light shaft High/Ultra. Tích hợp wind, light injection, phủ rêu tạm, target bind/hit, Reduced Motion, Rune Tower và Play Mode.
- Audio/icon mới: SVG lá procedural;15cue logic/24WAV biến thể gỗ/lá/hạt, kỹ thuật15/15PASS; mix NATURE-01 mới PASS (finale contrast15.22dB, vacuum21.25dB, truepeak-10.73dBTP4×). Không phải bản thu browser; chưa kiểm chứng bằng tai. Ngoại lệ lightning/impact của hệ khác giữ nguyên FAIL sau5vòng, không sửa trong phạm vi này. Tổng hiện tại224/225cue và21/21mix đạt.
- Đã gỡ141file chứa nội dung riêng hoặc archive hỗn hợp; lọc18JSON bằng cách xóa record, không đổi nhãn số đo cũ. Bản an toàn lưu ngoài cây dự án và trong Git history. Các bản nghe tổng hợp cũ có hệ đã gỡ cũng đã bỏ. Việc kiểm tra cuối toàn cây và ZIP còn đang thực hiện.
- Kiểm thử Low mới PASS: đủ4phase;4loại hit có mục tiêu; pause/resume; ảnh baseline/restored khớp từng pixel;10cast giữ24geometry/14texture sau mỗi cleanup; đổi hệ nhanh; Reduced Motion; guardNaN; Play Mode/Rune Tower; Replay/Reset; timeline charging→channeling→active→idle, hit-stop thực và time-scale về1. Bằng chứng raw ở work ngoài repo; bản chọn lọc sẽ vào docs/evidence/thao.
- Đã xem bằng mắt ảnh Cast Low và Growth/Attack/Aftermath High cùng Play Mode Low. Rừng có thân vân gỗ, lá xanh/hồng, nhiều tầng cây; avatar đọc được trong ảnh Play. Đây là quan sát ảnh tĩnh, chưa thay đánh giá chuyển động ở toàn preset/GPU thật.
- Lỗi đã sửa: cỏ chung còn fade sau reset → thêm reset alpha/gió tức thời; Three.js compileAsync có thể kiểm tra material đã dispose khi đổi rất nhanh → warm-up chạy idle bằng renderer.compile và hủy callback khi cleanup. Fixture sửa để đo time-scale theo pha controller thay vì field scale cũ; raw FAIL được giữ ngoài cây bàn giao.
- Kiểm thử preset Medium/High/Ultra, regression các skill còn lại, production, ZIP và PR đang thực hiện; chưa đánh dấu hoàn tất các mục đó.

### Bốn preset đã đạt

Low/Medium/High/Ultra đều PASS bốn mốc, bốn loại hit, Pause/Resume, shader/WebGL và phục hồi nền chính xác từng pixel. Geometry/texture sau10cast Low ổn định; các preset khác được kiểm tra lifecycle một cast, chưa gọi là10cast trên cả bốn. Có số đo CPU gửi lệnh render (gl.finish của WebGL không bảo đảm đồng bộ GPU), ở trạng thái cao trào trong SwiftShader, lưu docs/evidence/thao/presets.json; đây không phải FPS GPU thật hay benchmark toàn gameplay. Full-registry smoke và video đang chạy.

## Checkpoint Thảo đã lưu

- fad20b0 đã push vào nhánh Draft PR#1. Full-registry smoke đạt21Low +21High,0page/console error;1warning watchdog được test cố ý và3warning WebGL INVALID_OPERATION khi xóa tài nguyên context cũ. Lỗi lifecycle này được chuyển sang GĐnền tảng mới, chưa gọi là sạch warning. Thử context lost/restored và10cast chung đạt.
- Video171canvasframe/21.375giây đã encodeMP4 ở8fps quy định, không audio, không phải đoFPS thời gian thực. Có ảnh cận rễ/gai và cành/quả. Audio WebAudio thực material/impact/stop PASS,0error.
- npm ci sạch từ cache PASS (15package); npm test12test PASS; build64module PASS; vẫn có cảnh báo chunk Three535.18kB. Lượt thử npmci không-cache và Chromium không cấp quyền trước đó thất bại vì môi trường; đã khôi phục đầy đủ dependency, không mất source/dist.
- Production UI lượt riêng PASS: chọn slot cuối/một skill, cast tới impact, Play/MP/Pause, không test globals và0error. Lượt đầu timeout do tranh tài nguyên SwiftShader với video được giữ raw, không bỏ bằng chứng lỗi.
- Yêu cầu mới mở sang11lớp và trình tự rune cho toàn21skill; bằng chứng Thảo cũ này không nghiệm thu các thay đổi mới. Chuyển tiếp theo UPGRADE_PROGRESS.md, giữ checkpoint và ảnh/video.

## Kết quả chốt Thảo

- Giữ runtime21skill/15hệ;20skill khác,14element và toàn bộ cinematic/config giữ nguyên theo snapshot. START.bat giữ nguyên byte. Đã dọn thêm nhánh gate rỗng/array portal không còn ai đăng ký sau khi gỡ hệ cuối.
- Sửa cảnh báo PMREM context cleanup: giải phóng target/listener khi GL đang lost, dựng PMREM mới sau restored. Kiểm thử tập trung3chu kỳ trên Thảo đang active: PASS,0error/0warning và environment texture được tạo lại mỗi lần. Raw warning cũ và lỗi fixture đọc target-null vẫn giữ ngoài cây bàn giao; snapshot fixture nay chấp nhận targetnull trong lúc lost.
- Bản nghe/cận cảnh đã xem: rễ chạy về chân dummy, gai gỗ trồi tại mục tiêu, quả bay và lá rơi thấy được; ảnh bốnphase đã kiểm chứng bằng mắt. Video là mẫu mô phỏng cố định, không audio và không benchmarkGPU.
- ZIP được tạo từ commit source cuối bằng scripts/package_thao.py; kiểm CRC/launcher/no-node_modules và build bản giải nén được lưu trong bằng chứng bàn giao. Chi tiết SHA/size/sourceCommit được xuất trong docs/releases/thao-package.json.
- Hạn chế: chưa đo FPS trên GPU người chơi; CPU submission/SwiftShader không chứng minh hiệu năng native. Chưa chạy START.bat trên Windows thật; chưa kiểm chứng âm thanh bằng tai; chưa có AI/HP quái mới. Lá/bark/SSS/bóng tán là xấp xỉ vật liệu/ánh sáng, không ray tracing. Chưa chứng nhận mọi góc camera/tất cả thiết bị.

### File chính sửa/tạo/xóa

Tạo src/nature-geometry.js và nature-growth.js; SVG lá và audioNature; tests/nature.test.js, thao_browser.py, thao_record.py, thao_production.py, context_lifecycle.py; scripts/audit_nature.py; báo cáo/ảnh/video trong docs/evidence/thao. Sửa main.js, playable.js, graphics-upgrade.js, graphics/core/element-materials.js, wind-grass.js, audio registry/synthesis/score/calibration, generators và tài liệu. Xóa141file riêng/record của hệ bị thay (theo diff checkpoint), nhánh hình học/update/icon/audio cũ; lọc JSON thay vì đổi nhãn bằng chứng. Các ZIP tổng hợp cũ chứa nội dung đã gỡ được thay bằng evidence hiện hành; Git history không rewrite.

### Việc sau bản bàn giao

Phạm vi11lớp đồ họa và rune gate được ghi trong UPGRADE_PROGRESS.md; bản soạn2module ở docs/drafts/graphics chưa import/chưa nghiệm thu. Ưu tiên tiếp theo: kiểm kê nền tảng chung với ngân sách thật → hoàn thiện gate/fade mọi skill → nâng từng hệ theo thứ tự đã yêu cầu. Giữ15hệ/21skill và các mốc cinematic hiện tại. Không gọi các draft là tính năng đang hoạt động.

## 10 ý tưởng cho vòng tiếp theo

| Ưu tiên | Ý tưởng | Giá trị / khó / rủi ro | Bằng chứng cần có |
|---:|---|---|---|
| 1 | Benchmark GPU thật và LOD cây theo khoảng cách | Cao / vừa / thấp | Frame time, GPU timer và ảnh4preset |
| 2 | Hoàn thiện BRDF/IBL cho bark và lá, giữ palette rừng | Cao / cao / vừa | So sánh nhiều hướng sáng/camera, shader trên GPU yếu |
| 3 | Gate COMMIT/fade dùng chung cho21skill | Cao / vừa / vừa | Mọi hệ trước/đúng/saucommit, pause và cleanup |
| 4 | Va chạm height-field cho quả/lá với nền | Cao / cao / vừa | Nảy/trượt/dừng,10cast không tăng tài nguyên |
| 5 | Tối ưu tán lá theo screen coverage và mip/alpha | Cao / vừa / vừa | Silhouette/canopy ở xa, giảm overdraw |
| 6 | Bóng tán theo hướng đèn và phong hóa vỏ cây | Vừa / vừa / thấp | Contact/đổ bóng ở nhiều góc, reset sạch |
| 7 | Nối trói/đòn cây vào HP và enemy AI tương lai | Cao / cao / cao | Targeting, sát thương, trói hết hạn, chết/reset |
| 8 | Mảnh gỗ theo hướng cú quất và dấu va chạm pool | Vừa / vừa / thấp | Đòn đúng mục tiêu và budget ổn định |
| 9 | Thu/mux WebAudio theo timestamp với video | Vừa / vừa / thấp | Âm–hình/hit-stop đồng bộ, không gán WAV tham chiếu thành browser recording |
| 10 | Xác minh preview riêng qua quyền Vercel hợp lệ | Cao / vừa / phụ thuộc quyền | Browser của đúng deployment/commit, giữ protection |

Ba nhóm đã chọn và làm trong lượt Thảo: hình học/vật liệu/chuyển độngGPU; bốn đòn nhắm mục tiêu và phục hồi; tích hợp UI/audio cùng hệ thống bằng chứng. Bảng trên là backlog, không phải tính năng đã hoàn thành.
