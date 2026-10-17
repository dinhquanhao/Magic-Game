## Bản bàn giao đang chốt — Thảo

Tệp người dùng gửi sau cùng nhắc lại thay hệ cuối bằng Thảo và giữ các hệ còn lại. Bản runtime hiện tại tập trung hoàn tất Thảo; các mở rộng11lớp và gate đã soạn được lưu tại docs/drafts/graphics, chưa import/chưa nghiệm thu. Mọi kế hoạch đồ họa bên dưới tiếp tục được giữ, không gọi là đã triển khai. Tập trung đóng ZIP Thảo và xử lý cảnh báo context cleanup có bằng chứng.

## Cập nhật ưu tiên mới nhất (hai tài liệu bổ sung)

Tài liệu cuối mở ma trận lên **11 lớp / mọi skill** và đổi thứ tự thành: GĐ1 nền tảng chung → GĐ2 trình tự rune/commit/fade → GĐ3 từng hệ → giao thoa/độ bền/bàn giao. Quy định này thay thứ tự rune-trước ở mục khảo sát bên dưới. Khảo sát đã làm và module gate đang soạn được giữ an toàn, chưa tích hợp vào runtime và chưa gọi là nghiệm thu. Không đổi21skill/15hệ hiện tại.

11lớp: hình khối; PBR/shader; particles; vật lý; ánh sáng/bóng; môi trường; thứ cấp/decal; hậu kỳ; cinematic; rune; audio. Mọi lớp có cột có/thiếu/bằng chứng trong ma trận sắp kiểm kê. Nền tảng hiện có nhiều xấp xỉ; không đồng nhất “có checkbox” với hoàn thành raymarch/PCSS/GPU height field.

# Trạng thái mới nhất — đồ họa và trình tự rune, 17/10/2026

Registry hiện tại: **15 hệ / 21 skill**, kế thừa checkpoint Thảo fad20b0 đã push. Các số23 trong nhật ký phía dưới là số tại thời điểm lịch sử, không phải registry hiện hành. Giữ mọi ID/tên/cấu hình/cinematic của21skill này. Yêu cầu mới ưu tiên Giai đoạn1 trình tự rune, nghiệm thu toàn registry trước khi mở Giai đoạn2 đồ họa chung và từng hệ. Không dựng lại dự án, không renderer/RAF thứ hai, không merge main.

## Khảo sát timeline trước sửa theo yêu cầu mới

- Khởi tạo ở castUnsafe: root cơ sở ẩn; Rune Tower dựng bằng nhiều Line/Mesh/Points; transfer rune riêng; PointLight skill; makeUltimateAttack dựng group hiệu ứng dưới effect. Một số factory tự đặt group ẩn, nhiều module riêng để group hiện ngay trong init. Thảo còn gọi updateCast nên vòng/pollen riêng có thể hiện trước release.
- `charging`: elapsed/(castTime×pace/runeDrawSpeed), Rune Tower vẽ tới100%; attack.updateCast có thể hoạt động; đèn skill tăng2→10. `channeling`: thêm .58+.26×pace giây, Rune Transfer hội tụ; skill light tăng9→24. Sau đó phase=active, activeTime=0 và root xuất hiện. Không có một gate chung chặn mọi mesh/emitter/uniform của các factory.
- `active`: attack.update(activeTime), cinematic vẫn tính theo activeTime; Tower update dùng runeTower.fadeAt/fadeDuration/timelineEnd của từng skill nên có thể tồn tại tới impact/aftermath. Group vẫn giữ geometry cho tới khi cast kết thúc. Có fade opacity/scale theo tier nhưng chưa có hợp đồng fade chung1.2–2.5giây tại commit và dispose sớm.
- Sơ đồ trước: bấm cast → charging (Rune0→100%, vài module skill/đèn đã hiện) → channeling (Rune100% + transfer, skill light) → activeTime0 (root/attack) → fade Tower muộn theo từng plan → kết thúc/dispose toàn cast.
- Rune Tower luôn có cho21skill. Tái sử dụng cơ chế layerCount/ringsPerLayer/profile/update/release; thêm ground overlay subdivided và wrapper fade, không đổi registry/profile/plan cũ. Snapshot source audit và src trước sửa lưu ngoài repo để đối chiếu.

## Kế hoạch nghiệm thu mới

