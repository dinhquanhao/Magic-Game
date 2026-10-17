# Mở rộng AAA Cinematic — khảo sát và quyết định kỹ thuật

Ngày 17/10/2026 (Asia/Bangkok), tiếp nối engine hiện có; không tạo renderer/loop thứ hai. Đọc UPGRADE_PROGRESS.md trước lượt này. Phần lịch sử không được viết lại; theo yêu cầu mới chỉ append nhật ký Bổ sung AAA. Các điểm dưới là đánh giá khả năng kỹ thuật từ code và ảnh trước, không phải chứng nhận photorealistic/AAA.

| Ưu tiên | Đã có | Điểm yếu quan sát từ code/ảnh | Điểm nền /5 |
|---|---|---|---:|
| 1 PBR/texture | PMREM IBL, Standard/Physical, noise, Surface State, vật liệu Nham/Tinh Tú | Noise PBR phụ thuộc view position; chưa có thư viện vật liệu/triplanar micro-normal/height-blend/POM | 2 |
| 2 GI/bóng | 8 Light Injection ảo, PCFSoft, hemisphere, nền nhận light | Chưa SH grid; GI screen-space chưa có; shadow một frustum | 2 |
| 3 GPU shader/hạt | Instance attributes và quỹ đạo shader, giới hạn attribute đã sửa | Một vài module còn setMatrixAt CPU, chưa collision heightfield chung | 3 |
| 4 Volumetric | Screen radial rays trong distortion pass; sương module | Chưa có occlusion-aware density/height atmosphere thống nhất | 2 |
| 5 Fluid/physics | Analytic waves, Beer–Lambert, wind field, quỹ đạo | Chưa solver advection hoặc terrain collision dùng chung | 2 |
| 6 HDR/tone | ACES/OutputPass, per-skill exposure | Water cháy trắng; chưa giới hạn exposure theo luminance | 1 |
| 7 Geometry/LOD | Instancing, ngân sách quality, arena phẳng | Chưa chunked terrain/skirt/LOD bucket; mage chủ yếu hình ít cạnh | 1 |
| 8 Animation/tương tác | Mage group rig/cape6segments, input, cast, dummy hit | Không skeleton/skinning; thiếu hair/skin/cloth material detail/terrain grounding | 2 |
| 9 SSR/SSGI/post | SSR chọn nền, GTAO/SSAO, DoF, shared distortion | Chưa SSGI/history, DoF/grade chưa bảo vệ nhân vật | 2 |
| 10 AA | Renderer MSAA | Chưa post AA/temporal resolve/motion vectors | 1 |

## Stack và thực thể

- Three.js r180, Vite7, WebGLRenderer, EffectComposer, SSRPass/GTAOPass/SSAOPass/BokehPass/OutputPass; WebGPU/TSL chưa có đường chạy.
- Một procedural mage bằng các Group/Mesh, 6 cape segment, staff, cast particles; không skeleton nên không triển khai bone IK giả. Training dummies hiện có; chưa có quái AI/Boss, không gắn nhãn dummy là quái hoàn chỉnh.
- Plane nền chia96×96, grid, kiến trúc và cỏ instanced. Baseline capabilities, entity census, ảnh và synchronized timings ở graphics/reports/baseline-aaa; chỉ ghi số liệu sau khi script chạy.

## Ánh xạ Unreal → web (không tương đương tính năng)

| Thuật ngữ tham chiếu | Đường web phù hợp | Giới hạn |
|---|---|---|
| Material layers / virtual textures | Procedural triplanar, packed height/roughness, macro/meso/micro, mip/aniso | Không texture streaming ảo |
| Lumen | SH probe từ Light Injection + screen-space bounce có giới hạn | Không ray traversal/GI nhiều bounce đầy đủ; dữ liệu ngoài màn hình dùng probe |
| Nanite | Chunk/bucket LOD, instancing, impostor, frustum/distance culling | Không virtualized micropolygon |
| Niagara | Instanced/Points shader + shared field + bounded grid advection | Không editor/solver Niagara |
| Virtual Shadow Maps | CSM/PCF và contact approximation theo ngân sách | Không virtual shadow pages; PCSS thật phải có blocker search riêng |
| TSR/TAA | Jitter/resolve có history invalidation, fallback FXAA/SMAA | Không được gọi là velocity TAA đầy đủ nếu không có motion vectors mọi mesh |
| Chaos cloth/rigidbody | Vertex deformation/PBD nhỏ, analytic pressure response | Không physics gameplay tổng quát |
| Path tracer | Chỉ thêm nếu backend tương thích đã có và kiểm thử | Hiện chưa có; không tạo nút giả |

## Giai đoạn thực hiện

1. PBR chi tiết/vật liệu chuẩn và sửa view-dependent grain; giữ hệ Surface State/IBL đã có.
2. Probe/light/exposure/shadow và đo sự khác biệt, không tăng bloom để che lỗi.
3. LOD/terrain, scene kit và nhân vật/cloth/hair/material; dùng heightfield chung ở phần được hỗ trợ.
4. VFX field/atmosphere/weather/pressure, AA/post và adaptive DRS/nhóm budget có fallback.
5. Ma trận 15 hệ × mở/đỉnh/dư chấn, 4 preset đỉnh, context/reset/stress/toggle; ghi giới hạn, zip thật.

Native GPU/VRAM/FPS người chơi: chưa kiểm chứng. Performance của SwiftShader chỉ phục vụ tái hiện lỗi và so sánh trong cùng môi trường, không chứng minh mục tiêu 30/60FPS trên GPU rời.
