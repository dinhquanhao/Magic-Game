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

Low/Medium/High/Ultra đều PASS bốn mốc, bốn loại hit, Pause/Resume, shader/WebGL và phục hồi nền chính xác từng pixel. Geometry/texture sau10cast Low ổn định; các preset khác được kiểm tra lifecycle một cast, chưa gọi là10cast trên cả bốn. Có số đo render đồng bộ bằng gl.finish ở trạng thái cao trào trong SwiftShader, lưu docs/evidence/thao/presets.json; đây không phải FPS GPU thật hay benchmark toàn gameplay. Full-registry smoke và video đang chạy.