1. Gate chung trước COMMIT: toàn bộ visual group của skill ẩn, chưa update attack, skill light/wind/surface/post tắt; chỉ rune/transfer và cue rune. Vẽ Rune0→90% ở charging,90→100% ở channeling; tổng thời gian chuẩn bị cũ giữ nguyên. COMMIT trùng100% và activeTime0.
2. RELEASE: fade mặc định1.8giây skill time, emissive giảm trước, radial noise dissolve ngoài→trong, tier tắt so le, rune dust/ground light về0, dispose sớm Tower/transfer/overlay. ACTIVE giữ nhịp/cinematic nội bộ.
3. Kiểm thử toàn21skill ở trước/commit/giữa fade/hết fade/impact/aftermath; pause/replay/reset/rapid select, giữ heap/GPU resources ổn định. Đạt Giai đoạn1 mới chuyển nền đồ họa chung.
4. Phạm vi Giai đoạn2–3 gồm A1–A18 và5lớp mọi hệ theo thứ tự mới; các tính năng hiện có phải được audit/chạy thật, không gọi stub/chưa tích hợp là hoàn thành. FPS GPU thật cần phần cứng phù hợp; SwiftShader/CPU submission không phải bằng chứng FPS native.

## Trạng thái hiện tại

Khảo sát đã ghi trước sửa. Chưa triển khai gate/fade mới, chưa nghiệm thu Giai đoạn1 mới. Bằng chứng Thảo trước yêu cầu mới đang được lưu/đóng gói riêng; không dùng nó thay cho kết quả gate mới.

---

# Tiến độ nâng cấp Arcane VFX Studio

## Phạm vi và quy tắc

- Tiếp tục trên dự án hiện có `outputs/Arcane-VFX-Studio-Wind-Tornado`; ZIP gốc được giữ làm nguồn tham chiếu. Không tạo dự án mới, không đổi `START.bat`, UI chính, Play Mode, timeline, Rune Tower, hay registry skill.
- Đếm từ `src/main.js`: 15 hệ, 23 skill. Registry hiện tại: FIRE-01..03, WATER-01, EARTH-01, LIGHT-01, SHADOW-01, WIND-01, LIGHTNING-01, ICE-01, MAGMA-01..03, POISON-01, SPACE-01, TIME-01, BLOOD-01, ASTRAL-01..03.
- Tình trạng đầu đợt này: `src/graphics-upgrade.js` đã thêm PMREM RoomEnvironment, nhiễu màu/roughness trên MeshStandard/Physical, shader mặt đất trạng thái, ánh sáng môi trường, bóng PCF mềm và các xấp xỉ hậu kỳ trong một pass distortion hiện có. Chưa có SSR/GTAO/SSAO/DoF thật, temporal SSR, debug overlay, trường gió/đèn chung có giao diện riêng, hay adaptive quality có hysteresis/hồi phục. Chưa có số FPS đo bằng GPU.
- Pipeline ban đầu: một `WebGLRenderer`; `EffectComposer` theo thứ tự RenderPass → UnrealBloomPass → một ShaderPass distortion; một `animate()`; ACES Filmic/sRGB; một DirectionalLight và HemisphereLight; một plane nền chia 96×96; một bộ nâng cấp vật liệu/mặt nền; dọn mesh/material/geometry trong `disposeTree`. Các shader custom vẫn dùng quy trình riêng; không tuyên bố ray tracing thật.

## Hồ sơ registry theo mã nguồn

