# Nhịp Cứu

Nguyên mẫu tương tác mô phỏng mạng lưới sinh viên hỗ trợ hồi sức tim phổi cộng đồng.

**Xem trực tiếp:** https://btphuong3011.github.io/nhip-cuu/

## Xem nhanh trong 1 phút

1. Chọn một tình huống trong **Kịch bản diễn tập**.
2. Chọn tốc độ **×8**, rồi bấm **Chạy diễn tập**. Một lượt tự động mất khoảng 23 giây ở tốc độ này.
3. Chuyển giữa **Người chứng kiến** và **Tình nguyện viên** để xem hai phía của quá trình điều phối. Có thể tạm dừng để thao tác nhận/từ chối ca.
4. Khi kết thúc, mở **Báo cáo & lịch sử** và bấm **Tải báo cáo CSV**.

Để tự thao tác: bấm **Báo ngừng tim** trong màn hình ứng dụng, trả lời hai câu hỏi, mô phỏng gọi 115 rồi bắt đầu nhịp hướng dẫn. Có thể kết thúc sớm; các mốc chưa xảy ra sẽ hiển thị **Chưa ghi nhận**.

## Các tình huống

- **Ca tiêu chuẩn:** một TNV từ chối, nhiệm vụ được chuyển cho người khác.
- **TNV không phản hồi:** Minh Anh không trả lời; sau 15 giây mô phỏng, hệ thống tự tìm TNV thay thế. Nhận ca thủ công trước hạn sẽ ngăn chuyển nhiệm vụ.
- **Trạm AED tạm ngưng:** AED tại Trạm y tế được đánh dấu bảo trì và loại khỏi điều phối. Bộ mô phỏng chọn cặp TNV–AED còn khả dụng có tổng quãng đường ngắn nhất, sau khi phân công nhóm tới thẳng hiện trường.

Báo cáo gồm sáu mốc thời gian, đối chiếu ba mục tiêu mô phỏng, giả định và nhật ký sự kiện. Lưu tối đa tám lượt trong `localStorage` của trình duyệt; có thể xem lại, tải CSV hoặc xóa bằng hai lần bấm xác nhận. Nếu trình duyệt chặn lưu trữ, báo cáo vẫn tồn tại trong phiên và có thể tải về.

## Chạy trên máy

Mở `index.html` trong Chrome hoặc Edge, giữ các tệp `styles.css`, `app.js`, `simulation.js` và `favicon.svg` trong cùng thư mục. Không cần cài thư viện hay cấu hình API.

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

Các kiểm tra bao gồm hoàn thành kịch bản, timeout và chuyển nhiệm vụ, nhận ca thủ công, loại AED bảo trì, tạm dừng, báo cáo thiếu mốc và đặt lại trạng thái. Bộ mô phỏng tách khỏi giao diện trong `simulation.js` để kiểm tra độc lập.

Các URL minh họa cũ vẫn hoạt động: `#shot-confirm`, `#shot-coach`, `#shot-volunteer`, `#shot-enroute`, `#shot-done`. Đây là ảnh chụp trạng thái dựng sẵn, không được tự động lưu vào lịch sử. Có thể chọn tình huống bằng `?scenario=no-response` hoặc `?scenario=aed-unavailable`.

## Phạm vi và giả định

- Tất cả vị trí, người, chứng nhận và số liệu đều giả lập. Không lấy GPS, không gọi điện, không gửi thông báo thật, không thu âm và không có máy chủ lưu dữ liệu người dùng.
- Đường đi là đoạn thẳng minh họa, không phải tuyến đường trong khuôn viên thật. Tốc độ mô hình 2 m/s, thời gian lấy AED 15 giây, bán kính chọn TNV 500 m, chờ phản hồi tối đa 15 giây. Các mốc được tính từ lúc bắt đầu báo động, không phải từ lúc người bệnh ngã xuống.
- Các mục tiêu ép tim đầu tiên ≤60 giây, TNV đầu tiên tới ≤240 giây và AED tới ≤300 giây chỉ là mục tiêu để diễn tập; chưa được kiểm chứng thực địa. Không suy ra hiệu quả lâm sàng hoặc khả năng sống sót.
- Số nhịp trên màn hình là số nhịp dẫn tính theo thời gian mô phỏng, không phải số lần ép đo bằng cảm biến. Tiếng bíp/hình nhịp duy trì 110 lần/phút theo thời gian thực, kể cả khi tăng tốc diễn tập. Âm thanh và giọng đọc mặc định tắt; giọng đọc chỉ hoạt động khi máy có giọng tiếng Việt.
- Tình huống hướng dẫn dành cho người lớn; tham khảo [AHA 2025 — Adult Basic Life Support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support). Nội dung cần chuyên gia phù hợp thẩm định trước thử nghiệm thực địa.
- Kết thúc lượt tự động sau khi AED tới 10 giây chỉ là điểm dừng phần trình diễn. **Không có nghĩa xe cấp cứu đã tới, người bệnh đã hồi phục hoặc được dừng hồi sức.**
- Không dùng nguyên mẫu cho cấp cứu thật. Khi cần cấp cứu thật, gọi **115** và làm theo điều phối viên.

GitHub Pages tiếp tục phục vụ trực tiếp các tệp tĩnh; không cần bước build hay khóa bí mật.
