# Arcane VFX Studio — nền đất nâu và hệ Thảo

**Nhân vật mới: Cyber Bot từ file model bạn tải lên.** Khi thi triển, bot giơ hai tay lên trên đầu và đứng yên từ lúc vẽ rune đến khi skill kết thúc; camera vẫn xoay được. Mặc định tổng vẽ+hội tụ là **10giây** (8,5+1,5), pha khai triển của **toàn bộ19skill dài gấp đôi** qua playback0,5×. Đây là ngoại lệ thời lượng mới theo yêu cầu, gồm FIRE-01; tên/thông số/MP/cooldown và các marker nội bộ được giữ. Slider thời gian/tốc độ nghi thức áp dụng ở lần cast tiếp theo; pause/hit-stop/slow motion dùng cùng clock. Audio đi theo playback, có thay đổi pitch như engine hiện hành. [Ảnh/video và kiểm thử model/timing](docs/evidence/character-cast/README.md).

**Phù văn của toàn bộ19skill nay mờ dần trong1,8giây mô phỏng khi hiệu ứng skill được bật hiển thị**, rồi ẩn hẳn. Skill xuất hiện trễ được chờ đúng nhóm hiệu ứng; pause/hit-stop/slow motion đồng bộ và thi triển lại phục hồi vòng phép. [Ảnh/video và kiểm thử fade](docs/evidence/rune-fade/README.md). Nhóm fade giữ nguyên envelope1,8s; thời lượng skill/audio runtime dùng quy tắc mới nêu trên.

Nền đấu trường đã đổi sang nâu đất, bề mặt ít bóng và có vân procedural nhẹ. Hiệu ứng rêu/ướt/cháy/băng vẫn phủ lên nền và phục hồi sau reset. [Ảnh trước/sau và kết quả kiểm thử](docs/evidence/brown-ground/README.md).

Registry hiện tại: **15 hệ, 19 skill**. Hỏa chỉ còn **FIRE-01 — Thiên Nhật Diệt Thế**, giữ nguyên dữ liệu tên/mô tả/chỉ số/MP/cooldown/cinematic/VFX đòn đánh/audio; playback dài2× và phù văn dùng fade chung mới nêu trên. Hệ cuối có **NATURE-01 — Vạn Mộc Sinh Giới / Verdant Genesis**. START.bat vẫn dùng npm.cmd, ASCII/CRLF. [Bằng chứng đợt thu gọn Hỏa trước đó](docs/evidence/fire-trim/README.md).

- Cast: vòng mặt đất chia nhỏ, shader dây leo/lá/rune, sáng lan theo góc và phấn hoa.
- Bùng phát: dây leo → bụi/gai → thân/cành/tán → cổ thụ; sáu hình thái procedural, phân nhánh và overshoot đàn hồi.
- Tấn công: chọn dummy gần nhất mỗi 0,35 giây; rễ trói/làm chậm, gai dưới chân, cành quất và quả có trọng lực/drag. Hit-stop và shake dùng controller hiện có. Mốc cao trào ở 7,2 giây active.
- Aftermath: ngừng ra đòn sau khoảng 13,3 giây; héo/co rút và lá rơi đến 18 giây. Hủy/kết thúc/reset dọn GPU, bind, màu nền, đèn và gió/cỏ.

Cây/gai/quả/lá dùng InstancedMesh; pollen/đất/bào tử dùng Points với quỹ đạo GPU. Mỗi cast dùng geometry từ template CPU cache; không dựng geometry hoặc cập nhật matrix từng cây mỗi frame. Vỏ cây có grain/crack/moss/roughness và bump procedural; lá có gân/backlight; bóng tán/contact shadow, sap và tia nắng là xấp xỉ shader, không phải ray tracing/SSS vật lý.

| Preset | Cây | Hạt | Lá rơi |
|---|---:|---:|---:|
| Low | 36 | 800 | 180 |
| Medium | 60 | 1600 | 360 |
| High | 96 | 3000 | 720 |
| Ultra | 144 | 5000 | 1200 |

Chỉnh trong `src/main.js`, đối tượng `natureSkill.nature`: `treeCounts` (số cây từng preset), `growthSpeed` (tốc độ mọc), `attackRange` (mét chọn mục tiêu). Chỉnh ngân sách hạt/lá trong `NATURE_BUDGETS` và các màu bark/leaf/petal/circle ở `src/nature-growth.js`; màu UI nằm ở element NATURE trong main.js. Seed hình học ở `src/nature-geometry.js` tạo sáu variant. Marker gốc18giây đồng bộ cinematic/Rune Tower; runtime0,5× kéo dài thành36giây simulation khi tốc độ1. Các mốc Thảo phía trên là marker gốc, nhân2để đổi sang thời gian active hiện tại.

Windows: giải nén toàn bộ ZIP, cài Node.js LTS rồi nhấp START.bat. Hoặc mở terminal trong thư mục đã giải nén và chạy `npm.cmd ci`, `npm.cmd run dev`. Không mở index.html trực tiếp. Xem [ảnh, kiểm thử và bản tải](docs/PREVIEW.md), [báo cáo Thảo](THAO_PROGRESS.md).

Các phần dưới ghi lại nền tảng/các vòng phát triển trước; số đo lịch sử không phải bằng chứng mới cho Thảo. Lịch sử chỉ còn dữ liệu của các hệ được giữ lại, không đổi nhãn kết quả cũ thành kết quả mới.

---

# Xưởng Hiệu Ứng Ma Thuật — 15 hệ, 23 tuyệt kỹ

## Checkpoint phát triển 17/10/2026

Xem [code, ảnh, video và hướng dẫn preview](docs/PREVIEW.md), [ROADMAP](ROADMAP.md), [PROGRESS](PROGRESS.md) và [báo cáo kèm ảnh/log](docs/DEVELOPMENT-2026-10-17.md) cho trạng thái mới. Đã sửa lỗi shader trên 8 tuyệt kỹ, thêm tiến trình cast, dọn tài nguyên/ngân sách VFX, hoàn thiện kiểm thử nâng cấp lịch sử và thống nhất AOE. 15 hệ/23 ID và thiết kế cốt lõi được giữ nguyên. Giai đoạn phát triển nhân vật/quái/Boss/thế giới/gameplay đầy đủ còn trong roadmap.

Các ghi chú “chưa kiểm chứng” trong phần nâng cấp cũ bên dưới phản ánh lần bàn giao trước; bằng chứng Chromium/SwiftShader mới nằm trong báo cáo. Chưa có benchmark native GPU. `UPGRADE_PROGRESS.md` giữ nguyên làm lịch sử.

Đây là bản nâng cấp trực tiếp dựa trên dự án hiện có. Giao diện, hướng dẫn và thông báo đã được chuyển sang tiếng Việt. Dự án giữ nguyên cảnh 3D, Tháp Phù Văn nhiều tầng và trình khởi chạy Windows `START.bat`. Registry hiện có 23 tuyệt kỹ; Bóng Tối còn SHADOW-01, Không Gian còn SPACE-01 và Thời Gian còn TIME-01. Các hệ khác được giữ nguyên.

## Cách chạy trên Windows