| ID / tên | Module và hình thái chính hiện tại | Hạn chế đã biết ở đầu đợt |
|---|---|---|
| FIRE-01 Thiên Nhật Diệt Thế | `src/main.js`; shader lõi plasma, corona instanced, prominence, vòng va chạm | Không mô phỏng truyền nhiệt/khói/va chạm vật lý tổng quát |
| FIRE-02 Phượng Hoàng Tận Thế | `src/main.js`; shader lửa, lông instanced, ember/khói | Không có solver lông/vải; lửa là shader VFX |
| FIRE-03 Vạn Hỏa Thiên Phạt | `src/main.js`; cổng, giáo/đạn instanced, hạt lửa | Dấu cháy là shader trạng thái tạm, không phải decal texture lưu |
| WATER-01 Hải Thần Lĩnh Vực | `src/ocean-dominion.js`; cá voi, sóng/foam shader, hạt giọt/splash | Chưa có Beer–Lambert, FFT/Gerstner fluid hay phản xạ màn hình trước đợt này |
| EARTH-01 Đại Lục Phân Liệt | `src/earth-meteor.js`; thiên thạch, đá instanced, bụi và nứt | Chuyển động/va chạm mang tính VFX, chưa phải solver địa hình/GPU |
| LIGHT-01 Lục Dực Thánh Khải | `src/light-ray-rain.js`; cổng và tia photon instanced, điểm impact | Tán xạ thể tích chỉ xấp xỉ |
| SHADOW-01 Vạn Ảnh Thiên Kiếp | `src/shadow-orb.js`; cầu hút, dải shader, xúc tu/mảnh instanced | Lớp tối là shader/hậu kỳ, không hấp thụ ánh sáng cảnh thật |
| WIND-01 Thiên Khí Băng Diệt | `src/main.js`; phễu lốc shader, mây, streamline/bụi/đá instanced | Gió chưa là trường chung cho tất cả vật liệu/hạt |
| LIGHTNING-01 Lôi Giới Tận Thế | `src/lightning-storm.js`; mây, tia phân nhánh, vết cháy/hạt | Ion hóa và chiếu sáng đoạn sét là xấp xỉ |
| ICE-01 Vĩnh Băng Thiên Kiếp | `src/ice-freeze.js`; nền băng, gai tinh thể instanced, sương | Khúc xạ/SSS/caustic là xấp xỉ; không có fracture solver |
| MAGMA-01 Khai Thiên Nham Ngục | `src/main.js`; shader nham, núi lửa/cổng/mảnh | Dùng nhiều vật liệu VFX, chưa có dòng nham nhớt vật lý |
| MAGMA-02 Nham Thiên Diệt Thế | `src/main.js`; thiên thạch nham, dòng magma | Chưa mô phỏng nhiệt độ/độ nhớt vật lý |
| MAGMA-03 Nham Thần Giáng Thế | `src/main.js`; titan ghép hình học và than hồng | Không có solver khớp/địa hình |
| POISON-01 Vạn Độc Diệt Giới | `src/poison-acid-rain.js`; mây, mưa giọt instanced, vũng/splash | Phản ứng ăn mòn chỉ biểu diễn bằng shader |
| SPACE-01 Không Gian Băng Diệt | `src/space-black-hole.js`; lỗ đen/đĩa bồi tụ, bụi và đá | Lensing là méo màn hình giả lập |
| TIME-01 Vĩnh Hằng Chung Khúc | `src/time-domain.js`; trường nhiều lớp, đồng hồ, afterimage | Không ghi/phát lại trạng thái vật lý đầy đủ của thế giới |
| BLOOD-01 Vạn Huyết Thiên Thượng | `src/blood-chain-net.js`; xích instanced, hạt/vệt/stain | Chất lỏng/SSS chưa vật lý |
| ASTRAL-01 Vạn Tinh Quy Nhất | `src/main.js`; shader lõi/sao và quỹ đạo | Hấp dẫn không phải N-body |
| ASTRAL-02 Tinh Hà Tận Thế | `src/main.js`; chòm sao/cột sáng và hạt | Ánh sáng thể tích còn là xấp xỉ |
| ASTRAL-03 Sáng Thế Tinh Vực | `src/main.js`; dải xoắn/thiên hà và bụi điểm | Hạt không có tương tác hấp dẫn |

Quy ước hồ sơ: geometry/hạt/đèn/hậu kỳ/cleanup chi tiết sẽ được bổ sung sau khi đọc từng module; nếu không được xác minh trực tiếp, đánh dấu chưa kiểm kê thay vì suy đoán. Chi phí và FPS chỉ ghi khi đo được.

## Kế hoạch giai đoạn

1. **Giai đoạn A — nền đồ họa chung:** khảo sát và ổn định pipeline; hoàn thiện post-effects theo preset (SSR/GTAO/SSAO/DoF tùy khả năng tương thích), fallback IBL, SSS giả lập, volumetric/caustic, điều khiển riêng, adaptive quality có hysteresis, debug overlay, giới hạn tài nguyên và progress log. Build + smoke check trước khi chuyển giai đoạn.
2. **Giai đoạn B — Thủy, Thổ, Phong:** làm theo thứ tự người dùng yêu cầu; giữ hình thái/timeline và ngân sách Low/Medium. Sau mỗi hệ build, kiểm tra tĩnh; ghi rõ không thể xem trực quan nếu trình duyệt không khả dụng.
3. **Giai đoạn C — Hỏa, Băng, Lôi, Độc, Ánh Sáng, Bóng Tối, Huyết, Không Gian, Thời Gian.**
4. **Giai đoạn D — Nham và Tinh Tú và kiểm thử giao thoa mọi hệ.**
5. **Giai đoạn E — audit registry/lifecycle/hiệu năng, README, build cuối, ZIP không kèm `node_modules`.**

