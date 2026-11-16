# Nhịp Cứu

Nguyên mẫu tương tác mô phỏng mạng lưới sinh viên hỗ trợ hồi sức tim phổi cộng đồng.

**Xem trực tiếp:** https://btphuong3011.github.io/nhip-cuu/

## Xem nhanh trong 1 phút

1. Bấm **Điều phối**, chọn một tình huống trong **Kịch bản diễn tập**.
2. Chọn tốc độ **×8**, rồi bấm **Chạy diễn tập**. Một lượt tự động mất khoảng 23 giây ở tốc độ này.
3. Chuyển giữa **Người chứng kiến** và **Tình nguyện viên** để xem hai phía của quá trình điều phối. Có thể tạm dừng để thao tác nhận/từ chối ca.
4. Khi kết thúc, mở **Báo cáo & lịch sử** và bấm **Tải báo cáo CSV**.

Để tự thao tác: ở chế độ **Ứng dụng**, bấm **Bắt đầu hỗ trợ**, trả lời từng câu hỏi, mô phỏng gọi 115 rồi bắt đầu nhịp hướng dẫn. Nút **115** luôn dùng được từ màn hình đầu; gọi trước không bỏ qua bước nhận diện hoặc tự mở khóa ép tim. Đây chỉ là thao tác mô phỏng.

Chạm dòng **TNV đang tới** để mở bảng trợ giúp. Tại đây có thể **Kết thúc lượt diễn tập** sớm; các mốc chưa xảy ra sẽ hiển thị **Chưa ghi nhận**.

## Giao diện hỗ trợ bằng hình

- Mặc định mở **Ứng dụng** với nút lớn ở gần ngón tay cái. Mỗi màn hình nhận diện chỉ hỏi một câu; lựa chọn thứ hai chuyển thẳng tới bước gọi 115, không thêm lần xác nhận.
- Bảy minh họa SVG tự vẽ cho tình huống ban đầu, kiểm tra phản ứng, kiểm tra thở, gọi cấp cứu, ép tim, AED và tình nguyện viên. Chuyển động nhấn theo nhịp 110 lần/phút; hỗ trợ giảm chuyển động theo cài đặt trình duyệt.
- Khi đang hỗ trợ, ẩn phần chọn vai trò. Thông tin TNV/AED thu gọn thành một dòng và mở trong bảng trượt. **Điều phối** vẫn truy cập được, giữ nguyên trạng thái ca đang mô phỏng.
- Nút tiếng nhịp/giọng hướng dẫn có trạng thái bật/tắt. Nếu máy chưa có giọng Việt, nguyên mẫu thông báo và vẫn hiển thị hướng dẫn chữ.
- Có thể mở thẳng bảng điều phối bằng `?view=dispatch`. Mặc định không mở bản đồ hay báo cáo trong màn hình hỗ trợ.

Minh họa là sơ đồ phục vụ đánh giá giao diện, cần được thẩm định cùng nội dung bởi người có chuyên môn phù hợp trước diễn tập thực địa. Chưa có thử nghiệm xác nhận tốc độ thao tác với người dùng thật.

## Các tình huống

- **Ca tiêu chuẩn:** một TNV từ chối, nhiệm vụ được chuyển cho người khác.
- **TNV không phản hồi:** Minh Anh không trả lời; sau 15 giây mô phỏng, hệ thống tự tìm TNV thay thế. Nhận ca thủ công trước hạn sẽ ngăn chuyển nhiệm vụ.
- **Trạm AED tạm ngưng:** AED tại Trạm y tế được đánh dấu bảo trì và loại khỏi điều phối. Bộ mô phỏng chọn cặp TNV–AED còn khả dụng có tổng quãng đường ngắn nhất, sau khi phân công nhóm tới thẳng hiện trường.

