(() => {
  'use strict';
  const Sim = window.NhipCuuSim;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    chart: '<path d="M4 3v18h17M8 16v-4m5 4V7m5 9v-6"/>',
    campus: '<path d="M3 21h18M5 21V9h14v12M3 9l9-6 9 6M10 21v-5h4v5M8 12h1m6 0h1"/>',
    play: '<path d="m9 5 11 7-11 7V5Z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.2"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/>',
    aed: '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m-3 3-4 5h5l-3 4"/>',
    timer: '<circle cx="12" cy="14" r="7"/><path d="M9 3h6m-3 0v4m6 1 2-2m-8 5v4l3 1"/>',
    'volume-off': '<path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/>',
    volume: '<path d="M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/><path d="M4 12h4l2-4 3 8 2-4h5"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
    check: '<path d="m5 12 4 4L19 6"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>',
    phone: '<path d="m5 3 4 1 1 5-3 2a16 16 0 0 0 6 6l2-3 5 1 1 4c0 2-2 3-4 2A23 23 0 0 1 3 7C2 5 3 3 5 3Z"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    document: '<path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h5"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
  const markupCache = new WeakMap();
  function setMarkup(element,markup) {
    // Keep interactive descendants stable while the live dashboard refreshes.
    if (markupCache.get(element) !== markup) { element.innerHTML = markup; markupCache.set(element,markup); }
  }
  function fillIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
  const fmt = value => value == null ? '—' : `${String(Math.floor(Math.max(0,Math.round(value))/60)).padStart(2,'0')}:${String(Math.max(0,Math.round(value))%60).padStart(2,'0')}`;
  const etaText = seconds => seconds >= 60 ? `${Math.floor(seconds/60)} phút ${Math.round(seconds%60)} giây` : `${Math.ceil(seconds)} giây`;
  const phaseNames = { idle:'Chưa bắt đầu',confirm:'Xác nhận tình huống',call:'Gọi cấp cứu (mô phỏng)',coach:'Hướng dẫn & điều phối',done:'Đã kết thúc mô phỏng' };
  let selectedScenario = new URLSearchParams(location.search).get('scenario') || 'standard';
  if (!Sim.SCENARIOS.some(x => x.id === selectedScenario)) selectedScenario = 'standard';
  let sim = Sim.createSimulation(selectedScenario), role = 'bystander', speed = 1;
  let screenKey = '', mapRingKey = '', logLength = -1, savedThisRun = false, snapshotMode = false;
  let soundOn = false, voiceOn = false, audio = null, beatTimer = null, nextBeat = 0, viVoice = null, spokenVersion = -1;
  let toastTimer, clearArmed = false, clearTimer;
  const STORAGE_KEY = 'nhip-cuu.drill-reports.v1';
  let storageAvailable = true, reports = [], selectedReportId = null;
  const isActive = () => !['idle','done'].includes(sim.state.phase);
  function toast(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden = false; toastTimer = setTimeout(() => { $('toast').hidden = true; },4200); }

  // Reports contain synthetic scenario data only. Treat browser storage as untrusted input.
  function validReport(r) {
    return r && r.version === 1 && typeof r.id === 'string' && r.id.length < 100 &&
      Sim.SCENARIOS.some(x => x.id === r.scenario) && Number.isFinite(Date.parse(r.createdAt)) &&
      Number.isFinite(r.duration) && r.duration >= 0 && r.duration <= 7200 &&
      r.metrics && Sim.METRICS.every(([key]) => r.metrics[key] === null || (Number.isFinite(r.metrics[key]) && r.metrics[key] >= 0 && r.metrics[key] <= 7200)) &&
      Array.isArray(r.log) && r.log.length <= 500 && r.log.every(e => e && typeof e.text === 'string' && e.text.length < 1000 && Number.isFinite(e.t));
  }
  try { const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(raw)) reports = raw.filter(validReport).slice(0,8); } catch (_) { storageAvailable = false; }
  if (reports.length) selectedReportId = reports[0].id;
  function persist() {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(reports)); storageAvailable = true; }
    catch (_) { storageAvailable = false; toast('Trình duyệt không cho lưu lịch sử. Bạn vẫn có thể tải báo cáo CSV.'); }
    updateStorageNote();
  }
  function updateStorageNote() {
    $('storage-note').textContent = storageAvailable ? 'Tối đa 8 lượt được lưu trong trình duyệt này. Không gửi dữ liệu lên máy chủ.' : 'Lịch sử chỉ được giữ trong phiên này do trình duyệt chặn lưu trữ. Hãy tải CSV trước khi đóng trang.';
  }
  function saveReport() {
    if (savedThisRun || snapshotMode) return;
    const report = sim.report(); if (!report) return;
    savedThisRun = true;
    report.id = window.crypto?.randomUUID ? crypto.randomUUID() : `drill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    report.createdAt = new Date().toISOString();
    reports.unshift(report); reports = reports.slice(0,8); selectedReportId = report.id;
    persist(); renderReports(); toast('Đã lưu báo cáo mô phỏng trên thiết bị này.');
  }

  // Audio uses real 110 BPM regardless of simulation playback speed. Off by default.
  function ensureAudio() {
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume().catch(() => {}); }
    catch (_) { soundOn = false; $('btn-sound').setAttribute('aria-pressed','false'); toast('Trình duyệt không hỗ trợ tiếng bíp. Nhịp hình vẫn hoạt động.'); }
  }
  function stopBeat() { if (beatTimer) clearInterval(beatTimer); beatTimer = null; }
  function syncBeat() {
    const s = sim.state;
    if (!soundOn || s.phase !== 'coach' || s.cprAt == null || s.paused || document.hidden) { stopBeat(); return; }
    ensureAudio(); if (!audio || beatTimer) return;
    nextBeat = audio.currentTime+.03;
    beatTimer = setInterval(() => {
      // Avoid scheduling a backlog if the browser was suspended.
      if (nextBeat < audio.currentTime-.1) nextBeat = audio.currentTime+.03;
      while (nextBeat < audio.currentTime+.1) {
        const o = audio.createOscillator(), gain = audio.createGain(); o.type = 'sine'; o.frequency.value = 740;
        gain.gain.setValueAtTime(.0001,nextBeat); gain.gain.exponentialRampToValueAtTime(.12,nextBeat+.005); gain.gain.exponentialRampToValueAtTime(.0001,nextBeat+.065);
        o.connect(gain).connect(audio.destination); o.start(nextBeat); o.stop(nextBeat+.07); nextBeat += 60/Sim.BPM;
      }
    },25);
  }
  function pickVoice() { viVoice = window.speechSynthesis?.getVoices().find(v => /^vi/i.test(v.lang)) || null; }
  function cancelSpeech() { try { window.speechSynthesis?.cancel(); } catch (_) {} }
  function speakCurrent() {
    if (!voiceOn || !viVoice || sim.state.paused || sim.state.phase !== 'coach' || sim.state.cprAt == null) return;
    cancelSpeech(); const u = new SpeechSynthesisUtterance(sim.state.caption); u.voice = viVoice; u.lang = viVoice.lang; u.rate = 1; speechSynthesis.speak(u);
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.addEventListener('voiceschanged',pickVoice); }

  function reset(scenario = selectedScenario) {
    stopBeat(); cancelSpeech(); selectedScenario = scenario; sim = Sim.createSimulation(scenario);
    reports = reports.filter(r => r.id !== 'illustration');
    if (selectedReportId === 'illustration') selectedReportId = reports[0]?.id || null;
    screenKey = ''; logLength = -1; savedThisRun = false; spokenVersion = -1; snapshotMode = false;
    renderScenarios(); renderReports(); render(true);
  }
  function renderScenarios() {
    const locked = isActive();
    $('scenario-options').innerHTML = Sim.SCENARIOS.map(c => `<button type="button" class="scenario-option" role="radio" aria-checked="${c.id === selectedScenario}" tabindex="${c.id === selectedScenario ? 0 : -1}" data-scenario="${c.id}" ${locked ? 'disabled' : ''}><span class="scenario-icon">${icon(c.icon)}</span><span class="radio-check" aria-hidden="true"></span><strong>${esc(c.name)}</strong><small>${esc(c.subtitle)}</small></button>`).join('');
    const scenario = Sim.SCENARIOS.find(x => x.id === selectedScenario);
    $('active-scenario').textContent = scenario.name; $('scenario-detail').textContent = scenario.detail;
    $('scenario-help').textContent = locked ? 'Bấm “Làm lại” để chọn tình huống khác.' : 'Chọn kịch bản, rồi bấm “Chạy diễn tập”.';
  }
  function appButton(action,text,cls = '') { return `<button type="button" class="app-button ${cls}" data-act="${action}">${text}</button>`; }
  function bystanderView() {
    const s = sim.state;
    if (s.phase === 'idle') {
      const nearest = s.aeds.filter(a => a.available).sort((a,b) => Sim.distance(a,Sim.VICTIM)-Sim.distance(b,Sim.VICTIM))[0];
      return `<div class="location-pill">${icon('pin')}Sảnh nhà B3 · vị trí giả lập</div><div><h2>Có người cần giúp?</h2><p class="hint">Kết nối người ở gần.<br>Tiếp sức trong những phút đầu.</p></div><button class="sos" type="button" data-act="sos">${icon('heart')}<span>Báo ngừng tim</span><span class="sos-sub">CHẠM ĐỂ DIỄN TẬP</span></button><p class="hint" style="text-align:center">Tình huống giả định: người lớn bất tỉnh,<br>không thở bình thường hoặc chỉ thở ngáp.</p><div class="phone-divider"></div><div class="kv"><span>Cấp cứu thật</span><b class="emergency-number">115</b></div><div class="kv"><span>AED gần điểm diễn tập</span><b>${esc(nearest?.label || 'Chưa có trạm khả dụng')}</b></div>`;
    }
    if (s.phase === 'confirm') return `<p class="eyebrow">BƯỚC 1 / 3 · NHẬN DIỆN</p><h2>Kiểm tra nhanh<br>tình huống.</h2><p class="hint">Đảm bảo hiện trường an toàn. Nếu nghi ngờ ngừng tim, gọi 115 ngay và làm theo hướng dẫn.</p><div class="question"><p>Người đó không phản ứng khi gọi to, lay vai?</p><div class="options"><button type="button" data-act="q1" aria-pressed="${s.q1 === 'yes'}">Đúng</button><button type="button" data-act="q1u" aria-pressed="${s.q1 === 'unsure'}">Không chắc</button></div></div><div class="question"><p>Không thở bình thường hoặc chỉ thở ngáp?</p><div class="options"><button type="button" data-act="q2" aria-pressed="${s.q2 === 'yes'}">Đúng</button><button type="button" data-act="q2u" aria-pressed="${s.q2 === 'unsure'}">Không chắc</button></div></div><button class="app-button danger" type="button" data-act="send" ${s.q1 && s.q2 ? '' : 'disabled'}>Gửi báo động mô phỏng ${icon('arrow')}</button><button class="app-link" type="button" data-act="reset">Hủy diễn tập</button>`;
    if (s.phase === 'call') return `<p class="eyebrow">BƯỚC 2 / 3 · GỌI CẤP CỨU</p><h2>Gọi 115 ngay.</h2><div class="call-card">${icon('phone')}<strong>115</strong><span>Bật loa ngoài, làm theo<br>hướng dẫn của điều phối viên.</span></div><div class="banner">Đang báo cho <strong data-live="notified">0</strong> TNV. Không chờ TNV phản hồi để gọi cấp cứu.</div>${appButton('call',`${icon('phone')} Mô phỏng gọi 115`,'danger')}<p class="hint">Nút này chỉ ghi nhận một thao tác diễn tập, không thực hiện cuộc gọi.</p>`;
    if (s.phase === 'coach') return `<div class="coach-top"><span class="pill">BƯỚC 3 / 3 · ÉP TIM</span><span class="mono" data-live="elapsed">00:00</span></div><div class="press-wrap"><div class="press ${s.cprAt != null ? 'running' : ''}" aria-hidden="true">ẤN</div><div class="press-meta"><span><b>110</b> lần/phút</span><span>Người lớn · <b>5–6 cm</b></span></div></div>${s.cprAt == null ? appButton('cpr','Bắt đầu ép · mô phỏng') : '<p class="hint" style="text-align:center">Nhịp dẫn mô phỏng: <b data-live="beats">0</b> · không đo lực ép thật</p>'}<div class="caption" id="caption" aria-live="polite">${esc(s.caption)}</div><div class="coach-cards" id="coach-cards"></div>${appButton('end','Kết thúc diễn tập','ghost')}`;
    return `<span class="success-icon">${icon('check')}</span><p class="eyebrow">ĐÃ HOÀN TẤT LƯỢT MÔ PHỎNG</p><h2>Nhìn lại từng<br>nhịp kết nối.</h2><div class="kv"><span>Ép tim đầu tiên</span><b class="mono">${fmt(s.metrics.compress)}</b></div><div class="kv"><span>TNV đầu tiên tới</span><b class="mono">${fmt(s.metrics.firstVol)}</b></div><div class="kv"><span>AED tới hiện trường</span><b class="mono">${fmt(s.metrics.aed)}</b></div><p class="hint">Đây là thời gian tính từ lúc bắt đầu báo động, theo giả định của mô hình. Không phải kết quả thử nghiệm thực địa.</p>${appButton('report',`Xem báo cáo ${icon('arrow')}`)}${appButton('reset','Diễn tập lại','ghost')}`;
  }
  function volunteerView() {
    const s = sim.state, v = s.vols.find(x => x.me);
    if (s.phase === 'done') return `<span class="success-icon">${icon('check')}</span><p class="eyebrow">LƯỢT DIỄN TẬP ĐÃ KẾT THÚC</p><h2>Cảm ơn bạn<br>đã tiếp sức.</h2><p class="hint">Mở báo cáo để xem các mốc thời gian và tình huống cần cải thiện. Mọi người và nhiệm vụ đều giả lập.</p>${appButton('report','Xem báo cáo')}${appButton('reset','Diễn tập lại','ghost')}`;
    if (['idle','off'].includes(v.status)) return `<p class="eyebrow">HỒ SƠ TÌNH NGUYỆN VIÊN GIẢ LẬP</p><div class="profile"><span class="avatar">MA</span><strong>${esc(v.name)}</strong><span>Đã hoàn thành CPR + AED (giả định)</span><span>Hiệu lực chứng nhận mô phỏng: 05/2027</span></div><div class="toggle"><div><strong>Sẵn sàng nhận ca</strong><p>Trong bán kính 500 m.</p></div><button type="button" class="switch" role="switch" aria-checked="${v.status === 'idle'}" aria-label="Sẵn sàng nhận báo động" data-act="toggle" ${s.phase !== 'idle' ? 'disabled' : ''}></button></div><p class="hint">${s.phase === 'idle' ? 'Chạy một kịch bản, hoặc chuyển sang vai người chứng kiến để bắt đầu.' : 'Ca hiện tại đã được giao cho tình nguyện viên khác.'}</p><div class="banner">Không lấy GPS thật. Các vị trí trên bản đồ đều được tạo sẵn để diễn tập.</div>`;
    if (v.status === 'notified') return `<div class="alert-card"><span>BÁO ĐỘNG MÔ PHỎNG</span><strong>Cách bạn ${Math.round(Sim.distance(v,Sim.VICTIM))} m</strong><span>${Sim.VICTIM.label}</span></div><p class="hint">${v.role === 'aed' ? `Lấy AED tại ${esc(v.aed.label)}, rồi mang tới điểm diễn tập.` : 'Tới thẳng điểm diễn tập để hỗ trợ ép tim.'}</p><div class="kv"><span>Còn thời gian phản hồi</span><b class="mono" data-live="response-left">00:15</b></div>${appButton('accept',`${icon('check')} Nhận ca`)}${appButton('decline','Không thể tham gia','ghost')}<p class="hint">Sau 15 giây không phản hồi, hệ thống tự tìm người thay thế. Có thể tạm dừng mô phỏng để thao tác.</p>`;
    if (v.status === 'enroute') return `<p class="eyebrow">ĐANG DI CHUYỂN · MÔ PHỎNG</p><h2>${Sim.VICTIM.label}</h2><div class="kv"><span>Quãng đường mô hình</span><b data-live="distance">—</b></div><div class="kv"><span>ETA mô hình</span><b data-live="eta">—</b></div><ol class="steps"><li>Đảm bảo an toàn hiện trường trước khi tiếp cận.</li><li>${v.role === 'aed' ? `Lấy AED tại ${esc(v.aed.label)} rồi tới hiện trường.` : 'Phối hợp với người đang ép tim; giảm tối đa thời gian gián đoạn.'}</li><li>Làm theo điều phối viên 115 và hướng dẫn của AED.</li><li>Nhờ người khác đón xe cấp cứu.</li></ol><div class="banner">Đường đi thẳng và ETA chỉ là giả định, chưa kết nối bản đồ đường đi thực tế.</div>`;
    if (v.status === 'arrived') return `<span class="success-icon">${icon('check')}</span><p class="eyebrow">ĐÃ TỚI ĐIỂM DIỄN TẬP</p><h2>Phối hợp,<br>tiếp tục hỗ trợ.</h2><ol class="steps"><li>Tiếp tục hồi sức theo hướng dẫn của điều phối viên 115.</li><li>Khi có AED, bật máy và làm theo hướng dẫn. Không chạm người bệnh khi máy yêu cầu tránh ra.</li><li>Có người thay thì đổi người ép khoảng mỗi 2 phút, giảm tối đa gián đoạn.</li></ol><div class="banner">AED tới không đồng nghĩa xe cấp cứu đã tới hoặc người bệnh đã hồi phục.</div>`;
    return `<span class="success-icon">${icon('arrow')}</span><p class="eyebrow">ĐÃ CHUYỂN NHIỆM VỤ</p><h2>Người khác<br>đang tiếp sức.</h2><p class="hint">${v.status === 'timedout' ? 'Bạn chưa phản hồi trong 15 giây. Hệ thống đã tìm tình nguyện viên thay thế.' : 'Đã ghi nhận bạn không thể tham gia. Nhiệm vụ được chuyển cho người khác.'}</p><div class="banner">Từ chối một ca không làm ảnh hưởng tư cách tình nguyện viên.</div>`;
  }
  function renderPhone(force = false) {
    const s = sim.state, v = s.vols.find(x => x.me);
    const key = [role,s.phase,s.q1,s.q2,s.cprAt != null,v.status].join('|');
    if (!force && key === screenKey) return;
    const active = document.activeElement, action = $('screen').contains(active) ? active.dataset.act : null;
    const samePhase = screenKey.split('|')[1] === s.phase && screenKey.split('|')[0] === role;
    screenKey = key; const oldScroll = $('screen').scrollTop;
    $('screen').innerHTML = role === 'bystander' ? bystanderView() : volunteerView();
    $('screen').scrollTop = samePhase ? oldScroll : 0;
    if (action) $('screen').querySelector(`[data-act="${action}"]`)?.focus({ preventScroll:true });
    for (const r of ['bystander','volunteer']) { $(`tab-${r}`).setAttribute('aria-selected',String(role === r)); $(`tab-${r}`).tabIndex = role === r ? 0 : -1; }
    $('phone-panel').setAttribute('aria-labelledby',`tab-${role}`);
  }
  function renderLivePhone() {
    const s = sim.state, v = s.vols.find(x => x.me);
    const live = (key,value) => document.querySelectorAll(`[data-live="${key}"]`).forEach(el => { el.textContent = value; });
    live('elapsed',fmt(s.t)); live('notified',s.vols.filter(x => ['notified','enroute'].includes(x.status)).length);
    live('beats',Math.max(0,Math.floor(((s.t || 0)-(s.cprAt || 0))*Sim.BPM/60)));
    live('response-left',fmt(Math.max(0,Sim.RESPONSE_TIMEOUT-((s.t || 0)-(v.notifiedAt || 0)))));
    live('distance',`${Math.ceil(sim.pathLeft(v))} m`); live('eta',etaText(sim.eta(v)));
    const caption = $('caption'); if (caption && caption.textContent !== s.caption) caption.textContent = s.caption;
    const cards = $('coach-cards');
    if (cards) cards.innerHTML = s.vols.filter(x => x.role && ['notified','enroute','arrived'].includes(x.status)).sort((a,b) => (a.role === 'aed')-(b.role === 'aed')).map(x => `<div class="vol-card ${x.role === 'aed' ? 'aed' : ''} ${x.status === 'arrived' ? 'arrived' : ''}"><i></i><div><strong>${esc(x.name)}</strong><small>${x.role === 'aed' ? 'Mang AED' : 'Hỗ trợ ép tim'}</small></div><span>${x.status === 'arrived' ? 'Đã tới' : x.status === 'notified' ? 'Đang báo' : fmt(sim.eta(x))}</span></div>`).join('');
  }
  function renderLog() {
    const events = sim.state.log; if (events.length === logLength) return; logLength = events.length;
    $('event-count').textContent = events.length ? `${events.length} SỰ KIỆN · THỜI GIAN MÔ PHỎNG` : 'CHƯA CÓ SỰ KIỆN';
    $('log').innerHTML = events.length ? events.slice(-80).reverse().map(e => `<li class="${esc(e.kind)}"><span class="event-time mono">${fmt(e.t)}</span><span class="event-dot" aria-hidden="true"></span><span>${esc(e.text)}</span></li>`).join('') : `<li class="empty-log"><span>${icon('layers')}</span><span>Mạng lưới đã sẵn sàng.<br>Bắt đầu một kịch bản để theo dõi điều phối.</span></li>`;
  }
  function render(force = false) {
    const s = sim.state, active = isActive(), arrived = s.vols.filter(v => v.status === 'arrived').length;
    document.body.classList.toggle('is-paused',s.paused);
    $('clock').textContent = fmt(s.t || 0); $('stat-phase').textContent = s.paused ? 'Đang tạm dừng' : phaseNames[s.phase];
    $('stat-vols').textContent = s.vols.filter(v => !['off','declined','timedout'].includes(v.status)).length;
    $('stat-vol-note').textContent = arrived ? `${arrived} TNV tại điểm diễn tập` : 'Đang trực · dữ liệu giả lập';
    $('stat-aeds').textContent = String(s.aeds.filter(a => a.available).length).padStart(2,'0');
    $('stat-aed-note').textContent = selectedScenario === 'aed-unavailable' ? '01 trạm bảo trì · dữ liệu giả lập' : 'Thiết bị trên sơ đồ minh họa';
    $('live-indicator').hidden = !active || s.paused;
    $('btn-pause').disabled = !active; setMarkup($('btn-pause'),icon(s.paused ? 'play' : 'pause'));
    $('btn-pause').setAttribute('aria-label',s.paused ? 'Tiếp tục diễn tập' : 'Tạm dừng diễn tập'); $('btn-pause').title = s.paused ? 'Tiếp tục' : 'Tạm dừng';
    $('btn-auto').disabled = active;
    setMarkup($('btn-auto'),`${icon('play')}${active ? s.paused ? 'Đã tạm dừng' : 'Đang diễn tập' : s.phase === 'done' ? 'Chạy lượt mới' : 'Chạy diễn tập'}<span class="button-arrow" aria-hidden="true">↗</span>`);
    const mapStatus = $('map-status'); mapStatus.className = `state-pill ${s.paused ? 'paused' : active ? 'alarm' : ''}`;
    mapStatus.innerHTML = `<i></i>${s.paused ? 'Đã tạm dừng' : active ? 'Đang điều phối' : s.phase === 'done' ? 'Lượt mô phỏng hoàn tất' : 'Mạng lưới sẵn sàng'}`;
    $('map-caption-sub').textContent = s.phase === 'idle' ? 'Điểm diễn tập được chọn' : s.phase === 'done' ? `Đã kết thúc · ${s.metrics.aed != null ? 'AED đã tới' : 'chưa ghi nhận AED tới'}` : s.metrics.alarm == null ? 'Đang xác nhận tình huống' : `${arrived} TNV đã tới · ${s.metrics.aed != null ? 'AED đã tới' : 'đang điều phối AED'}`;
    renderPhone(force); renderLivePhone(); renderLog(); drawMap();
    if (s.phase === 'done') saveReport();
    syncBeat();
    if (spokenVersion !== s.cueVersion) { spokenVersion = s.cueVersion; speakCurrent(); }
  }

  function drawBase() {
    const building = (x,y,w,h,label) => `<rect x="${x+3}" y="${y+5}" width="${w}" height="${h}" rx="7" fill="#dfe6d8"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#fafcf6" stroke="#d5dfca"/><path d="M${x+9} ${y+12}h${w-18}" stroke="#e1e9d8" stroke-width="5" stroke-linecap="round"/><text x="${x+w/2}" y="${y+h/2+11}" fill="#91a08b" font-size="12" text-anchor="middle">${label}</text>`;
    let svg = '<rect width="900" height="600" fill="#edf2e8"/><rect width="900" height="600" fill="url(#map-dots)"/><path d="M0 300H900M450 0V600M0 40H900M40 0V600M860 0V600M0 550H900" stroke="#fffef9" stroke-width="25" fill="none"/><path d="M0 300H900M450 0V600" stroke="#e9ede3" stroke-width="1" stroke-dasharray="7 8"/>';
    svg += '<rect x="60" y="330" width="270" height="180" rx="14" fill="#d9e8cc"/><rect x="78" y="348" width="234" height="144" rx="4" stroke="#b5cda5" fill="none" stroke-width="2"/><path d="M195 348v144m-117-72h234" stroke="#b5cda5" fill="none"/><circle cx="195" cy="420" r="26" stroke="#b5cda5" fill="none"/><text x="195" y="480" text-anchor="middle" font-size="11" fill="#91a582">SÂN THỂ THAO</text>';
    svg += building(70,70,100,60,'Nhà A1')+building(200,70,100,60,'Nhà A2')+building(70,160,100,60,'Nhà A3')+building(200,160,100,60,'Nhà A4');
    svg += building(540,70,100,60,'Nhà B1')+building(670,70,100,60,'Nhà B2')+building(556,160,100,66,'Nhà B3')+building(686,160,100,60,'Nhà B4');
    svg += building(360,140,140,70,'Căn tin')+building(375,325,100,62,'Trạm y tế')+building(540,330,160,100,'Nhà thi đấu')+building(730,340,100,120,'Thư viện');
    for (const [x,y] of [[96,260],[135,260],[270,260],[315,85],[315,175],[350,420],[350,470],[500,470],[545,475],[695,465],[795,490],[485,75],[810,150],[805,75],[95,530],[145,530],[240,530]]) svg += `<circle cx="${x}" cy="${y}" r="11" fill="#d3e3c5"/><circle cx="${x-3}" cy="${y-3}" r="7" fill="#dfead6"/>`;
    svg += '<text x="770" y="526" text-anchor="middle" font-size="10" fill="#9daa96">SƠ ĐỒ KHÔNG THEO ĐỊA HÌNH THỰC</text>';
    $('map-base').innerHTML = svg;
  }
  function drawMap() {
    const s = sim.state, p = Sim.VICTIM;
    let svg = '';
    if (s.metrics.alarm != null) svg += `<circle cx="${p.x}" cy="${p.y}" r="500" fill="#178c7810" stroke="#79a88c" stroke-width="1.5" stroke-dasharray="7 8"/>`;
    for (const v of s.vols) if (v.status === 'enroute' && v.path.length) svg += `<path d="M${v.x.toFixed(1)} ${v.y.toFixed(1)}${v.path.map(w => `L${w.x} ${w.y}`).join('')}" fill="none" stroke="${v.role === 'aed' ? '#b68e43' : '#3a9181'}" stroke-width="3" stroke-linecap="round" stroke-dasharray="5 7"/>`;
    for (const a of s.aeds) {
      if (s.aedTaken[a.id] && s.aedTaken[a.id] !== 'assigned') continue;
      svg += `<g><title>AED · ${esc(a.label)} · ${a.available ? 'khả dụng' : 'đang bảo trì'}</title><rect x="${a.x-18}" y="${a.y-13}" width="36" height="26" rx="6" fill="${a.available ? '#d1aa64' : '#aeb7a8'}" stroke="#fff" stroke-width="2"/><text x="${a.x}" y="${a.y+4}" font-size="10" text-anchor="middle" font-weight="600" fill="#fff">${a.available ? 'AED' : '× AED'}</text>${a.available ? '' : `<text x="${a.x}" y="${a.y+28}" font-size="10" text-anchor="middle" fill="#a37845">Bảo trì</text>`}</g>`;
    }
    const pulse = isActive() && !s.paused ? `<circle class="map-pulse" cx="${p.x}" cy="${p.y}" r="23" fill="none" stroke="#dd7962" stroke-width="2"/>` : '';
    const nextRingKey = `${s.phase}|${s.paused}`;
    if (nextRingKey !== mapRingKey) { mapRingKey = nextRingKey; $('map-rings').innerHTML = pulse; }
    svg += `<g filter="url(#pin-shadow)"><circle cx="${p.x}" cy="${p.y}" r="20" fill="#fff"/><circle cx="${p.x}" cy="${p.y}" r="15" fill="#e07963"/><path d="M${p.x-8} ${p.y}h4l2-5 4 10 2-5h4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></g>`;
    for (const v of s.vols) {
      if (v.status === 'arrived') continue;
      const color = ['off','declined','timedout'].includes(v.status) ? '#b0bbac' : v.status === 'notified' ? '#c6a062' : '#459586';
      svg += `<g><title>${esc(v.name)} · ${esc({idle:'sẵn sàng',off:'không trực',notified:'chờ phản hồi',enroute:'đang tới',declined:'không thể đi',timedout:'không phản hồi'}[v.status])}</title><circle cx="${v.x.toFixed(1)}" cy="${v.y.toFixed(1)}" r="9" fill="#fff" stroke="${color}" stroke-width="2.5"/><circle cx="${v.x.toFixed(1)}" cy="${v.y.toFixed(1)}" r="3" fill="${color}"/>${v.status === 'enroute' ? `<text x="${v.x+12}" y="${v.y+21}" font-size="11" fill="#638875">${esc(v.name)}</text>` : ''}</g>`;
    }
    const arrived = s.vols.filter(v => v.status === 'arrived').length;
    if (arrived) svg += `<rect x="${p.x+24}" y="${p.y-18}" width="${s.metrics.aed != null ? 140 : 95}" height="26" rx="7" fill="#fff"/><text x="${p.x+34}" y="${p.y-1}" font-size="11" fill="#368373">${arrived} TNV đã tới${s.metrics.aed != null ? ' · có AED' : ''}</text>`;
    $('map-dyn').innerHTML = svg;
  }

  const dateText = iso => new Date(iso).toLocaleString('vi-VN',{ hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric' });
  function renderReports() {
    const r = reports.find(x => x.id === selectedReportId);
    $('btn-download').disabled = !r;
    if (!r) $('report-detail').innerHTML = `<div class="report-empty"><span>${icon('chart')}</span><div><h3>Mỗi lượt diễn tập là một cơ hội học hỏi.</h3><p>Hoàn tất một lượt để xem các mốc thời gian, đối chiếu mục tiêu và tải báo cáo.</p></div></div>`;
    else {
      const scenario = Sim.SCENARIOS.find(x => x.id === r.scenario);
      const metrics = [['compress','Ép tim đầu tiên'],['firstVol','TNV đầu tiên tới'],['aed','AED tới hiện trường']];
      const achieved = metrics.filter(([key]) => r.metrics[key] != null && r.metrics[key] <= Sim.TARGETS[key]).length;
      $('report-detail').innerHTML = `<div class="report-summary"><div class="report-top"><div><h3>${esc(scenario.name)}</h3><p>${esc(dateText(r.createdAt))} · ${esc(r.mode)} · Thời lượng ${fmt(r.duration)}</p></div><span class="report-label">${achieved}/3 mốc trong mục tiêu mô phỏng</span></div><div class="report-metrics">${metrics.map(([key,label]) => {
        const value = r.metrics[key], ok = value != null && value <= Sim.TARGETS[key];
        return `<div class="report-metric"><span>${label}</span><strong class="mono">${fmt(value)}</strong><div class="metric-status ${ok ? '' : 'miss'}">${icon(ok ? 'check' : value == null ? 'info' : 'close')}${value == null ? 'Chưa ghi nhận' : ok ? 'Trong mục tiêu' : 'Vượt mục tiêu'}</div><span>Mục tiêu ≤ ${fmt(Sim.TARGETS[key])}</span></div>`;
      }).join('')}</div><div class="report-timeline">${Sim.METRICS.filter(([key]) => !['compress','firstVol','aed'].includes(key)).map(([key,label]) => `<span><b class="mono">${fmt(r.metrics[key])}</b>${label}</span>`).join('')}</div><p class="report-disclaimer">Dữ liệu mô phỏng, tính từ lúc bắt đầu báo động. Tốc độ di chuyển giả định 2 m/s, lấy AED 15 giây; không đánh giá chất lượng ép tim hay khả năng sống sót. Các mục tiêu chưa được kiểm chứng thực địa.</p></div>`;
    }
    $('history-count').textContent = reports.length; $('btn-clear-history').disabled = reports.length === 0;
    $('history-list').innerHTML = reports.length ? reports.map(report => `<div class="history-row ${report.id === selectedReportId ? 'selected' : ''}"><span>${icon('document')}</span><div><strong>${esc(Sim.SCENARIOS.find(x => x.id === report.scenario).name)}</strong><small>${esc(dateText(report.createdAt))} · ${esc(report.mode)} · Dữ liệu mô phỏng</small></div><span class="history-duration mono">${fmt(report.duration)}</span><button type="button" class="text-button" data-report="${esc(report.id)}" aria-label="Xem báo cáo ${esc(Sim.SCENARIOS.find(x => x.id === report.scenario).name)} lúc ${esc(dateText(report.createdAt))}">Xem ${icon('arrow')}</button></div>`).join('') : '<div class="history-empty">Chưa có lượt diễn tập nào được lưu.</div>';
    updateStorageNote();
  }
  function downloadCsv() {
    const r = reports.find(x => x.id === selectedReportId); if (!r) return;
    const scenario = Sim.SCENARIOS.find(x => x.id === r.scenario);
    const rows = [['Nhịp Cứu — BÁO CÁO DỮ LIỆU MÔ PHỎNG'],['Kịch bản',scenario.name],['Thời điểm',r.createdAt],['Chế độ',r.mode],['Thời lượng (giây)',Math.round(r.duration)],['Lưu ý','Không phải dữ liệu thực địa hoặc kết quả lâm sàng. Mốc tính từ lúc bắt đầu báo động.'],[],['Mốc','Giây từ lúc bắt đầu báo động','Mục tiêu (giây)','Đối chiếu mục tiêu mô phỏng']];
    Sim.METRICS.forEach(([key,label]) => { const value = r.metrics[key], target = Sim.TARGETS[key]; rows.push([label,value == null ? '' : Math.round(value),target ?? '',value == null ? 'Chưa ghi nhận' : target == null ? 'Đã ghi nhận' : value <= target ? 'Trong mục tiêu' : 'Vượt mục tiêu']); });
    rows.push([],['Giả định','Giá trị'],['Tốc độ di chuyển (m/s)',2],['Thời gian lấy AED (giây)',15],['Bán kính (m)',500],['Chờ phản hồi (giây)',15],[],['Nhật ký — giây từ lúc bắt đầu','Sự kiện']);
    r.log.forEach(e => rows.push([Math.round(e.t),e.text]));
    const cell = v => { let text = String(v ?? ''); if (/^[=+@-]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g,'""')}"`; };
    const blob = new Blob(['\uFEFF'+rows.map(row => row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `Nhip-Cuu_${r.scenario}_${r.createdAt.slice(0,10)}_${r.id.slice(0,8)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),1000); toast('Đã tạo báo cáo CSV có nhãn dữ liệu mô phỏng.');
  }

  function showRole(next) { role = next; screenKey = ''; $('screen').scrollTop = 0; render(); }
  $('screen').addEventListener('click',event => {
    const button = event.target.closest('[data-act]'); if (!button || button.disabled) return;
    const action = button.dataset.act;
    if (action === 'reset') return reset();
    if (action === 'report') { $('reports').scrollIntoView({behavior:'smooth'}); return; }
    if (action === 'accept' || action === 'decline') sim.respond('v1',action === 'accept');
    else if (action === 'toggle') sim.toggleVolunteer('v1');
    else sim.act(action);
    renderScenarios(); render();
  });
  ['bystander','volunteer'].forEach(r => {
    $(`tab-${r}`).addEventListener('click',() => showRole(r));
    $(`tab-${r}`).addEventListener('keydown',e => { if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) { e.preventDefault(); showRole(e.key === 'Home' ? 'bystander' : e.key === 'End' ? 'volunteer' : role === 'bystander' ? 'volunteer' : 'bystander'); $(`tab-${role}`).focus(); } });
  });
  $('btn-auto').addEventListener('click',() => { reset(); sim.startAuto(); renderScenarios(); render(); });
  $('btn-reset').addEventListener('click',() => reset());
  $('btn-pause').addEventListener('click',() => { if (!isActive()) return; sim.state.paused = !sim.state.paused; if (sim.state.paused) cancelSpeech(); else speakCurrent(); render(); });
  $('sel-speed').addEventListener('change',e => { speed = Number(e.target.value); });
  $('btn-sound').addEventListener('click',() => {
    soundOn = !soundOn; if (soundOn) ensureAudio(); $('btn-sound').setAttribute('aria-pressed',String(soundOn)); $('btn-sound').innerHTML = icon(soundOn ? 'volume' : 'volume-off'); $('btn-sound').title = soundOn ? 'Tắt tiếng bíp' : 'Bật tiếng bíp'; syncBeat();
  });
  $('btn-voice').addEventListener('click',() => {
    pickVoice(); if (!voiceOn && !viVoice) { toast('Máy chưa có giọng đọc tiếng Việt. Hướng dẫn chữ vẫn luôn hiển thị.'); return; }
    voiceOn = !voiceOn; $('btn-voice').setAttribute('aria-pressed',String(voiceOn)); $('btn-voice').title = voiceOn ? 'Tắt giọng đọc' : 'Bật giọng đọc tiếng Việt'; voiceOn ? speakCurrent() : cancelSpeech();
  });
  $('scenario-options').addEventListener('click',e => { const option = e.target.closest('[data-scenario]'); if (option && !option.disabled) reset(option.dataset.scenario); });
  $('scenario-options').addEventListener('keydown',e => {
    if (isActive() || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
    e.preventDefault(); const current = Sim.SCENARIOS.findIndex(x => x.id === selectedScenario);
    const index = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (current+(['ArrowRight','ArrowDown'].includes(e.key) ? 1 : 2))%3;
    reset(Sim.SCENARIOS[index].id); $('scenario-options').querySelector(`[data-scenario="${selectedScenario}"]`).focus();
  });
  $('btn-download').addEventListener('click',downloadCsv);
  $('history-list').addEventListener('click',e => { const button = e.target.closest('[data-report]'); if (!button) return; selectedReportId = button.dataset.report; renderReports(); $('report-detail').scrollIntoView({behavior:'smooth',block:'center'}); });
  $('btn-clear-history').addEventListener('click',() => {
    if (!clearArmed) { clearArmed = true; $('btn-clear-history').textContent = 'Bấm lần nữa để xóa'; clearTimer = setTimeout(() => { clearArmed = false; $('btn-clear-history').textContent = 'Xóa lịch sử'; },5000); return; }
    clearTimeout(clearTimer); clearArmed = false; reports = []; selectedReportId = null; persist(); renderReports(); $('btn-clear-history').textContent = 'Xóa lịch sử'; toast('Đã xóa lịch sử diễn tập trên thiết bị này.');
  });
  document.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click',() => { document.querySelectorAll('[data-nav]').forEach(x => x.classList.toggle('active',x === a)); }));
  document.addEventListener('visibilitychange',() => { if (document.hidden) { stopBeat(); cancelSpeech(); } else syncBeat(); });
  window.addEventListener('pagehide',() => { stopBeat(); cancelSpeech(); });

  fillIcons(); drawBase(); renderScenarios(); renderReports(); render();
  // Retain the previous prototype's illustration URLs; these snapshots never enter history.
  const shots = { 'shot-confirm':[4,'bystander'], 'shot-coach':[50,'bystander'], 'shot-volunteer':[10,'volunteer'], 'shot-enroute':[40,'volunteer'], 'shot-done':[600,'bystander'] };
  const shot = shots[location.hash.slice(1)];
  if (shot) {
    snapshotMode = true; role = shot[1]; sim.startAuto(); sim.tick(shot[0]); if (sim.state.phase !== 'done') sim.state.paused = true;
    renderScenarios(); render(true);
    if (sim.state.phase === 'done') { const r = sim.report(); r.id = 'illustration'; r.createdAt = new Date().toISOString(); reports.unshift(r); selectedReportId = r.id; renderReports(); }
  }
  let last = performance.now(), uiElapsed = 0;
  function frame(now) {
    const elapsed = Math.min(.25,Math.max(0,(now-last)/1000)); last = now;
    const wasActive = isActive(); sim.tick(elapsed*speed); uiElapsed += elapsed;
    if (uiElapsed >= .1 || wasActive !== isActive()) { uiElapsed = 0; render(); if (wasActive && !isActive()) renderScenarios(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