## Nhật ký

### Khởi đầu / kiểm kê

- Đã xác nhận dự án hiện có tại `outputs/Arcane-VFX-Studio-Wind-Tornado`; tệp ZIP gốc nhỏ hơn là nguồn khởi đầu, không phải cây đang chạy đủ 23 skill.
- Đã đọc registry và mô-đun dùng chung; chưa có `UPGRADE_PROGRESS.md` trước lượt này.
- Build/FPS/console/visual: chưa chạy trong lượt kiểm kê này.
- Việc tiếp theo: hoàn thiện Giai đoạn A, giữ từng bộ đếm và giới hạn theo mức chất lượng; sau đó build và ghi kết quả thực tế.

### Giai đoạn A — nền đồ họa chung (triển khai và build)

- Tạo `src/graphics/core/post-effects.js`: SSR chọn lọc nền, GTAO/SSAO theo preset, Bokeh DoF tùy chọn. Tạo pass khi bật và dispose target khi tắt; giữ cùng EffectComposer. Hạn texture unit thấp dùng IBL/SSAO hoặc tắt hiệu ứng làm fallback. SSR không có temporal accumulation.
- Tạo `src/graphics/core/fields.js`: uniform gió và tối đa 8 nguồn Light Injection ảo; Low giới hạn 1 nguồn. Gió Phong hiện tác động nền và hướng gió truyền cho Play Mode; các shader hạt của toàn bộ 15 hệ chưa được chuyển đồng loạt sang trường chung.
- Tạo `src/graphics/core/debug-overlay.js`: F3 hiển thị frame time/FPS, draw call, tam giác, instance/điểm hạt, bộ nhớ geometry/texture, trạng thái đồ họa và ước tính target.
- Sửa `src/graphics-upgrade.js`: preset, SSS viền xấp xỉ, trường nền, fallback IBL luôn bật, adaptive quality với EMA/hysteresis và hồi phục từng bước.
- Sửa `src/main.js`, `index.html`: nối pass/field vào loop hiện có; thêm công tắc SSR, AO, volumetric, caustic, SSS, blur, DoF, adaptive; thêm xử lý context lost/restored; không thêm renderer hay vòng lặp.
- Thêm `vite.config.js` để tách app, addons và Three core thành chunk riêng.
- Build: **đạt** (`vite build` qua; 43 module transformed). `node --check` qua 6 tệp JS. Smoke check trường gió/giới hạn 1 nguồn ánh sáng ở Low: **đạt**. Kiểm tra 8 control ID: không trùng và đều có tham chiếu JS.
- Build size ở lần kiểm tra cuối: app 358.57 kB, addons 112.28 kB, Three core 535.18 kB minified; còn cảnh báo duy nhất vượt 500 kB ở chunk core, gzip 136.58 kB.
- Post-effects lifecycle smoke test: Medium tạo SSR 50% + SSAO + DoF tùy chọn; High tạo SSR + GTAO; chuyển Low phát dispose event của target SSR; thứ tự pass và dispose cuối lượt đạt trong test không-GPU.
- Xác nhận lại sau các sửa mới nhất: `node --check` qua cho 8 tệp; build qua với 43 module. Smoke test cập nhật `updateWind()` trực tiếp, giới hạn đèn Low, tạo SSR/SSAO/DoF ở Medium, tắt SSR khi phản chiếu khô, và đúng thứ tự SSR/GTAO trước Bloom: đạt.
- Audit cú pháp toàn bộ JavaScript trong `src/` và `vite.config.js`, sau đó import thử 15 module nguồn (graphics, gameplay và từng hệ chuyên biệt): đạt.
- Thêm `OutputPass` vào cuối EffectComposer trong `src/graphics-upgrade.js`, sau distortion, để cuối pipeline thực hiện ACES tone mapping và chuyển sRGB. Smoke test thứ tự pass đạt: Render → SSR → GTAO → Bloom → Distortion → Output. Build Vite sau thay đổi qua (45 module). Đây là kiểm tra composer không-GPU, chưa phải kiểm chứng ảnh trên GPU.
- FPS/GPU/console và kiểm tra 4 preset bằng mắt: **chưa kiểm chứng bằng mắt**; môi trường hiện tại không cung cấp phiên trình duyệt được phép dùng để xem cảnh. Do đó chưa kết luận shader chạy ổn trên GPU thực.
- Lưu ý API: SSR/GTAO/SSAO/DoF dùng pass Three.js; Light Injection, caustic, volumetric, SSS và gió nền là xấp xỉ. Không ray/path tracing thật.
- Giai đoạn A: code/build hoàn tất; xác minh GPU trực quan còn thiếu. Tiếp theo rà/hoàn thiện Water → Earth → Wind theo thứ tự yêu cầu, mỗi module build lại và ghi giới hạn kiểm chứng.