1. Cài [Node.js bản LTS hiện tại](https://nodejs.org/) nếu máy chưa có, rồi đóng và mở lại cửa sổ dòng lệnh.
2. Giải nén **toàn bộ** tệp ZIP; mở thư mục chứa `package.json` và `START.bat`.
3. Nhấp đúp `START.bat`. Lần đầu, launcher cài dependencies theo `package-lock.json`; Vite sẽ mở trình duyệt tại đúng cổng máy chủ vừa khởi động.
4. Giữ cửa sổ dòng lệnh mở trong khi chơi. Nhấn `Ctrl+C` để dừng.

Launcher đã sửa lỗi CMD đọc sai ký tự/lệnh: dùng ASCII, xuống dòng CRLF, không cần PowerShell hoặc đổi code page. Git giữ nguyên byte của file trong ZIP tải về. Vite 7 yêu cầu Node 20.19 ở nhánh 20, hoặc Node 22.12 trở lên; khuyến nghị cài bản LTS hiện tại.

Để chạy thủ công bằng CMD hoặc PowerShell, mở Terminal trong thư mục chứa `package.json` và chạy:

```bat
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --open
```

Địa chỉ chính xác nằm ở dòng `Local` trong Terminal, thường là `http://localhost:5173/`. Dùng `npm.cmd` giúp PowerShell gọi đúng npm của Windows.

## 15 hệ và 23 tuyệt kỹ

| Hệ phép | Tuyệt kỹ hiện có |
| --- | --- |
| Hỏa | Thiên Nhật Diệt Thế |
| Thủy | Hải Thần Lĩnh Vực (WATER-01) — Cá voi thần và sóng thần |
| Thổ | Đại Lục Phân Liệt (EARTH-01) — Thiên thạch đá và địa tầng nứt vỡ |
| Ánh Sáng | Lục Dực Thánh Khải (LIGHT-01) — Mưa tia sáng từ thiên giới |
| Bóng Tối | Vạn Ảnh Thiên Kiếp (SHADOW-01) — Quả cầu hút năng lượng và phát nổ |
| Phong | Thiên Khí Băng Diệt (WIND-01) — Lốc xoáy khổng lồ |
| Lôi | Lôi Giới Tận Thế (LIGHTNING-01) — Bão sét nhiều đợt |
| Băng | Vĩnh Băng Thiên Kiếp (ICE-01) — Trường đóng băng và rừng gai tinh thể |
| Nham | Khai Thiên Nham Ngục · Nham Thiên Diệt Thế · Nham Thần Giáng Thế |
| Độc | Vạn Độc Diệt Giới (POISON-01) — Mây độc, mưa axit và vùng ăn mòn diện rộng |
| Không gian | Không Gian Băng Diệt (SPACE-01) — Cầu kỳ dị hút xoắn ốc |
| Thời Gian | Vĩnh Hằng Chung Khúc (TIME-01) — Lĩnh vực ngưng đọng thời gian |
| Huyết | Vạn Huyết Thiên Thượng (BLOOD-01) — Lưới xích huyết siết vỡ qua năm đợt |
| Tinh tú | Vạn Tinh Quy Nhất · Tinh Hà Tận Thế · Sáng Thế Tinh Vực |
| Thảo | Vạn Mộc Sinh Giới (NATURE-01) |

## Điều khiển

- Chọn một hệ ở hàng phía trên, rồi chọn một trong các tuyệt kỹ hiện có ở hàng phía dưới.
- Dùng phím `1`–`3` để chọn nhanh tuyệt kỹ trong hệ hiện tại; dùng phím mũi tên để chuyển tuyệt kỹ.
- Nhấn phím cách hoặc nút **Thi triển tuyệt kỹ** để thi triển lại.
- Kéo chuột để xoay góc nhìn; cuộn con lăn để phóng to hoặc thu nhỏ.
- Có thể chọn bốn mức chất lượng, bán kính ảnh hưởng từ 120 đến 350 m, số tầng và vòng phù văn, mật độ vòng vệ tinh, tốc độ vẽ và tốc độ xoay.
- Dùng nút tạm dừng, tự động thi triển lại, Tháp Phù Văn và đặt lại tùy chỉnh để điều khiển mô phỏng.

Tháp Phù Văn giữ các tầng vòng đồng tâm, vòng lớn ở giữa, vệ tinh được bố trí chọn lọc, nét sáng chạy trọn 360° và luồng năng lượng hội tụ. Mỗi tuyệt kỹ dùng màu sắc tương ứng với hệ phép.

## Hiệu ứng va chạm điện ảnh

Mỗi tuyệt kỹ có mốc va chạm, nhịp chậm trước đòn đánh, thời lượng ngắt nhịp, dư chấn và biên độ rung riêng. Các tuyệt kỹ va chạm tạo lõi, sóng xung kích và tàn dư theo hình thái từng hệ; riêng LIGHT-01 là trường mưa tia kéo dài nhiều đợt, chỉ hit-stop ở đợt đồng loạt cuối.

Trong mục **Điện ảnh**, có thể bật hoặc tắt rung máy quay, ngắt nhịp va chạm, chuyển động chậm và góc máy điện ảnh; đồng thời chỉnh cường độ rung, mức ngắt nhịp, tốc độ chậm, chi tiết sóng xung kích, mật độ mảnh vỡ và ánh chớp. Chế độ **Giảm chuyển động** giảm rung, ngắt nhịp, chuyển động chậm và các chuyển động máy quay mạnh.

Các hiệu ứng điện ảnh dùng chung đồng hồ hoạt ảnh của chương trình. Tạm dừng, tiếp tục, thi triển lại và đặt lại đều điều khiển cùng một mô phỏng; hiệu ứng cũ được dọn khi thi triển lượt mới.

## Mưa tia ánh sáng — LIGHT-01

**Lục Dực Thánh Khải** giữ tên gọi nhưng đổi hình thái tấn công thành mưa tia photon vàng trắng. Một cổng Rune khổng lồ mở trên cao, nén ánh sáng rồi phát năm đợt khác nhau: rải điểm, vòng đồng tâm, quét xoắn, phủ kín và đợt đồng loạt cuối. Những tia đứng lưu lại ngắn, phát tia lửa, vòng va chạm và vết khắc thủ tục trên mặt đất; dư chấn lan qua mặt đất trong ba nhịp. Không còn hình thái thần kiếm, cột thánh quang hay đôi cánh làm chủ thể.

Thân tia và đầu photon phát sáng rơi thẳng theo trục đứng, được dựng trong một shader dùng chung với InstancedBufferGeometry. Các tia luôn hướng mặt về camera để còn nhìn rõ khi xoay góc; độ lệch khỏi phương thẳng đứng được giới hạn dưới một độ. Hạt ở cổng, tia lửa va chạm và dấu khắc dùng các draw call chia sẻ; không tạo một Mesh hay PointLight cho mỗi tia. Low/Medium/High/Ultra hiển thị lần lượt 2.000 / 2.800 / 4.200 / 5.500 tia; preset thấp giữ số lượng lớn và giản lược chi tiết shader mỗi tia. Rune Tower ở lại suốt mưa tia và bắt đầu tan từ đợt phủ kín; camera điện ảnh đổi từ góc nhìn cổng trên trời sang góc cao, orbit thấp và lùi rộng ở finale. Trong Play Mode, reticle chỉ vùng AOE, pháp sư nâng trượng và đợt finale áp dụng hit-stop ngắn.

Có thể chỉnh `skill.rays` trong `src/main.js`: `totalByQuality` và `hardCap` đặt số tia theo preset; `lengthRange`, `widthRange`, `descentSpeedRange`, `angleJitterDeg` và `lingerTime` đặt hình học/chuyển động; `finaleImpactAt`, `totalDuration` điều chỉnh nhịp cuối. Mảng `waves` đặt `name`, `share`, `start` và `spread` cho từng đợt; `skill.aoe` đặt bán kính.

## Quả cầu kỳ dị — SPACE-01

Không Gian chỉ còn **Không Gian Băng Diệt**. Tâm điểm là một quả cầu nhỏ màu tím đen quay cực nhanh. Bụi năng lượng và mảnh vỡ bay theo quỹ đạo xoắn ốc rồi bị hút biến mất vào lõi; trong Play Mode, các hình nộm ở trong vùng ảnh hưởng cũng bị cuốn vòng quanh và kéo về tâm. Hiệu ứng không còn vết rách lớn, đĩa bồi tụ, luồng phụt hay vụ nổ hất vật thể ra ngoài. Tháp Phù Văn nhiều tầng và các hệ phép khác vẫn được giữ nguyên.

Hiệu ứng nằm trong src/space-black-hole.js: quả cầu dùng shader bề mặt xoay nhanh; hạt GPU và mảnh vỡ dạng instance hội tụ theo từng đợt. Chất lượng Low / Medium / High / Ultra điều chỉnh mật độ hạt; không tạo renderer, animation loop, render target hoặc PointLight riêng. Tốc độ xoay, bán kính hút, nhịp hội tụ và Tháp Phù Văn nằm trong skill.spaceBlackHole ở src/main.js.

## SHADOW-01 — Vạn Ảnh Thiên Kiếp

Bóng Tối chỉ còn một tuyệt kỹ. Một lõi mực tím đen nhỏ lơ lửng phía trên tâm thi triển, bề mặt có nhiễu xoáy, viền Fresnel mảnh và vết nứt tím xuất hiện khi nén. Các dải năng lượng GPU uốn xoắn từ mặt đất và vùng quanh Tháp Phù Văn về lõi; vùng nền mất màu và tối dần. Quả cầu chỉ lớn nhẹ, trong khi nhịp đập và độ nén tăng. Ở cao trào, dòng hút ngừng, cảnh chậm lại, rồi khối tối méo cạnh bung ra cùng xúc tu instanced, mảnh vỡ và ba lớp sóng xung kích. Môi trường và nền đất được trả về bằng cách làm mờ overlay tạm; nhân vật/dummy không bị hút hoặc đẩy.

Skill dùng `src/shadow-orb.js` và shader trong cùng một renderer/post-processing pass. Cấu hình riêng `skill.shadowOrbCataclysm` nằm trong `src/main.js`: `orb` chỉnh độ cao, bán kính, nhịp và xúc tu; `absorb` chỉnh bán kính/lực hút, số dải/hạt theo Low / Medium / High / Ultra, độ xoắn, tốc độ rút màu; `waves` đặt bốn đợt; `overload` đặt slow-motion/vignette; `detonation` đặt bán kính, tầm xúc tu và ngân sách mảnh; `shockwaves`, `aftershock`, `hitStop`, `slowMotion` và `runeTower` đặt dư chấn và nhịp điện ảnh. Module giới hạn ngân sách theo preset, không tạo mesh cho từng luồng, không tạo đèn cho từng hạt, và dùng một shader overlay nền được giải phóng cùng cast.

## WATER-01 — Hải Thần Lĩnh Vực

Thủy chỉ còn một tuyệt kỹ: Hải Thần Lĩnh Vực. Cổng đại dương mở phía trên chiến trường; cá voi xanh khổng lồ bơi ra, vòng qua bầu trời rồi chúi đầu lao xuống. Cú chạm đất tạo cột nước, vành bọt, hạt nước bắn tung, sóng áp lực và nhiều lớp sóng thần lan rộng, sau đó nước rút để lại xoáy và hình bóng cá voi tan vào ánh nước. Bầu trời, sương và ánh sáng môi trường chuyển dần sang xanh biển trong lúc thi triển.

Hình cá voi được dựng bằng hình học và shader procedural, có thân thuôn liền mạch, vây ngực, đuôi hai thùy, vây lưng, mắt và nếp bụng. Chuyển động đuôi tạo nhịp bơi; góc lao xuống đồng bộ với va chạm. Mặt nước dùng hấp thụ Beer–Lambert theo chiều sâu (kênh đỏ suy giảm nhanh hơn), Fresnel Schlick, hai lớp sóng hướng khác nhau với normal biến thiên, bọt va chạm và caustic. Các giọt nước dùng một hệ điểm GPU thay vì tạo mesh cho từng giọt. Khúc xạ scene-color và động lực học chất lỏng vẫn là xấp xỉ, không phải mô phỏng nước vật lý.

Các thông số của skill nằm trong oceanSkill.oceanDominion ở src/main.js: impactTime đặt thời điểm va chạm; whale đặt kích thước, quỹ đạo, góc lao và ánh sáng sinh học; gate điều chỉnh cổng; splash đặt cột nước, vành bắn và số hạt theo chất lượng; tide đặt tốc độ, chiều cao, độ sâu, bán kính và thời điểm nước rút. Tháp Phù Văn giữ lại qua cú va chạm rồi tan theo thứ tự vòng ngoài trước. Trong Play Mode, reticle và vùng va chạm đi theo tâm AOE cùng thanh bán kính hiện có.
## BLOOD-01 — Vạn Huyết Thiên Thượng (Crimson Spears)

Huyết chỉ còn một tuyệt kỹ. Một ma pháp trận mở trên trời và dưới đất, rồi hàng trăm sợi xích huyết dài lao xuyên chiến trường. Mỗi sợi gồm các mắt xích kim loại huyết rời, xen kẽ mặt phẳng, có móc nhọn và đường rune phát sáng. Năm đợt nối tiếp tạo dải xích từ trời xuống đất, các đường đan chéo và mái vòm khép thành lồng giam; ở finale, toàn mạng lưới co về tâm, nén lại rồi vỡ thành mảnh xích và giọt huyết. Sóng dư chấn, vết cắm và vũng huyết mờ dần, mặt đất được dọn sạch khi hiệu ứng kết thúc.

Xích dùng ba biến thể hình học lặp lại qua `InstancedMesh`; transform từng mắt được tạo một lần, còn độ mọc, rung roi, co siết và mảnh vỡ chạy bằng shader. Mỗi preset vẫn triệu hồi hàng trăm sợi: Low / Medium / High / Ultra lần lượt dùng 220 / 320 / 460 / 560 sợi, với ngân sách mắt xích và hạt có giới hạn. Hiệu ứng chia năm đợt, giữ Rune Tower trong lúc xích hoạt động, chỉ kích hoạt slow-motion và hit-stop tại finale, và chỉ là trình diễn thị giác trong Play Mode.

Có thể chỉnh `skill.bloodChainNet` trong `src/main.js`: `chains.totalByQuality` và `linkBudgetByQuality` đặt số sợi và ngân sách mắt; `waves` đặt nhịp năm đợt; `constriction.start`, `constriction.fullAt` và `shatterTime` điều chỉnh lúc siết và vỡ; `ground.evaporateStart`, `ground.evaporateDuration` và `runeTower.fadeStart` điều chỉnh phần dư chấn và dọn cảnh.
## ICE-01 — Vĩnh Băng Thiên Kiếp (Eternal Winter)

Băng chỉ còn tuyệt kỹ ICE-01. Vĩnh Băng Thiên Kiếp đóng băng một vùng rộng từ tâm ra ngoài: mép sương giá lan trước lớp băng, mặt băng hiện vết nứt Voronoi và ánh phản chiếu xanh lam. Sau đó các gai tinh thể mọc theo bốn nhịp: rải rác, vòng đồng tâm, đường đứt gãy và bùng nổ từ tâm; các cấu hình chất lượng Low / Medium / High / Ultra dùng 300 / 800 / 1.600 / 2.800 instance. Gai có bốn hình học lăng trụ nhiều mặt, cụm nhánh nhỏ, chiều cao và độ nghiêng riêng, chuyển động mọc bật có overshoot; một trụ trung tâm lớn xuất hiện ở finale.

Các đợt dùng InstancedMesh và thuộc tính tăng trưởng GPU, còn lớp băng, vết nứt, vòng dư chấn, sương sát đất và bụi tinh thể dùng shader/đám điểm. Thời điểm dồn lạnh, đóng băng, bốn đợt gai, chớp finale và ba dư chấn nằm trong `skill.iceField` ở `src/main.js`; `src/ice-freeze.js` tạo hiệu ứng và dùng chung renderer, vòng hoạt ảnh, ánh sáng của lượt thi triển cùng các nút hit-stop, slow-motion, rung và giảm chuyển động. Rune Tower xanh băng tồn tại xuyên suốt quá trình gai mọc rồi mờ dần cùng vùng băng. Trong Play Mode, vùng đóng băng đặt tại tâm ngắm.

## POISON-01 — Vạn Độc Diệt Giới (Venom Apocalypse)

Hệ Độc chỉ còn POISON-01. Mây độc ba lớp cuộn dần trên cao với nhiễu fBm bị uốn, lõi xanh đen, rìa vàng lục và khe tím mờ. Mưa axit trút theo năm đợt có phân bố riêng: giọt rải rác, lan từ tâm, dải xiên quét ngang, phủ kín AOE rồi dội đồng loạt ở finale. Giọt thường là dải nhầy kéo dài; một tỷ lệ nhỏ là khối axit lớn, đổi sắc xanh độc / vàng chanh / tím và rơi theo shader GPU.

Điểm chạm tạo vương miện splash, bọt và hơi độc bằng GPU Points. Một ground overlay chia nhỏ tạo vùng đất cháy loang, hố lõm có displacement, vũng sủi bọt và gợn sóng; lớp overlay tan đi rồi được dọn cùng skill để trả mặt đất gốc về nguyên vẹn. Finale tạo hit-stop, rung camera, sóng ăn mòn và ba dư chấn; mây cùng hơi độc mờ dần trong aftermath. Play Mode đặt tâm mây, mưa và reticle tại điểm ngắm; pháp sư giơ trượng lên trời.

Mưa dùng một InstancedMesh với thuộc tính thời điểm, tốc độ, hình dáng, màu và gió theo từng instance; cập nhật chuyển động ở shader thay vì cập nhật hàng nghìn giọt trên CPU mỗi khung hình. Mây dùng ba lớp instanced sphere với shader nhiễu; mặt đất dùng một overlay duy nhất. Số instance mưa theo Low / Medium / High / Ultra là 2.500 / 6.500 / 15.000 / 26.000. Không tạo một Mesh hay PointLight cho từng giọt.

Có thể chỉnh `skill.poisonAcid` trong `src/main.js`: `cloud.radius`, `height`, `layers`, `formStart` và `dissipateStart` đặt mây/AOE; `rain.totalByQuality`, `heavyBlobShare`, `dropLengthRange`, `blobSizeRange`, `fallSpeedRange`, `windSkew` và `splashShare` đặt mưa; `waves` chứa `pattern`, `share`, `start`, `duration` cho năm đợt; `corrosion.pitDepth`, `puddleMergeThreshold`, `evaporateStart` và `evaporateDuration` đặt hố, vũng và thời gian tan. Bán kính AOE lấy từ `cloud.radius`, `skill.aoe` và `config.aoeScale`.

## Tuyệt kỹ Hỏa hiện tại

- **Thiên Nhật Diệt Thế:** bề mặt plasma fBm năm lớp có miền nhiễu bị uốn, các mảng đối lưu/đốm tối, lõi nhiệt nhiều tầng, corona bằng tia InstancedMesh và bảy vòng prominence chuyển động. Mưa tàn lửa, khói và cầu lửa tồn dư đi theo pha lao xuống; cấu hình riêng dùng slow-motion trước chạm, hit-stop 135 ms và ba lớp shockwave.

### Chỉnh chất lượng và thông số Hỏa

Các shader Hỏa dùng fBm 5 octave, domain warp, màu blackbody từ khói đỏ sẫm qua cam/vàng đến lõi trắng xanh HDR. Bộ đếm hạt bám theo **Mật độ hạt** và preset **Low / Medium / High / Ultra**; cánh lửa, cổng và số hạt giảm theo preset, còn AOE, hình thái, va chạm và shockwave được giữ. **Cường độ** điều khiển độ sáng; **Tốc độ** điều khiển nhịp toàn mô phỏng. Trong mục **Điện ảnh**, có thể giảm rung hoặc bật **Giảm chuyển động**; hit-stop và slow-motion vẫn có nút điều khiển chung, nhưng ba skill Hỏa dùng thời lượng/cường độ riêng.

Các module tái sử dụng trong `src/main.js` gồm `FireShaderLibrary` (surface/noise blackbody), `FlameVolume` (lớp plasma nhiễu), và `EmberSystem` (tàn lửa/khói GPU Points); các nhánh mới chỉ được gọi bởi ba skill Hỏa. Điểm sáng môi trường dùng lại một PointLight của skill, heat distortion dùng một post-processing pass chỉ bật khi đang thi triển Hỏa; không thêm renderer hay animation loop.

## Bổ sung shader nguyên tố

Mỗi tuyệt kỹ giữ nguyên hình thái và nhịp thi triển hiện có, đồng thời được phủ thêm hai lớp bề mặt shader 3D có nhiễu thủ tục, viền Fresnel, biến dạng và hoa văn chuyển động riêng theo nguyên tố. Các dải năng lượng xoắn có pha, hướng và nhịp khác nhau; lửa/nham có dòng cuộn, lôi có đường răng cưa, không gian có méo quỹ đạo, còn thời gian/tinh tú tạo các dải vòng và quỹ đạo. Ánh sáng điểm gắn với vụ va chạm cũng được mở rộng để tác động rõ hơn lên môi trường.

Nham và Tinh Tú dùng khung PBR trong `src/graphics/core/element-materials.js`: khe nóng chuyển động trên Nham, tinh vân/sao/Fresnel trên Tinh Tú. Thảo dùng shader rừng riêng trong `src/nature-growth.js`. Đây là vật liệu procedural với mô phỏng ánh sáng gần đúng.

## Chế độ chơi pháp sư

Nút **Vào chế độ chơi** chuyển từ Showcase sang đấu trường; nút **Trở về Showcase** khôi phục góc xem cũ và phát lại tuyệt kỹ đang chọn tại tâm mặc định. Play dùng lại chính renderer, animation clock, post-processing, shader, timeline skill và hệ Rune Tower hiện có. Mỗi lần thi triển tạo một `castContext` gồm vị trí trượng, vị trí/hướng pháp sư, mục tiêu raycast, tâm AOE, giới hạn tầm, hệ số AOE, chất lượng và chế độ. Showcase tiếp tục đặt tâm ở gốc cũ; Play đặt tâm AOE tại điểm ngắm (hoặc tại pháp sư với các phép lĩnh vực cục bộ). Các hình học skill gốc được giữ nguyên và được dịch chuyển/định hướng bằng nhóm effect ngoài cùng.

### Phím điều khiển Play

- `W A S D` hoặc phím mũi tên: đi 8 hướng; giữ `Shift`: chạy nhanh.
- `Space`: nhảy; `Q`: lướt né; `E`: thi triển tuyệt kỹ; `R`: thi triển lại tuyệt kỹ gần nhất tại đúng context.
- `1`–`3`: chọn slot có tồn tại trong hệ đang chọn; hệ Ánh Sáng chỉ có slot `1`. Chọn hệ/skill trực tiếp bằng các thanh giao diện.
- Giữ chuột phải để ngắm; nhấp canvas lần đầu để khóa chuột, di chuyển chuột để xoay camera, `Esc` để thả chuột; cuộn con lăn để đổi khoảng cách camera.
- `Tab` hoặc nút **Khóa mục tiêu** khóa dummy gần nhất; nhấn lại để bỏ khóa.
- Gamepad: cần trái di chuyển, cần phải xoay camera, cò phải thi triển.

Pháp sư procedural có áo choàng chia sáu đoạn có độ trễ, áo/giáp tông trung tính, trượng và tinh thể đổi màu theo hệ. Cử chỉ thi triển lấy hệ và slot trực tiếp từ registry; EARTH-01 nâng trượng gọi thiên thạch, LIGHT-01 nâng trượng hướng lên trời, WIND-01 kéo áo choàng theo gió lốc mà không khóa điều khiển, POISON-01 nâng trượng gọi mây độc; BLOOD-01 nâng trượng mở cổng xích huyết trên trời và dưới đất. Hạt sáng tụ quanh pháp sư rồi dồn về trượng, vòng rune cá nhân xuất hiện dưới chân, và một luồng năng lượng nối trượng với tâm thi triển. Có tám dummy trong sân để khóa mục tiêu và phản ứng theo AOE.

### Archetype của 23 tuyệt kỹ

Archetype xác định cách skill được đặt và hướng nhóm VFX trong Play. Các tên giữ nguyên; danh sách dưới đây phản ánh chính xác `cinematicPlans` đang dùng chung với Showcase.

| Hệ | Skill và archetype |
| --- | --- |
| Hỏa | Thiên Nhật Diệt Thế — Thiên giáng |
| Thủy | Hải Thần Lĩnh Vực (WATER-01) — Cá voi từ cổng đại dương / sóng thần |
| Thổ | Đại Lục Phân Liệt (EARTH-01) — Thiên thạch giáng xuống / Địa tầng nứt vỡ |
| Ánh Sáng | Lục Dực Thánh Khải (LIGHT-01) — Mưa tia ánh sáng / Lĩnh vực |
| Bóng Tối | Vạn Ảnh Thiên Kiếp (SHADOW-01) — Quả cầu bóng tối / Hấp thụ và phát nổ |
| Phong | Thiên Khí Băng Diệt — Siêu lốc di chuyển (tornado / Domain-Summon) |
| Lôi | Lôi Giới Tận Thế (LIGHTNING-01) — Bão sét phân nhánh / mưa đòn |
| Băng | Vĩnh Băng Thiên Kiếp (ICE-01) — Lĩnh vực băng giá |
| Nham | Khai Thiên Nham Ngục — Lĩnh vực nguyên tố · Nham Thiên Diệt Thế — Thiên giáng · Nham Thần Giáng Thế — Khổng lồ |
| Độc | Vạn Độc Diệt Giới (POISON-01) — Mưa axit / lĩnh vực |
| Không Gian | Không Gian Băng Diệt (SPACE-01) — Hố đen / trường hấp dẫn |
| Thời Gian | Vĩnh Hằng Chung Khúc (TIME-01) — Lĩnh vực ngưng đọng, hồi chuông và giải phóng thời gian |
| Huyết | Vạn Huyết Thiên Thượng (BLOOD-01) — Xích huyết đan thành lồng, siết vỡ qua năm đợt |
| Tinh Tú | Vạn Tinh Quy Nhất — Thiên giáng · Tinh Hà Tận Thế — Thiên giáng · Sáng Thế Tinh Vực — Xoáy hội tụ |

## Vĩnh Hằng Chung Khúc (TIME-01)

Một lĩnh vực hình cầu lớn mở rộng theo ba nhịp, phủ lớp vỏ thủy tinh mờ, mặt số phù văn và các hạt bụi nhỏ. Bốn hồi chuông thị giác vang trong trạng thái tĩnh; ở đoạn kết, vỏ nứt thành mảnh nhẹ và thời gian hồi phục từ tâm ra ngoài. Hiệu ứng dùng lại renderer, vòng hoạt ảnh và post-processing hiện có; không thêm animation loop hay renderer.

Trong Play Mode, `domainTimeScale(state, worldPosition)` ở `src/time-domain.js` trả về hệ số thời gian theo vị trí. Dummy trong vùng giảm về 0,006 lần và tiếp tục phản ứng sau khi vùng quét qua; cú bắt kịp bị giới hạn bước tối đa 0,05 giây. Camera, UI và thao tác ngắm tiếp tục theo thời gian thực. Tùy chọn **Người chơi chịu lĩnh vực thời gian** mặc định tắt. Pause dừng mô phỏng; đổi kỹ năng, phát lại hoặc đặt lại sẽ loại bỏ trạng thái cùng cast đang chạy.

Ngân sách hạt theo Low / Medium / High / Ultra là 8.000 / 25.000 / 60.000 / 90.000; mảnh vỏ lần lượt là 120 / 220 / 360 / 520. Vỏ và dư chấn dùng shader; mảnh dùng `InstancedMesh`. Post-processing tái sử dụng pass hiện có để giảm bão hòa và phủ sắc ngọc bạc nhẹ bên trong vùng.

### Mana, tầm đánh và đấu trường

- Mana tối đa 100, hồi tự nhiên 8 điểm/giây. EARTH-01 tốn 96 mana, hồi chiêu 54 giây; WIND-01 tốn 82 mana, hồi chiêu 36 giây; LIGHT-01 tốn 90 mana, hồi chiêu 48 giây; ICE-01 tốn 108 mana, hồi chiêu 60 giây; POISON-01 tốn 98 mana, hồi chiêu 56 giây; BLOOD-01 tốn 100 mana, hồi chiêu 78 giây; các skill còn lại giữ công thức mana và hồi chiêu theo AOE.
- Bật **Bỏ giới hạn mana / hồi chiêu** để bỏ cả hai giới hạn khi thử skill. Showcase luôn giữ quyền thử tự do.
- Tầm ngắm tối đa hiện dùng `max(18, skill.spread × 1.75)` đơn vị thế giới; vượt tầm thì mục tiêu bị kẹp lại và reticle đổi đỏ. Kích thước reticle đi theo `skill.spread` và `aoeScale`.
- Thanh **Bán kính ảnh hưởng** cũ điều chỉnh `aoeScale`; thanh **Bán kính đấu trường** trong Play thay biên di chuyển (30–82 đơn vị). Giá trị mặc định trong `src/main.js` là `config.arenaRadius = 58`.
- Tất cả cooldown và hồi mana dùng thời gian thực; chuyển động người chơi vẫn mượt khi skill hit-stop, slow-motion. Tạm dừng ngừng mô phỏng; đặt lại đưa pháp sư/dummy về vị trí ban đầu, hủy skill, đặt lại mana và hồi chiêu.

### Thay pháp sư procedural bằng glTF

`createPlayableSystems()` trả về adapter nhân vật `playable`; gọi `playable.replaceModel(gltf.scene, { arms: [leftArm, rightArm], legs: [leftLeg, rightLeg], cape: capeSegments, staffAnchor: staffCrystal })` sau khi tải glTF. Giữ chiều cao gần 3 đơn vị và hướng trước theo trục `-Z`; nếu thiếu ánh xạ xương, controller/camera/nhắm mục tiêu vẫn chạy nhưng model không có hoạt ảnh xương tương ứng. `staffAnchor` là socket dùng làm `castContext.origin`. Tài nguyên glTF cần được đặt trong `public/`; registry có 23 skill.

## EARTH-01 — Đại Lục Phân Liệt

Thổ chỉ còn một tuyệt kỹ: một thiên thạch đá lớn lao từ cổng trời xuống theo góc xiên, có lớp plasma khí quyển, vệt cháy và bóng đổ tiến gần mặt đất. Chuyển động giảm tốc trước va chạm, hit-stop và rung máy quay nhấn cú rơi. Điểm va chạm mở hố lõm có vành đá, làm lộ mạng nứt địa tầng, đẩy các phiến đất lên, phát sóng chấn động, đá vụn, bụi và ba dư chấn.

`src/earth-meteor.js` dựng bề mặt thiên thạch bằng hình học nhiễu, shader đá nứt phát nhiệt, shader plasma và cổng rune; mảnh đá/bụi dùng GPU, phiến đất là đá dẹt đa diện InstancedMesh. Phiến được biến dạng, nhấc lên, va xuống và lắng trong vertex shader; ma trận instance được tạo một lần, còn custom depth material dùng đúng phép biến đổi để bóng theo chuyển động. Bộ đếm mảnh đá theo Low / Medium / High / Ultra là 200 / 500 / 1.200 / 2.500; phiến đất là 12 / 22 / 36 / 40. Một PointLight của cast được dùng chung cho thiên thạch và chớp va chạm, còn ánh sáng môi trường đổi màu nâu cam rồi dịu dần. Va chạm vẫn là hoạt ảnh giải tích, không phải height-field GPU tổng quát.

Các thông số chỉnh trong `skill.earthMeteor` ở `src/main.js`: `meteor` đặt bán kính, độ gồ ghề, độ cao cổng, thời gian rơi và góc va chạm; `crater` đặt bán kính hố, độ sâu và vành; `rupture` đặt số vết nứt, bán kính lan truyền, số phiến đất và tốc độ; `aftershock.times` đặt ba nhịp dư chấn. AOE và mật độ mảnh vỡ lấy theo cấu hình hiện có. Trong Play Mode, reticle có vòng hố va chạm bên trong và vùng nứt bên ngoài.
## WIND-01 — Thiên Khí Băng Diệt

Skill Phong duy nhất dựng một siêu lốc xoáy xanh ngọc: mây mẹ nhiều lớp bị nén, phễu thò từ mây xuống đất, thân lốc nhiều lớp shader xoay lệch pha, trục uốn lượn, dây khí xoắn, xoáy phụ và váy bụi. Debris đá/mảnh vỡ dùng InstancedMesh và trường hút–nâng–xoay; một decal đất, các vòng touchdown và sóng áp suất cuối để lại dư chấn. Lốc đi theo đường cong sau khi Rune Tower tan hết, rồi rope-out và mờ dần. Silhouette thân lốc có lớp nền tương phản để dễ nhận hình ngay từ đầu hoạt ảnh; các lớp shader phủ chi tiết gió và khói. Trường gió dùng chung lấy cường độ/hướng từ Phong để làm gợn mặt đất, uốn cỏ instanced, và truyền lực cho áo choàng pháp sư trong Play Mode. Các hạt shader của mọi hệ khác và các module khói/vải riêng vẫn chưa đồng loạt đọc trường gió.

Các thông số chỉnh trong skill.tornado tại src/main.js: height 28, baseRadius 5.8, topRadius 17, layers 10, meanderAmplitude 2.2, touchdownTime 6, travelSpeed 3.8, travelDistance 28, travelPath curved và aoeInfluenceRadius 30. Mật độ mảnh bắt đầu từ debris.count 4000; hard cap Low/Medium/High/Ultra lần lượt là 450/1000/2200/4000. Cỡ mảnh được lấy từ debris.sizeRange.

Rune Tower giữ các vòng hoạt động đến touchdown 6 giây, sau đó skill.runeTower bắt đầu fade trong 3.5 giây theo outer-last, độ lệch tầng 0.14 giây. Đường di chuyển chỉ bắt đầu sau khi tower tan hết. Camera điện ảnh chuyển từ nhìn mây, hạ góc lúc touchdown, orbit trong giai đoạn trưởng thành rồi lùi rộng khi tan; chế độ xoay tự do dùng OrbitControls và cho phép quay đủ 360° với mọi hệ, bao gồm Phong. Rung nền, rung touchdown ngắn 0.04 giây và slow-motion nhẹ 0.6× trong 0.8 giây tôn trọng các tùy chọn hiện có. Phong cảnh dùng hai đèn sẵn có và pass khúc xạ dùng chung; không tạo renderer, vòng animation hay PointLight riêng cho lốc.

## Thay đổi ở bản Playable Mage

- Thêm `src/playable.js` cho pháp sư procedural, di chuyển gia tốc, chạy, nhảy, lướt, follow camera, aim, camera collision, gamepad và dummy. `src/playable.css` bổ sung HUD theo chế độ.
- `src/main.js` truyền context vào nhóm hiệu ứng ngoài cùng, giữ tâm Showcase, gắn hit/camera cinematic theo timeline sẵn có, áp mana/cooldown trong Play và giữ đúng một vòng render.
- `index.html` thêm công tắc Showcase/Play, HUD ngắm, mana, khóa mục tiêu, replay, FOV, độ nhạy và bán kính đấu trường.
- `START.bat` và bộ cài Windows hiện có được giữ nguyên.

### Vòng đời và kích thước Rune Tower

Rune Tower được giữ nguyên sau khi skill giải phóng, giữ opacity nền khoảng 68% để VFX chính vẫn nổi bật, nhận một nhịp sáng khi release và phản ứng nhẹ với shockwave. Sau sustain, mỗi tầng và vòng mờ theo làn sóng có easing; vòng vệ tinh tan trước vòng cha, còn thứ tự giữa các vòng/tầng do `fadeOrder` và `fadeStagger` quyết định. Khi Rune mờ, ký tự tách thành bụi sáng bay lên; opacity, màu phát sáng và tốc độ xoay cùng giảm, tower chỉ co tối đa 2.5% và vòng tối đa 1.8%. Mọi chuyển động/fade dùng skill time nên Pause/Resume, hit-stop và slow-motion giữ được đồng bộ. Reset dọn tháp cùng cast; Replay dựng cast mới sạch.

Mỗi skill có `skill.runeTower` riêng trong `src/main.js`: `sustainDuration` là thời gian giữ sau impact; `fadeStart` là tỷ lệ timeline bắt đầu fade; `fadeDuration` là thời lượng fade; `fadeOrder` chọn `outer-last`, `inner-last`, `top-down` hoặc `bottom-up`; `fadeStagger` đặt độ lệch pha; `towerScale` điều chỉnh kích thước tổng theo AOE của skill; `releasePulse` và `reactToShockwave` điều khiển phản ứng lúc giải phóng/xung kích. `fadeStart` và `sustainDuration` cùng xác định thời điểm fade, còn `fadeDuration` tự rút ngắn nếu cần để tháp biến mất trước khi dọn skill. Cấu hình `ringTiers` có bốn tỷ lệ 1.00, 0.68, 0.39 và 0.19 cho cấp khổng lồ, lớn, vừa và nhỏ, với tốc độ xoay và mật độ Rune riêng; vòng khổng lồ có ba nét đồng tâm phụ, vòng lớn có một nét phụ. Vệ tinh nhỏ xoay nhanh và mờ trước vòng cha. Mọi đường tròn tiếp tục được vẽ theo chu vi 0°→360° bằng draw range.

`fadeDuration` và `fadeStart` được tính riêng cho từng skill từ thời lượng kết thúc cùng impact timeline của nó. Preset Low/Medium giảm mật độ ký tự, hạt Rune và vệ tinh, nhưng vẫn giữ bốn cấp vòng. Nguyên nhân fade lỗi trước đó là nhánh cập nhật xoay ghi đè opacity đã fade của vòng chính/vòng trong; beacon vệ tinh, tia nối tầng và bụi cũng không nhận đủ hệ số fade nên còn sáng hoặc tắt không đều. Các cập nhật này nay cùng nhân hệ số fade theo vòng/tầng và timeline skill.

## LIGHTNING-01 — Lôi Giới Tận Thế / Lightning Storm Barrage

Lôi chỉ còn một tuyệt kỹ. Bão kéo mây giông ba lớp lên cao, tích điện rồi giáng tia sét xanh tím xuống vùng ngắm theo năm đợt: tĩnh điện, chạc nhánh, sét chuyền, mưa sét phủ kín và đợt kết liễu đồng loạt. Tia có thân răng cưa, nhánh nhỏ, nhiều lần chớp lại, vệt sáng tồn lưu ngắn và một tia chủ lớn nhất ở tâm trong đợt cuối. Va chạm để lại vết cháy điện, hồ quang bò trên mặt đất, bụi/tàn điện bay lên và các vòng xung kích điện.

- Thời lượng tổng: 17,2 giây; 3500 tia ở High, 1100 / 1900 / 3500 / 5800 ở Low / Medium / High / Ultra. Mỗi tia lấy một biến thể từ bộ 256 hình dạng đã dựng trước; ở High có tối đa khoảng 70 đoạn hình học cho một tia. Mọi thân sét dọc dùng chung một GPU instanced mesh và shader, không tạo mesh hay PointLight cho từng tia.
- Mây dùng ba vỏ shader thủ tục; các điểm bụi và tàn điện dùng một hệ Points; vết cháy dùng một InstancedMesh; vòng xung kích là một shader plane. Các uniform thời gian/cường độ là phần duy nhất thay đổi theo frame trong module này.
- Năm đợt dùng các mẫu phân bố khác nhau trong AOE. Đợt cuối bắt đầu ở giây 11,7; cú sét chủ chạm đất và kích hoạt hit-stop 0,08 giây ở giây 12,25. Slow-motion 0,5× chỉ chuẩn bị cho đợt cuối. Rune Tower còn sáng đến giây 14,5 rồi tan từ vòng ngoài vào trong trong 2,7 giây.
- Tùy chọn **Giảm chuyển động** hạ nhịp chớp bầu trời và giảm rung. Bán kính ngắm trong Play Mode theo AOE hiện tại. VFX dùng context điểm ngắm và không gây sát thương/đẩy dummy.

### Thông số có thể chỉnh

Cấu hình `skill.lightningStorm` trong `src/main.js` gồm `totalDuration`, `aoeRadius`, `cloud.height/layers/formDuration/dissipateStart/dissipateDuration`, ngân sách `bolts.totalByQuality` và `segmentBudgetByQuality`, `shapeVariants`, `waves`, `ground.scorchRadius/arcLifetime/crawlingArcDensity`, `skyFlash.maxHz/intensity/reducedMotionScale`, `shockwave`, `aftershock`, `cameraShake`, `hitStop`, `slowMotion` và `runeTower.fadeStart/fadeDuration/fadeOrder`. Shader và quản lý hiệu ứng nằm trong `src/lightning-storm.js`; module được gọi từ `makeUltimateAttack()` của `src/main.js` và dọn texture khi cast kết thúc, đổi phép, reset hoặc dừng an toàn.

Bản cập nhật giữ renderer, animation loop, giao diện, Play Mode, các nguyên tố khác và `START.bat` hiện có. Build được chạy lại trước khi đóng gói; chưa thể kiểm tra hình ảnh trực tiếp bằng trình duyệt trong môi trường dựng này.
 
## Báo cáo nâng cấp đồ họa dùng chung

### Kiểm kê theo mã nguồn

Registry trong src/main.js có **21 kỹ năng / 15 hệ**. ID được tạo từ thứ tự registry và giữ nguyên: FIRE-01..03, WATER-01, EARTH-01, LIGHT-01, SHADOW-01, WIND-01, LIGHTNING-01, ICE-01, MAGMA-01..03, POISON-01, SPACE-01, TIME-01, BLOOD-01, ASTRAL-01..03. Bảng dưới đây mô tả shader/vật liệu/hạt đang có trước lớp nâng cấp chung và phần hiển thị mới được áp dụng. 20 skill còn lại giữ hình thái, cấu hình và cinematic ban đầu; NATURE-01 được thêm theo yêu cầu thay hệ cuối.

| ID · Tuyệt kỹ | Hiện có: vật liệu, shader, hạt và hiệu ứng | Sau nâng cấp · chi phí thêm |
|---|---|---|
| FIRE-01 · Thiên Nhật Diệt Thế | Nhiều vỏ lõi dùng shader nhiệt đen thân, corona instanced, prominence và vòng va chạm. | PBR có IBL/bóng cho bề mặt chuẩn; mặt đất có vết than và nứt nóng; tia thể tích tùy bật. Nhẹ–vừa. |
| WATER-01 · Hải Thần Lĩnh Vực | Shader cổng và sóng, cá voi, giọt/splash instanced, bọt và các vòng triều. | IBL cho vật liệu chuẩn; vệt nước tối, giảm roughness và caustic chuyển động trên nền. Vừa–cao. |
| EARTH-01 · Đại Lục Phân Liệt | Shader thiên thạch, hố và mạng nứt; đá chuẩn instanced, bụi Points và dư chấn. | Đá PBR nhận nhiễu vi bề mặt/IBL/bóng; nền có vùng nứt, bụi màu đất và biến dạng nhẹ. Vừa. |
| LIGHT-01 · Lục Dực Thánh Khải | Shader tia photon instanced, hạt ở cổng, sparks, vết đánh dấu và dư chấn. | PMREM phản chiếu trên vật liệu chuẩn; tia thể tích 6 mẫu tùy bật; nền nhận ánh sáng nhẹ. Vừa. |
| SHADOW-01 · Vạn Ảnh Thiên Kiếp | Shader quả cầu, dải hút xoắn GPU, Points, xúc tu/mảnh instanced, phủ tối trong pass chung. | PBR/IBL và bóng cho bề mặt chuẩn; nền nhận tối/AO giả lập, dấu nứt và trạng thái được xóa khi dọn cast. Vừa. |
| WIND-01 · Thiên Khí Băng Diệt | Shader phễu lốc, mây nhiễu, dải khí, bụi và đá instanced, sóng áp suất. | Bóng mềm cho mesh vật lý; nền biến dạng nhẹ theo gió và tia thể tích tùy bật. Vừa–cao. |
| LIGHTNING-01 · Lôi Giới Tận Thế | Shader mây và tia sét răng cưa phân nhánh, Points tàn điện, vết cháy instanced, shockwave. | Nền có vết cháy/nứt theo cường độ; vật liệu chuẩn nhận bóng/IBL; tia thể tích tùy bật. Vừa. |
| ICE-01 · Vĩnh Băng Thiên Kiếp | Shader băng và mặt đóng băng, gai/tinh thể instanced, bụi lạnh và mảnh vỡ. | Nền có lớp sương giá PBR, độ nhám thay đổi và caustic lạnh giả lập; dấu được xóa khi cast kết thúc. Vừa. |
| MAGMA-01 · Khai Thiên Nham Ngục | Dựng bằng shader nguyên tố dùng chung, hình khối núi lửa, cổng, mảnh và hạt phát sáng. | Áp lớp PBR/bóng cho vật liệu chuẩn; nền nhận vết cháy, nứt nóng và caustic tắt. Nhẹ–vừa. |
| MAGMA-02 · Nham Thiên Diệt Thế | Shader nguyên tố nham, thiên thạch instanced, vệt rơi và dòng magma. | IBL/bóng cho bề mặt chuẩn; overlay nền cháy và nứt theo nhịp impact, tự trả về. Vừa. |
| MAGMA-03 · Nham Thần Giáng Thế | Shader nguyên tố nham, hình thể titan ghép từ ống/khối và hạt than. | IBL/bóng cho phần mesh vật lý; dấu nhiệt/nứt tạm trên nền và hiệu ứng thể tích nhẹ. Vừa. |
| POISON-01 · Vạn Độc Diệt Giới | Shader mây độc/mưa, giọt axit và splash instanced, vũng ăn mòn, Points. | Nền có vệt ăn mòn xanh nâu và thay đổi độ nhám; tia thể tích nhẹ, không thêm đèn từng giọt. Vừa. |
| SPACE-01 · Không Gian Băng Diệt | Shader chân trời sự kiện/đĩa bồi tụ, bụi Points, đá PBR instanced và lensing trong pass dùng chung. | Đá chuẩn nhận IBL/bóng; nền có SSR chọn lọc khi bật và AO theo preset; lensing vẫn là méo màn hình giả lập. Vừa. |
| TIME-01 · Vĩnh Hằng Chung Khúc | Shader trường thời gian nhiều lớp, vòng/kim đồng hồ, Points, afterimage và grade trong pass chung. | Mặt đất nhận AO tiếp xúc nhẹ; các lớp PBR nhận IBL; distortion chạy trước pass xuất màu cuối. Nhẹ. |
| BLOOD-01 · Vạn Huyết Thiên Thượng | Vật liệu physical cho một số xích, shader huyết, móc/xích instanced, Points, stain và sóng. | Vật liệu chuẩn tăng biến thiên nhám/IBL; nền có dấu đỏ sẫm tạm thời, giữ mức hiển thị tiết chế. Vừa. |
| ASTRAL-01 · Vạn Tinh Quy Nhất | Shader nguyên tố tinh tú dùng chung, lõi/đá sao, vòng quỹ đạo và hạt. | PBR/IBL/bóng cho mesh chuẩn; nền nhận phản ứng ánh sáng và AO tiếp xúc nhẹ. Nhẹ–vừa. |
| ASTRAL-02 · Tinh Hà Tận Thế | Shader tinh tú, chòm sao/cột sáng và hạt điểm. | PMREM cho mesh chuẩn; tia thể tích tùy bật và nền có phản ứng nhẹ theo pulse. Nhẹ–vừa. |
| ASTRAL-03 · Sáng Thế Tinh Vực | Shader thiên hà, dải xoắn, sao và bụi điểm. | Nhiễu vi bề mặt/IBL cho mesh chuẩn; light shaft dùng 6 mẫu cố định trong pass hiện có. Vừa. |

### Pipeline trước → sau

- Renderer: một WebGLRenderer, một EffectComposer, một vòng animate(). Giữ ACES Filmic tone mapping và không gian màu sRGB; thêm môi trường phòng procedural được lọc bằng PMREMGenerator.
- Post-processing vẫn nằm trong cùng EffectComposer: RenderPass → SSR trên nền (khi bật) → GTAO ở High/Ultra hoặc SSAO nửa độ phân giải ở Medium → DoF tùy chọn → Bloom → một ShaderPass distortion → OutputPass. OutputPass cuối áp dụng tone mapping ACES và chuyển sang sRGB sau các shader hậu kỳ. SSR/GTAO/SSAO/DoF dùng addon Three.js chính thức, được tạo khi cần và dispose render target khi tắt; distortion vẫn là pass dùng chung.
- Chiếu sáng/bóng: HemisphereLight và DirectionalLight hiện có được giữ; DirectionalLight đổ PCF soft shadow ở High/Ultra. Mesh có vật liệu Standard/Physical nhận bóng chọn lọc; không tạo PointLight theo từng hạt.
- PBR: vật liệu Standard/Physical trên các mesh được đăng ký khi mở cảnh và khi bắt đầu cast nhận nhiễu vi mô, PMREM, ánh sáng skill ảo và mask bề mặt cục bộ (ướt, cháy, băng giá, axit, huyết, bụi, bùn, nóng). Tán xạ dưới bề mặt và ánh sáng gián tiếp là xấp xỉ, không phải SSS/GI vật lý. ShaderMaterial tự viết giữ shader riêng và cần tích hợp thủ công nếu muốn dùng những uniform này.
- Mặt đất: PlaneGeometry chia 96×96. Shader chung thêm vết ướt, cháy, sương giá, axit, huyết, bụi, bùn, nứt, nóng sáng, AO/caustic giả lập, gợn gió và tối đa tám nguồn Light Injection ảo; mỗi cast hiện phát một nguồn. Mask lan theo tâm/bán kính skill, rồi được xóa khi dừng/reset.
- Hạt: không thêm hạt CPU mới, mesh riêng cho từng hạt, render target hoặc renderer thứ hai. Hệ hạt hiện có giữ cách mô phỏng theo từng module; chưa chuyển toàn bộ hạt và mảnh vỡ CPU của dự án sang GPU physics.
- Môi trường: IBL procedural có prefilter PMREM, fog hiện có, ánh sáng theo nguyên tố và shader phủ nền được dùng lại; chưa có HDRI bên ngoài.
- Giới hạn còn lại: SSR là ray march screen-space chọn lọc trên nền, mất phản chiếu ngoài màn hình và không có temporal accumulation; PMREM IBL là lớp dự phòng. GTAO/SSAO dùng pass màn hình tiêu chuẩn, không phải ánh sáng toàn cục. Caustic, volumetric 6 mẫu, Light Injection, gió chung và SSS là xấp xỉ. Chưa có PCSS/VSM, ray/path tracing, caustic khúc xạ vật lý, motion blur theo từng vật thể, mô phỏng va chạm GPU tổng quát, height/depth field GPU dùng chung hay decal texture atlas.

### Preset, điều khiển và tự giảm tải

Mở Đồ họa nâng cao trong bảng bên phải để bật/tắt từng mục. Đổi preset sẽ nạp lại mặc định của preset; có thể đổi từng công tắc sau đó.

| Preset | SSR | AO màn hình | IBL fallback | Bóng Directional | Volume / Caustic | SSS giả lập | Nhòe |
|---|---|---|---|---|---|---|---|
| Low | Tắt | Tắt | Bật | Tắt | Tắt | Tắt | Tắt |
| Medium | Nửa độ phân giải | SSAO nửa độ phân giải | Bật | Tắt | Tắt | Tắt | Tắt |
| High | Đầy đủ · nền chọn lọc | GTAO | Bật | PCF 1024² | Bật | Bật | Tắt |
| Ultra | Đầy đủ · nền chọn lọc | GTAO | Bật | PCF 2048² | Bật | Bật | Bật |

Chất lượng thích ứng dùng thời gian khung hình trung bình và hysteresis: sau nhiều khung hình chậm sẽ hạ nhòe, DoF, volume, caustic, SSR, AO, rồi SSS theo thứ tự; chỉ bật lại từng mục sau khi có khoảng dư hiệu năng ổn định. Bộ watchdog cũ vẫn giảm mật độ projectile/mảnh vỡ nếu render quá chậm. Tắt tính năng sẽ dispose pass/render target; bật lại sẽ tạo pass một lần. Giảm chuyển động tắt DoF, nhòe và tia thể tích.

Nhấn **F3** để mở debug overlay: FPS/frame time, draw call/triangle, số instance và điểm hạt, bộ nhớ geometry/texture, trạng thái pass và ước tính bộ nhớ render target. `renderer.info` không báo dung lượng VRAM chính xác; con số render target là ước tính theo kích thước/định dạng buffer.

Các module đồ họa lõi nằm trong `src/graphics/core/`: `post-effects.js` quản lý pass và dispose, `fields.js` quản lý gió/đèn ảo, `wind-grass.js` dựng cỏ bằng một InstancedMesh duy nhất, còn `debug-overlay.js` trình bày số đo. Để nối một skill mới, gọi `graphics.updateSurface({time, center, radius, wet, burn, frost, acid, blood, dust, mud, heat, crack, wind, windDirection, light, shadow})` theo timeline; `windDirection` là vector X/Z. Gọi `graphics.setLightSources([{position, color, intensity, radius}])` để đẩy tối đa tám nguồn sáng shader (Low chỉ giữ một), và `graphics.resetSurface()` khi kết thúc hoặc hủy cast. Vật liệu Standard/Physical trong root cast được đăng ký bằng `graphics.enhanceSurfaces(root)`. ShaderMaterial tự viết phải khai báo và dùng uniform riêng nếu cần phản ứng tương tự. Cỏ và áo choàng pháp sư hiện đọc gió; particle shaders của các hệ khác chưa được nối đồng loạt.

### Đánh giá độ chân thật và giới hạn

Lớp nâng cấp cải thiện chiều sâu ánh sáng môi trường, độ nhám vi mô của các mesh PBR, bóng cho vật thể lớn, và tương tác mặt đất theo nguyên tố. Các module Thủy, Thổ, Phong, Hỏa, Băng, Độc, Lôi, Ánh Sáng, Bóng Tối, Huyết, Không Gian, Thời Gian đã có shader/hạt riêng trước thay đổi; các kỹ năng Nham và Tinh Tú dùng nền shader nguyên tố dùng chung. Chất lượng vật liệu custom ShaderMaterial và vật lý từng module không đồng nhất: hệ thống này không thể tự làm mọi vỏ phát sáng thành bề mặt PBR thật, cũng không thay một mô phỏng chất lỏng/khói/đá GPU tổng quát. Không tuyên bố chất lượng tương đương game ray tracing AAA.

### Tệp thay đổi

- Tạo `src/graphics/core/post-effects.js`, `fields.js`, `wind-grass.js`, `debug-overlay.js` cho SSR/AO/DoF, trường gió/đèn ảo, cỏ instanced và số liệu F3.
- Sửa `src/graphics-upgrade.js` cho preset/adaptive quality có hysteresis, enhancer PBR, ánh sáng ảo, SSS xấp xỉ, trạng thái bề mặt trên nền/mesh và tương tác mặt đất.
- Sửa `src/main.js` để nối pass vào EffectComposer hiện có, trường skill light/wind, adaptive monitor và WebGL context recovery.
- Sửa `index.html` để thêm các công tắc đồ họa có thể thu gọn.
- Cập nhật README và dựng lại dist/.
- Không xóa tệp. Giữ nguyên START.bat, số lượng/ID/tên kỹ năng, bố cục timeline và Play Mode.

### Kiểm thử và phần chưa xác nhận

- `node --check` qua cho toàn bộ JavaScript trong `src/` và cấu hình Vite. Smoke test CPU xác nhận cỏ theo preset và fade theo gió; shader PBR nhận uniform bề mặt/Light Injection; dust/heat dẫn xuất đúng, reset wind/surface và dispose được.
- Smoke test riêng chạy 10 cast mô phỏng cho từng module Thủy, Thổ, Băng, Lôi, Ánh Sáng, Độc, Huyết, Bóng Tối, Không Gian, Thời Gian; mỗi cast cập nhật ở đầu, cao trào và aftermath rồi dispose. Test đã bắt và sửa lỗi index geometry ở mảnh vỡ Bóng Tối. Đây là test CPU không-GPU, không thay cho kiểm tra shader/ảnh trực quan.
- Build sản xuất bằng Vite thành công. `npm.cmd` không có trong môi trường dựng nên đã chạy Vite bằng Node đi kèm; chưa chạy được `npm.cmd install`.
- Build báo chunk JavaScript vượt khuyến nghị 500 kB; đây là cảnh báo bundle, không phải lỗi build.
- Chưa đo FPS trên GPU và chưa kiểm tra trực quan skill ở đầu/cao trào/aftermath. Vì vậy chưa xác nhận được biên dịch shader trên GPU thật, artifact hình ảnh, cast 10 lượt, bật/tắt pass khi đang cast hay khôi phục context.
- Lần build cuối: app 367.78 kB, add-ons 112.28 kB, Three core 535.18 kB minified (tổng JS khoảng 1,015.24 kB); chỉ chunk Three core vượt ngưỡng khuyến nghị 500 kB. Gzip tương ứng: 117.36 / 23.93 / 136.58 kB. Build vẫn thành công.
- Shader hạt nền chung đã giới hạn kích thước điểm theo khoảng cách camera có chặn độ sâu nhỏ để tránh kích thước bất thường khi hạt tiến sát camera.
- Đã có pass SSR/GTAO/SSAO/DoF thật của Three.js; chưa có SSR temporal, DoF mặc định tắt, và các hiệu ứng volume/caustic/SSS/Light Injection vẫn là xấp xỉ. Không gọi đây là ray tracing thật hay chất lượng đã kiểm chứng ngang AAA.

 
Bảng hiện có liệt kê phần thể hiện và lớp nâng cấp; đây là các điểm yếu quan sát từ cấu trúc mã nguồn trước lớp nâng cấp chung. Mức chi phí ghi trong bảng là ước lượng tương đối theo số mẫu shader/bóng, chưa phải benchmark.

| ID · Tuyệt kỹ | Điểm yếu chính còn lại sau nâng cấp |
|---|---|
| FIRE-01 · Thiên Nhật Diệt Thế | Lõi plasma vẫn là shader phát sáng; khói và truyền nhiệt không tham gia mô phỏng đối lưu/va chạm đầy đủ. |
| WATER-01 · Hải Thần Lĩnh Vực | Beer–Lambert/Fresnel và sóng analytic đã bổ sung; chưa có refraction scene-color, FFT/Gerstner solver, SSR riêng trên mặt nước hay giọt tương tác vật lý. |
| EARTH-01 · Đại Lục Phân Liệt | Phiến đá đa diện chạy theo shader và bóng dùng depth material tương ứng; mảnh đá/địa tầng vẫn là hoạt ảnh VFX, chưa có height-field collision hoặc solver GPU tổng quát. |
| LIGHT-01 · Lục Dực Thánh Khải | Tia photon còn là vật liệu phát sáng instanced; tán xạ thể tích được xấp xỉ trong hậu kỳ, không có photon/light transport. |
| SHADOW-01 · Vạn Ảnh Thiên Kiếp | Vùng tối là hậu kỳ và shader nền, không thật sự hấp thụ nguồn sáng của cảnh hay hút mọi mesh vật lý. |
| WIND-01 · Thiên Khí Băng Diệt | Trường gió chung làm gợn nền, uốn cỏ instanced và truyền lực cho áo choàng Play Mode; shader hạt của các hệ khác và khói/vải riêng chưa đọc đồng loạt trường này. |
| LIGHTNING-01 · Lôi Giới Tận Thế | Phân nhánh tia là procedural, nhưng ion hóa không khí, bóng chớp đồng bộ và điện tích vật lý chỉ được gợi bằng shader/flash. |
| ICE-01 · Vĩnh Băng Thiên Kiếp | Khúc xạ/sương/caustic là xấp xỉ; băng chưa có thể tích trong suốt, tán xạ dưới bề mặt hoặc fracture solver. |
| MAGMA-01 · Khai Thiên Nham Ngục | Vật liệu thêm dòng nhiệt và khe dung nham; dòng chưa chảy/đông đặc theo độ nhớt và trọng lực. |
| MAGMA-02 · Nham Thiên Diệt Thế | Thiên thạch/vệt dùng vật liệu nham có khe nóng; chưa có truyền nhiệt vật lý hay vệt magma tích lũy thành hình học. |
| MAGMA-03 · Nham Thần Giáng Thế | Phần mesh nham có shader nứt nóng; titan vẫn ghép từ các phần hình học, chưa có biến dạng khớp/khối lượng. |
| POISON-01 · Vạn Độc Diệt Giới | Mưa axit/mây độc có shader và instance; chưa mô phỏng phản ứng hóa học, ăn mòn mesh hay vũng chất lỏng có nhớt thật. |
| SPACE-01 · Không Gian Băng Diệt | Lensing là méo màn hình giả lập; không có ray bending, SSR hoặc mô phỏng thủy triều vật lý chính xác. |
| TIME-01 · Vĩnh Hằng Chung Khúc | Lĩnh vực màu/afterimage là hậu kỳ; không lưu và phát lại trạng thái vật lý trước đó của từng vật thể. |
| BLOOD-01 · Vạn Huyết Thiên Thượng | Xích/huyết có mesh và shader; vết đỏ không phải decal texture lưu, chất lỏng chưa có độ nhớt/SSS đầy đủ. |
| ASTRAL-01 · Vạn Tinh Quy Nhất | Lõi/vật thể dùng bề mặt tinh vân và sao PBR; quỹ đạo chưa giải bằng hấp dẫn N-body. |
| ASTRAL-02 · Tinh Hà Tận Thế | Cột/chòm sao giữ geometry và hạt, vật liệu thêm Fresnel/sao; chưa có chiếu sáng thể tích shadow-aware. |
| ASTRAL-03 · Sáng Thế Tinh Vực | Vật liệu thêm các dải tinh vân và bụi sao; vẫn là shader/dải xoắn giải tích, không có hấp dẫn N-body. |


### Âm thanh và assets mới (nhánh Draft PR #1)

Mở **ÂM THANH → BẬT ÂM THANH** trong bảng điều khiển. Có âm lượng tổng và nền gió tùy chọn; âm thanh mặc định tắt cho đến khi người chơi bật. 15 hệ dùng 7 lớp WAV mỗi hệ theo timeline của 21 skill, có âm 3D, pause/slow motion và preload/cache giới hạn. Không đổi ID, tên hoặc hình thái kỹ năng.

- [Nghe thử, video và kết quả kiểm thử](docs/PREVIEW.md)
- [Kiểm kê assets và nguồn tạo](ASSET_INVENTORY.md)
- `npm run test:audio` (server dev mặc định: cổng 5173), `python tests/playwright_audio_lifecycle.py --url <URL-dev>`; có thể đổi URL bằng `--url`.
- `npm run assets:generate` cần Python + numpy, chỉ dùng để tái tạo WAV/SVG đã commit; runtime không cần Python.
- `npm run automation:plan` chọn task offline. [Template điều phối](automation/README.md) chưa kích hoạt và không tự phát sinh chi phí/lịch chạy.
