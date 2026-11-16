window.NhipCuuViews = (() => {
  function progress(s) {
    const current = s.phase === 'coach' ? 2 : s.phase === 'call' ? 1 : 0;
    return `<ol class="aid-progress" aria-label="Các bước hỗ trợ">${['Nhận diện','Gọi 115','Ép tim'].map((label,i) => `<li class="${i === current ? 'active' : i < current || (i === 1 && s.metrics.call != null) ? 'done' : ''}" ${i === current ? 'aria-current="step"' : ''}><span aria-hidden="true">${i+1}</span>${label}</li>`).join('')}</ol>`;
  }
  const art = (kind,running = false) => `<div class="focus-art ${running ? 'is-compressing' : ''}">${window.NhipCuuArt(kind)}</div>`;
  const heading = (title,subtitle = '') => `<div class="focus-heading"><h2>${title}</h2>${subtitle ? `<p class="focus-subtitle">${subtitle}</p>` : ''}</div>`;
  const button = (action,label,cls = '') => `<button type="button" class="aid-button ${cls}" data-act="${action}">${label}</button>`;
  const quiet = (action,label) => button(action,label,'quiet');
  function briefCue(s) {
    if (s.metrics.aed != null) return 'Bật AED và làm theo lời máy.';
    if (s.caption.includes('Đã hai phút')) return 'Có người thay? Đổi người ép thật nhanh.';
    return s.caption.includes('5 đến 6') ? 'Để ngực nảy lên hết.' : 'Ấn mạnh, nhanh.';
  }
  function bystander({s,icon,fmt}) {
    if (s.phase === 'idle') return heading('Có người bất tỉnh?','Bình tĩnh. Làm từng bước cùng Nhịp Cứu.')+art('home')+`<div class="focus-actions">${button('sos',`Bắt đầu hỗ trợ ${icon('arrow')}`,'coral')}<button type="button" class="aid-button outline" data-ui="voice" aria-pressed="false">${icon('mic')}<span>Giọng hướng dẫn</span></button></div><p class="micro-note">Đảm bảo hiện trường an toàn trước khi tới gần.</p>`;
    if (s.phase === 'confirm') {
      const first = s.q1 == null;
      return progress(s)+heading(first ? 'Gọi to, lay vai.' : 'Không thở bình thường?',first ? 'Người đó có phản ứng không?' : 'Nhìn lồng ngực. Thở ngáp cũng là bất thường.')+art(first ? 'response' : 'breathing')+`<div class="focus-actions"><div class="choice-pair">${button(first ? 'q1' : 'q2',first ? 'Không phản ứng' : 'Không thở','coral')}${button(first ? 'q1u' : 'q2u','Không chắc','outline')}</div>${quiet('reset',first ? 'Có phản ứng · quay lại' : 'Thở bình thường · quay lại')}</div>`;
    }
    if (s.phase === 'call') return progress(s)+heading('Gọi 115 ngay.','Bật loa ngoài. Làm theo điều phối viên.')+art('call')+`<div class="focus-actions">${button('call',`${icon('phone')} Gọi 115 · mô phỏng`,'coral')}<p class="micro-note">TNV đang được kết nối. Đừng chờ họ để gọi cấp cứu.</p></div>`;
    if (s.phase === 'coach') {
      const aedHere = s.metrics.aed != null;
      return progress(s)+heading(aedHere ? 'AED đã tới.' : 'Ấn ở giữa ngực.',aedHere ? 'Bật máy. Làm theo hướng dẫn của AED.' : 'Người nằm ngửa. Hai tay chồng lên nhau.')+art(aedHere ? 'aed' : 'compress',s.cprAt != null)+`<div class="cpr-facts"><span><b>110</b>nhịp dẫn/phút</span><span><b>5–6 cm</b>độ sâu người lớn</span><span><b data-live="elapsed">${fmt(s.t)}</b>thời gian giả lập</span></div>${s.cprAt == null ? `<div class="focus-actions">${button('cpr',`${icon('play')} Bắt đầu nhịp hướng dẫn`)}</div>` : `<p class="brief-cue" id="caption" aria-live="polite">${briefCue(s)}</p><div class="focus-tools"><button type="button" class="focus-audio" data-ui="sound" aria-pressed="false">${icon('volume-off')}<span>Tiếng nhịp</span></button><button type="button" class="focus-audio" data-ui="voice" aria-pressed="false">${icon('mic')}<span>Giọng hướng dẫn</span></button></div>`}<button type="button" class="help-arriving" data-ui="helpers" aria-haspopup="dialog">${icon('users')}<span><strong data-live="help-main">Đang kết nối TNV</strong><small data-live="help-sub">Chạm để xem trợ giúp</small></span><b data-live="help-eta">—</b>${icon('arrow')}</button>${aedHere ? '<p class="micro-note">Tiếp tục ép khi chuẩn bị AED. Khi máy yêu cầu, tránh chạm người bệnh.</p>' : ''}`;
    }
    return heading('Đã xong lượt tập.','Cùng nhìn lại các mốc thời gian.')+art('volunteer')+`<div class="focus-actions">${button('report',`Xem báo cáo ${icon('arrow')}`)}${button('reset','Diễn tập lại','outline')}</div><p class="micro-note">Kết quả mô phỏng, không phải kết quả cấp cứu thật.</p>`;
  }
  function volunteer({s,icon,fmt,esc,eta,pathLeft,distance,victim}) {
    const v = s.vols.find(x => x.me);
    if (s.phase === 'done') return heading('Đã xong lượt tập.','Cảm ơn bạn đã tham gia.')+art('volunteer')+`<div class="focus-actions">${button('report','Xem báo cáo')}${button('reset','Diễn tập lại','outline')}</div>`;
    if (['idle','off'].includes(v.status)) return heading('Bạn sẵn sàng?','Minh Anh · Hồ sơ tình nguyện viên giả lập')+art('volunteer')+`<div class="toggle"><div><strong>Sẵn sàng nhận ca</strong><p>CPR + AED · Chứng nhận giả lập còn hạn</p></div><button type="button" class="switch" role="switch" aria-checked="${v.status === 'idle'}" aria-label="Sẵn sàng nhận báo động" data-act="toggle" ${s.phase !== 'idle' ? 'disabled' : ''}></button></div><p class="micro-note">Vị trí giả lập. Chuyển sang Điều phối để chạy kịch bản.</p>`;
    if (v.status === 'notified') return heading('Cần bạn tiếp sức.',`${taskLabel(v,esc)} · vị trí giả lập`)+art(v.role === 'aed' ? 'aed' : 'volunteer')+`<div class="cpr-facts"><span><b>${Math.round(distance(v,victim))} m</b>khoảng cách mô hình</span><span><b data-live="response-left">00:15</b>còn để phản hồi</span><span><b>${v.role === 'aed' ? 'AED' : 'CPR'}</b>nhiệm vụ</span></div><div class="focus-actions">${button('accept',`${icon('check')} Nhận ca`)}${button('decline','Không thể đi','outline')}</div>`;
    if (v.status === 'enroute') return heading('Tới sảnh nhà B3.',v.role === 'aed' ? `Lấy AED tại ${esc(v.aed.label)} trước.` : 'Đảm bảo an toàn khi di chuyển.')+art('volunteer')+`<div class="cpr-facts"><span><b data-live="distance">${Math.ceil(pathLeft(v))} m</b>quãng đường mô hình</span><span><b data-live="eta">${fmt(eta(v))}</b>ETA giả lập</span><span><b>B3</b>điểm diễn tập</span></div><p class="micro-note">Phối hợp với người đang ép tim và điều phối viên 115.</p>`;
    if (v.status === 'arrived') return heading('Bạn đã tới.','Phối hợp cùng người đang hỗ trợ.')+art(v.role === 'aed' ? 'aed' : 'compress')+`<p class="brief-cue">Làm theo điều phối viên 115 và hướng dẫn của AED.</p><p class="micro-note">AED tới không đồng nghĩa được dừng hồi sức.</p>`;
    return heading('Đã ghi nhận.',v.status === 'timedout' ? 'Chưa nhận được phản hồi của bạn.' : 'Cảm ơn bạn đã trả lời nhanh.')+art('volunteer')+`<p class="micro-note">Hệ thống tìm TNV thay thế. Từ chối một ca không ảnh hưởng tư cách TNV.</p>`;
  }
  function taskLabel(v,esc) { return v.role === 'aed' ? `Lấy AED tại ${esc(v.aed.label)}` : 'Sảnh nhà B3'; }
  return {bystander,volunteer,briefCue};
})();