### Giai đoạn B — Thủy → Thổ → Phong

#### WATER-01 · Hải Thần Lĩnh Vực

- Sửa `src/ocean-dominion.js`: mặt nước có hấp thụ Beer–Lambert RGB theo độ sâu, Schlick Fresnel, hai lớp sóng hướng khác nhau và normal giả lập theo độ dốc; chỉ hoạt động trong pha nước tràn hiện hữu để giữ timeline.
- Build Vite: đạt. Factory/update smoke test với preset Low và các mốc trước/impact/ebb: đạt; 1.400 điểm nước theo mức thử. Shader chưa được biên dịch/xem trên GPU.
- Còn thiếu: refraction scene-color, FFT fluid, solver giọt/va chạm với vật thể. Chưa kiểm tra hình ảnh.

#### EARTH-01 · Đại Lục Phân Liệt

- Sửa `src/earth-meteor.js`: phiến đất chuyển BoxGeometry thành đá dẹt đa diện, tăng roughness PBR; transform mọc/va xuống/lắng chạy ở vertex shader qua InstancedBufferAttributes, không cập nhật từng instance trên CPU mỗi frame. Custom depth material lặp cùng phép biến đổi; cleanup được gắn qua `userData.dispose`.
- Xóa cờ `flatShading` không hợp lệ khỏi ShaderMaterial thiên thạch sau khi factory smoke test bắt được cảnh báo này.
- Build Vite: đạt. Factory/update smoke test qua 6 mốc thời gian; xác nhận 12 slab ở Low, ma trận tĩnh và có depth material. Chưa có kiểm tra biên dịch shader GPU/thị giác.
- Còn thiếu: mảnh vỡ vẫn dùng quỹ đạo shader giải tích; chưa height-field collision/rolling solver GPU tổng quát.

#### WIND-01 · Thiên Khí Băng Diệt

- Dùng trường gió chung được nối từ mood/hướng tornado vào ground shader; Play Mode đã truyền force/direction vào pháp sư. Lốc, bụi, debris và streamline procedural có sẵn trong source trước đợt này, giữ nguyên timeline/hình thái.
- Build sau Stage A + cập nhật hệ Thủy/Thổ: đạt. Chưa xem trực quan hoặc đo FPS.
- Đã thêm cỏ instanced dùng chung; còn thiếu: hạt shader của mọi hệ và các lớp vải/khói riêng chưa đồng loạt dùng trường gió, nên chưa tuyên bố đạt đủ yêu cầu Phong cho toàn scene.