Báo cáo gồm sáu mốc thời gian, đối chiếu ba mục tiêu mô phỏng, giả định và nhật ký sự kiện. Lưu tối đa tám lượt trong `localStorage` của trình duyệt; có thể xem lại, tải CSV hoặc xóa bằng hai lần bấm xác nhận. Nếu trình duyệt chặn lưu trữ, báo cáo vẫn tồn tại trong phiên và có thể tải về.

## Chạy trên máy

Mở `index.html` trong Chrome hoặc Edge, giữ các tệp CSS, JavaScript và `favicon.svg` trong cùng thư mục. Không cần cài thư viện hay cấu hình API.

Hoặc chạy một máy chủ tĩnh:

```sh
python -m http.server 4177 --bind 127.0.0.1
```

Mở `http://127.0.0.1:4177/`. Giao diện dùng phông Google Fonts khi có mạng và phông hệ thống khi ngoại tuyến. Đây chưa phải PWA có bộ nhớ đệm ngoại tuyến.

## Kiểm tra

```sh
node --check app.js
node --test simulation.test.cjs
```

Các kiểm tra bao gồm hoàn thành kịch bản, timeout và chuyển nhiệm vụ, nhận ca thủ công, loại AED bảo trì, tạm dừng, báo cáo thiếu mốc, đặt lại trạng thái và gọi 115 trước khi hoàn tất nhận diện. Bộ mô phỏng tách khỏi giao diện trong `simulation.js`; hình và giao diện hỗ trợ nằm trong `illustrations.js`, `focus-views.js`, `focus-ui.css`.

Các URL minh họa cũ vẫn hoạt động: `#shot-confirm`, `#shot-coach`, `#shot-volunteer`, `#shot-enroute`, `#shot-done`. Đây là ảnh chụp trạng thái dựng sẵn, không được tự động lưu vào lịch sử. Có thể chọn tình huống bằng `?scenario=no-response` hoặc `?scenario=aed-unavailable`.

## Phạm vi và giả định

- Tất cả vị trí, người, chứng nhận và số liệu đều giả lập. Không lấy GPS, không gọi điện, không gửi thông báo thật, không thu âm và không có máy chủ lưu dữ liệu người dùng.
- Đường đi là đoạn thẳng minh họa, không phải tuyến đường trong khuôn viên thật. Tốc độ mô hình 2 m/s, thời gian lấy AED 15 giây, bán kính chọn TNV 500 m, chờ phản hồi tối đa 15 giây. Các mốc được tính từ lúc bắt đầu báo động, không phải từ lúc người bệnh ngã xuống.
- Các mục tiêu ép tim đầu tiên ≤60 giây, TNV đầu tiên tới ≤240 giây và AED tới ≤300 giây chỉ là mục tiêu để diễn tập; chưa được kiểm chứng thực địa. Không suy ra hiệu quả lâm sàng hoặc khả năng sống sót.
- Nhịp hướng dẫn và hình minh họa không phải số lần ép hoặc lực ép đo bằng cảm biến. Tiếng bíp/hình nhịp duy trì 110 lần/phút theo thời gian thực, kể cả khi tăng tốc diễn tập. Trong luồng thủ công, tiếng nhịp tự bật khi bắt đầu hướng dẫn nếu người dùng chưa chọn tắt; lựa chọn tắt được giữ trong phiên. Giọng đọc mặc định tắt và chỉ hoạt động khi máy có giọng tiếng Việt.
- Tình huống hướng dẫn dành cho người lớn; tham khảo [AHA 2025 — Adult Basic Life Support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support). Nội dung cần chuyên gia phù hợp thẩm định trước thử nghiệm thực địa.
- Kết thúc lượt tự động sau khi AED tới 10 giây chỉ là điểm dừng phần trình diễn. **Không có nghĩa xe cấp cứu đã tới, người bệnh đã hồi phục hoặc được dừng hồi sức.**
- Không dùng nguyên mẫu cho cấp cứu thật. Khi cần cấp cứu thật, gọi **115** và làm theo điều phối viên.

GitHub Pages tiếp tục phục vụ trực tiếp các tệp tĩnh; không cần bước build hay khóa bí mật.
