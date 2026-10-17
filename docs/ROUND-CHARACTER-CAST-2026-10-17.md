# Model tải lên và thời lượng thi triển — 17/10/2026

Tiếp nối checkpoint `9a78620`, giữ fade phù văn đã bàn giao. Phạm vi mới do người dùng yêu cầu: thay nhân vật bằng model trong ZIP, giơ hai tay và đứng yên suốt thi triển, rune khoảng10giây, active đủ19skill dài gấp đôi. Mặc định dùng Cyber Bot vì mã tải lên gọi `buildCharacterModel('bot')`; các lựa chọn astronaut/drone trong demo không phải yêu cầu thêm menu nhân vật.

| Ưu tiên | Ý tưởng | Giá trị / độ khó / rủi ro | Kiểm chứng | Quyết định |
|---|---|---|---|---|
| 1 | Port model Cyber Bot vào một module trong renderer hiện tại | Cao / thấp / thấp | Mesh, màu, nguồn/hash; ảnh trước/sau | Chọn nhóm1 |
| 2 | Khóa vị trí và dựng hai tay qua vai/pivot thật | Cao / vừa / vừa | Cả hai đầu tay trên đỉnh đầu; WASD/nhảy/lướt/aim/lock không dịch chuyển | Chọn nhóm2 |
| 3 | Một phép đổi timeline:8,5s vẽ+1,5s hội tụ, active0,5× | Cao / vừa / vừa | Đủ19skill đo từng tick; UI/audio/pause/fade đồng bộ | Chọn nhóm3 |
| 4 | Tải GLB/skinned animation ngoài | Vừa / cao / cao | Cần asset rigging thật; ZIP hiện tại không có GLB | Để sau |
| 5 | Chọn bot/astronaut/drone trong UI | Vừa / vừa / vừa | Drone không có tay; cần thiết kế quy ước cast riêng | Để sau |
| 6 | Thêm hai nguồn phép bám bàn tay chuyển động | Vừa / vừa / vừa | Cần kiểm tra hình học beam/rune toàn registry | Chỉ đổi anchor sang vùng hai tay, chưa thêm beam |
| 7 | Animation lui/ngã/hurt/death và HP | Cao / cao / cao | Cần gameplay chiến đấu GĐ2 | Backlog |
| 8 | IK chân trên địa hình | Vừa / cao / vừa | Chưa có địa hình gameplay | Backlog |
| 9 | Giữ cao độ khi audio chạy nửa tốc độ | Vừa / cao / vừa | Cần thuật toán time stretching và nghe thử | Backlog; engine hiện đổi cả pitch |
| 10 | Camera giới thiệu model và cinematic mới | Vừa / vừa / vừa | Có thể thay thiết kế kỹ năng, ngoài phạm vi | Backlog |

Điều kiện nghiệm thu: build/unit đạt, Chromium chạy shader thật; đủ15hệ/19skill với thời gian pre-cast khoảng10s và active gấp đôi marker gốc; không drift vị trí/không nhảy/lướt, hai tay giữ cao đến kết thúc và di chuyển phục hồi. Fade rune vẫn1,8giây simulation, không bị thành3,6giây khi làm chậm active. Không đổi dữ liệu skill, MP/cooldown/cue bank, nền đất hoặc START.bat. Audio đi theo clock mới; chưa có thuật toán giữ pitch. Screenshot/video là bằng chứng Playwright nội bộ, không phải Live Preview từ xa/GPU native. Không nhập renderer/RAF/CDN/audio/input của demo tải lên; không đổi giấy phép repo.