- Giai đoạn C đang rà các hệ Hỏa, Băng, Lôi, Độc, Ánh Sáng, Bóng Tối, Huyết, Không Gian và Thời Gian theo module chuyên biệt hiện có. Kiểm kê nguồn cho thấy các hệ này đã có ngân sách theo preset, shader/geometry riêng và update theo timeline; đây chưa phải bằng chứng shader chạy đúng trên GPU.
- Bài smoke test factory ở Low đã chạy 10 vòng tạo/cập nhật/giải phóng cho từng module Thủy, Thổ, Băng, Lôi, Ánh Sáng, Độc, Huyết, Bóng Tối, Không Gian, Thời Gian; mỗi vòng gọi update ở mở đầu, cao trào, aftermath. Kết quả: 10/10 hệ đạt; thời gian Node cho 10 cast gồm xây dựng + 30 update mỗi hệ: Thủy 97 ms, Thổ 133 ms, Băng 27 ms, Lôi 71 ms, Ánh Sáng 74 ms, Độc 83 ms, Huyết 280 ms, Bóng Tối 52 ms, Không Gian 22 ms, Thời Gian 37 ms. Đây là số đo CPU smoke test, không phải FPS/GPU benchmark.
- Test này phát hiện lỗi runtime ở `src/shadow-orb.js`: `IcosahedronGeometry.index` có thể null. Đã sửa để sao chép index khi có, đồng thời vẫn giữ hình học non-indexed hợp lệ; chạy lại 100 cast mô phỏng qua 300 mốc update và dispose: đạt.
- Sửa shader hạt nền chung trong `src/main.js`: chặn độ sâu camera nhỏ khi tính kích thước điểm, giới hạn điểm 1–35 px. Mục tiêu là tránh kích thước âm/vọt lớn khi hạt đi sát mặt phẳng camera; cú pháp và build sau sửa: đạt. Chưa kiểm tra trực quan trên GPU.
- Build hiện vẫn cảnh báo chunk `three-core` 535.18 kB minified (136.58 kB gzip); build thành công. Không tăng ngưỡng cảnh báo để che số liệu.
- Tiếp theo: hoàn tất audit/kiểm tra các module C, rà các skill Nham/Tinh Tú, kiểm thử giao thoa, cập nhật README/progress và đóng gói ZIP cuối. Giao diện trình duyệt hiện chưa dùng được để quan sát, nên tất cả mục thị giác phải vẫn ghi rõ chưa kiểm chứng.

#### Tích hợp giao thoa: Surface State, Light Injection và Phong

- Tạo/nối `src/graphics/core/wind-grass.js`: một InstancedMesh cỏ (360 / 800 / 1.400 / 2.200 instance theo Low / Medium / High / Ultra), hình học tĩnh, uốn theo uniform gió và nhiễu; chỉ hiện/fade-in khi có gió, rồi fade-out khi gió giảm. Không tạo mesh từng lá hay cập nhật ma trận từng frame.
- Sửa `src/graphics-upgrade.js`: shader của mesh Standard/Physical đã đăng ký nhận mặt nạ bề mặt cục bộ cho ướt, cháy, băng, axit, huyết, bụi, bùn, nóng và nứt; roughness/giả-emissive thay đổi tương ứng. Light Injection giờ cộng thêm ánh sáng gián tiếp xấp xỉ lên vật liệu PBR, ngoài mặt đất. Mỗi root cast mới được gọi qua `graphics.enhanceSurfaces(effect)`; shader nguyên tố tự viết vẫn cần nối thủ công.
- `graphics.updateSurface()` tự suy ra bụi từ gió/nứt, bùn từ ướt và nhiệt từ cháy để giữ nguyên tham số cũ của các skill; reset dùng cùng đường cập nhật về trạng thái yên.
- Smoke test CPU cho cỏ: giới hạn bốn preset, chèn shader, fade-in khi gió bật, fade-out khi gió tắt, tháo khỏi scene và dispose geometry/material: đạt. `node --check` toàn bộ JS trong `src/` và `vite.config.js`: đạt.
- Build Vite sau khi nối cỏ và Surface State/PBR: đạt, 46 module; app 367.78 kB, add-ons 112.28 kB, Three core 535.18 kB minified. Còn cảnh báo chunk Three core >500 kB; gzip lần lượt 117.36 / 23.93 / 136.58 kB.
- Smoke test tích hợp CPU bằng Three.js thật và renderer/PMREM giả: gọi PBR `onBeforeCompile`, xác nhận varying/uSurface/uLight được chèn; xác nhận Low = 360 cỏ, dust = 0.432 theo wind 0.6, heat = 0.1 theo burn 0.4, reset wind về 0 và dispose pass/geometry. Đạt. Đây không phải compile GLSL trên GPU.
- Chưa kiểm chứng bằng mắt/GPU; cỏ mới có smoke test CPU, không có FPS thật. Hạt custom của các hệ khác, khói/vải riêng chưa đọc trường gió; surface shader/light injection không phải GI hoặc decal vật lý.

### Giai đoạn D — Nham và Tinh Tú (đang làm)

#### Lớp vật liệu riêng theo hệ

- `node --check` toàn bộ `src/**/*.js`: đạt. Build Vite: đạt, 47 module; app 372.44 kB, add-ons 112.28 kB, Three core 535.18 kB minified. Gzip lần lượt 118.58 / 23.93 / 136.58 kB. Cảnh báo Three core >500 kB vẫn còn.
- Đây mới là lớp vật liệu. Còn phải hoàn thiện chuyển động/chi tiết phụ theo từng nhóm Nham và Tinh Tú, kiểm tra preset, cleanup/chuyển hệ và rà lại bảng 5 lớp. Chưa kiểm tra bằng mắt hoặc GPU; chưa đo FPS.

### Bản bàn giao khi tạm dừng — 17/10/2026

- Đóng gói trạng thái hiện có theo yêu cầu gửi file; tác vụ nâng cấp tổng thể vẫn tạm dừng, chưa hoàn tất giai đoạn D/E.
- Build lại trước khi gửi: đạt (47 module; app 373.21 kB, add-ons 112.28 kB, Three core 535.18 kB; còn cảnh báo kích thước Three core >500 kB).
- ZIP gồm mã nguồn, dist mới, tài liệu tiến độ và START.bat; không kèm node_modules. Đây là bản tiến độ hiện tại, chưa phải bản hoàn tất mọi yêu cầu.

## Bổ sung AAA — 17/10/2026

### Khảo sát và bảo toàn lượt đang chạy

- Yêu cầu đồ họa mới nối tiếp tác vụ audio. Giữ mã audio Stage A đã build/chạy/đo đạt, không bắt đầu lại. Theo yêu cầu mới append mục này; toàn bộ phần lịch sử phía trên giữ nguyên.
- Đã đọc lịch sử và mã đồ họa hiện có: PBR/IBL, SSR, GTAO/SSAO, volumetric/caustic/SSS xấp xỉ, Surface State, Wind Field, Light Injection, adaptive và debug đều có; không dựng lại.
- [Khảo sát 10 ưu tiên và ánh xạ Unreal→web](graphics/AAA_DESIGN.md). Một WebGLRenderer/animate; Three r180/Vite7. Mage Group rig, dummies, arena/cỏ/kiến trúc procedural; không có skeleton hoặc enemy AI hoàn chỉnh.
- Baseline mới đang chạy bằng Chromium ANGLE/SwiftShader: capabilities, entity census, mỗi hệ 3 mốc và cao trào 4 preset. Số đo frame dùng gl.finish wall time, không phải benchmark native GPU. Chưa có kết luận thị giác hoặc FPS trước khi có kết quả.
- Việc tiếp: hoàn tất các cổng audio từng hệ, giữ baseline rồi mở các nhóm PBR/ánh sáng/LOD/nhân vật/field/post/adaptive theo graphics/AAA_DESIGN.md. Không ghi hoàn tất phần chưa triển khai.

- Baseline phát hiện fixture đổi hậu kỳ nhưng chưa dựng lại instance theo preset. Lưu các số Medium/High/Ultra ban đầu vào invalid-preset-fixture, không dùng làm kết luận; sửa fixture dispose/recast trước mỗi preset. Giữ các ảnh Low hợp lệ và tiếp tục phần còn thiếu.

- Baseline bị timeout screenshot ở Ice sau chuỗi preset dài. Giữ 35 mốc đã ghi; bổ sung readPixels 1 pixel để chờ framebuffer hoàn tất trước khi chụp/đo, giảm 3→2 mẫu, tăng timeout screenshot60s. Các số gl.finish trước đó chỉ dùng như CPU submission timing, không diễn giải thành GPU FPS. Đây là lần sửa fixture baseline thứ hai; nếu vẫn lỗi sẽ giữ phần chưa kiểm chứng thay vì lặp vô hạn.

### Bổ sung AAA — tiếp nối 17/10/2026

Bảo toàn ce73729/1a6cb41. Giới hạn năng lượng bloom và tách ngưỡng cho các hệ tối; Low23impact, Medium/High/Ultra4ca đại diện, production UI/video, build/unit đạt. 3vòng sửa bloom đã khép; Lôi còn flash rộng. PBR/probes mới vẫn chưa tích hợp; không tự ghi là hoàn thiện AAA. Bằng chứng và phần tiếp tại PROGRESS mục mới nhất, docs/evidence/contrast và docs/evidence/resumed-production.
