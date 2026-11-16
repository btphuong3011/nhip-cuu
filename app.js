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
  const phaseNames = { idle:'Chưa bắt đầu',confirm:'Xác nhận tình huống',call:'Gọi cấp cứu (mô phỏng)',coach:'Hướng dẫn & điều phối',done:'Đã kết thúc mô phỏng' };
  let selectedScenario = new URLSearchParams(location.search).get('scenario') || 'standard';
  if (!Sim.SCENARIOS.some(x => x.id === selectedScenario)) selectedScenario = 'standard';
  let sim = Sim.createSimulation(selectedScenario), role = 'bystander', speed = 1;
  let screenKey = '', mapRingKey = '', logLength = -1, savedThisRun = false, snapshotMode = false;
  let soundOn = false, voiceOn = false, soundPreferenceSet = false, audio = null, beatTimer = null, nextBeat = 0, viVoice = null, spokenVersion = -1;
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
    if (!voiceOn || !viVoice || sim.state.paused) return;
    const s = sim.state;
    const text = s.phase === 'coach' ? s.caption : s.phase === 'confirm' ? s.q1 == null ? 'Đảm bảo hiện trường an toàn. Gọi to, lay vai. Người đó có phản ứng không?' : 'Nhìn lồng ngực. Người đó không thở bình thường hoặc chỉ thở ngáp?' : s.phase === 'call' ? 'Gọi 115 ngay. Bật loa ngoài và làm theo điều phối viên.' : s.phase === 'done' ? 'Đã kết thúc lượt diễn tập.' : 'Nhấn Bắt đầu hỗ trợ để diễn tập từng bước.';
    cancelSpeech(); const u = new SpeechSynthesisUtterance(text); u.voice = viVoice; u.lang = viVoice.lang; u.rate = 1; speechSynthesis.speak(u);
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.addEventListener('voiceschanged',pickVoice); }

  function reset(scenario = selectedScenario) {
    stopBeat(); cancelSpeech(); selectedScenario = scenario; sim = Sim.createSimulation(scenario);
    if ($('help-sheet').open) $('help-sheet').close();
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
  function viewContext() { return {s:sim.state,icon,fmt,esc,eta:sim.eta,pathLeft:sim.pathLeft,distance:Sim.distance,victim:Sim.VICTIM}; }
  function bystanderView() { return window.NhipCuuViews.bystander(viewContext()); }
  function volunteerView() { return window.NhipCuuViews.volunteer(viewContext()); }
  function renderPhone(force = false) {
    const s = sim.state, v = s.vols.find(x => x.me);
    const key = [role,s.phase,s.q1,s.q2,s.cprAt != null,v.status,s.metrics.aed != null,s.metrics.call != null].join('|');
    if (!force && key === screenKey) return;
    const active = document.activeElement, action = $('screen').contains(active) ? active.dataset.act : null;
    const samePhase = screenKey.split('|')[1] === s.phase && screenKey.split('|')[0] === role;
    screenKey = key; const oldScroll = $('screen').scrollTop;
    $('screen').innerHTML = role === 'bystander' ? bystanderView() : volunteerView();
    $('screen').scrollTop = samePhase ? oldScroll : 0;
    if (action) ($('screen').querySelector(`[data-act="${action}"]`) || $('screen').querySelector('.aid-button'))?.focus({ preventScroll:true });
    for (const r of ['bystander','volunteer']) { $(`tab-${r}`).setAttribute('aria-selected',String(role === r)); $(`tab-${r}`).tabIndex = role === r ? 0 : -1; }
    $('phone-panel').setAttribute('aria-labelledby',`tab-${role}`);
  }
  function renderLivePhone() {
    const s = sim.state, v = s.vols.find(x => x.me);
    const live = (key,value) => document.querySelectorAll(`[data-live="${key}"]`).forEach(el => { el.textContent = value; });
    live('elapsed',fmt(s.t)); live('notified',s.vols.filter(x => ['notified','enroute'].includes(x.status)).length);
    live('beats',Math.max(0,Math.floor(((s.t || 0)-(s.cprAt || 0))*Sim.BPM/60)));
    live('response-left',fmt(Math.max(0,Sim.RESPONSE_TIMEOUT-((s.t || 0)-(v.notifiedAt || 0)))));
    live('distance',`${Math.ceil(sim.pathLeft(v))} m`); live('eta',fmt(sim.eta(v)));
    const shortCue = window.NhipCuuViews.briefCue(s);
    const caption = $('caption'); if (caption && caption.textContent !== shortCue) caption.textContent = shortCue;
    const sceneVols = s.vols.filter(x => x.role === 'scene' && ['enroute','arrived'].includes(x.status));
    const alreadyHere = sceneVols.some(x => x.status === 'arrived');
    live('help-main',alreadyHere ? 'TNV đã tới hiện trường' : sceneVols.length ? `${sceneVols.length} TNV đang tới` : 'Đang kết nối TNV');
    live('help-sub','ETA giả lập · xem chi tiết');
    live('help-eta',alreadyHere ? 'Đã tới' : sceneVols.length ? fmt(Math.min(...sceneVols.map(x => sim.eta(x)))) : 'Chờ');
    $('btn-quick-call').classList.toggle('called',s.metrics.call != null);
    $('btn-quick-call').title = s.metrics.call != null ? 'Đã mô phỏng gọi 115; không có cuộc gọi thật' : 'Mô phỏng gọi 115 ngay';
    document.querySelectorAll('[data-ui="sound"]').forEach(el => { el.setAttribute('aria-pressed',String(soundOn)); setMarkup(el,`${icon(soundOn ? 'volume' : 'volume-off')}<span>Tiếng nhịp</span>`); });
    document.querySelectorAll('[data-ui="voice"]').forEach(el => { el.setAttribute('aria-pressed',String(voiceOn)); });
    const cards = $('help-sheet').open ? $('help-sheet-body') : null;
    if (cards) cards.innerHTML = s.vols.filter(x => x.role && ['notified','enroute','arrived'].includes(x.status)).sort((a,b) => (a.role === 'aed')-(b.role === 'aed')).map(x => `<div class="vol-card ${x.role === 'aed' ? 'aed' : ''} ${x.status === 'arrived' ? 'arrived' : ''}"><i></i><div><strong>${esc(x.name)}</strong><small>${x.role === 'aed' ? 'Mang AED' : 'Hỗ trợ ép tim'}</small></div><span>${x.status === 'arrived' ? 'Đã tới' : x.status === 'notified' ? 'Đang báo' : fmt(sim.eta(x))}</span></div>`).join('');
  }
  function renderLog() {
    const events = sim.state.log; if (events.length === logLength) return; logLength = events.length;
    $('event-count').textContent = events.length ? `${events.length} SỰ KIỆN · THỜI GIAN MÔ PHỎNG` : 'CHƯA CÓ SỰ KIỆN';
    $('log').innerHTML = events.length ? events.slice(-80).reverse().map(e => `<li class="${esc(e.kind)}"><span class="event-time mono">${fmt(e.t)}</span><span class="event-dot" aria-hidden="true"></span><span>${esc(e.text)}</span></li>`).join('') : `<li class="empty-log"><span>${icon('layers')}</span><span>Mạng lưới đã sẵn sàng.<br>Bắt đầu một kịch bản để theo dõi điều phối.</span></li>`;
  }
  function render(force = false) {
    const s = sim.state, active = isActive(), arrived = s.vols.filter(v => v.status === 'arrived').length;
    document.body.classList.toggle('is-paused',s.paused); document.body.classList.toggle('aid-active',active);
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
    const speechKey = `${s.phase}|${s.q1 != null}|${s.cueVersion}`;
    if (spokenVersion !== speechKey) { spokenVersion = speechKey; speakCurrent(); }
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

  function setView(mode) {
    const app = mode !== 'dispatch'; document.body.classList.toggle('app-mode',app);
    $('view-app').setAttribute('aria-pressed',String(app)); $('view-dispatch').setAttribute('aria-pressed',String(!app));
    window.scrollTo({top:0,behavior:'instant'});
  }
  function showRole(next) { role = next; screenKey = ''; $('screen').scrollTop = 0; render(); }
  $('screen').addEventListener('click',event => {
    const ui = event.target.closest('[data-ui]');
    if (ui) {
      if (ui.dataset.ui === 'voice') $('btn-voice').click();
      if (ui.dataset.ui === 'sound') $('btn-sound').click();
      if (ui.dataset.ui === 'helpers') { $('help-sheet').showModal(); renderLivePhone(); }
      return;
    }
    const button = event.target.closest('[data-act]'); if (!button || button.disabled) return;
    const action = button.dataset.act;
    if (action === 'reset') return reset();
    if (action === 'report') { setView('dispatch'); $('reports').scrollIntoView({behavior:'smooth'}); return; }
    if (action === 'accept' || action === 'decline') sim.respond('v1',action === 'accept');
    else if (action === 'toggle') sim.toggleVolunteer('v1');
    else sim.act(action);
    if ((action === 'q2' || action === 'q2u') && !sim.state.auto) sim.act('send');
    if (action === 'cpr' && !soundPreferenceSet) { soundOn = true; ensureAudio(); $('btn-sound').setAttribute('aria-pressed',String(soundOn)); $('btn-sound').innerHTML = icon(soundOn ? 'volume' : 'volume-off'); }
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
    soundPreferenceSet = true; soundOn = !soundOn; if (soundOn) ensureAudio(); $('btn-sound').setAttribute('aria-pressed',String(soundOn)); $('btn-sound').innerHTML = icon(soundOn ? 'volume' : 'volume-off'); $('btn-sound').title = soundOn ? 'Tắt tiếng bíp' : 'Bật tiếng bíp'; syncBeat(); renderLivePhone();
  });
  $('btn-voice').addEventListener('click',() => {
    pickVoice(); if (!voiceOn && !viVoice) { toast('Máy chưa có giọng đọc tiếng Việt. Hướng dẫn chữ vẫn luôn hiển thị.'); return; }
    voiceOn = !voiceOn; $('btn-voice').setAttribute('aria-pressed',String(voiceOn)); $('btn-voice').title = voiceOn ? 'Tắt giọng đọc' : 'Bật giọng đọc tiếng Việt'; voiceOn ? speakCurrent() : cancelSpeech(); renderLivePhone();
  });
  $('view-app').addEventListener('click',() => setView('app'));
  $('view-dispatch').addEventListener('click',() => setView('dispatch'));
  document.querySelector('.view-brand').addEventListener('click',e => { e.preventDefault(); setView('app'); });
  $('btn-quick-call').addEventListener('click',() => { if (sim.state.phase === 'done') reset(); sim.act('call-now'); toast('Đã mô phỏng gọi 115. Không thực hiện cuộc gọi thật.'); renderScenarios(); render(); });
  $('btn-close-sheet').addEventListener('click',() => $('help-sheet').close());
  $('btn-end-sheet').addEventListener('click',() => { $('help-sheet').close(); sim.act('end'); renderScenarios(); render(); });
  $('help-sheet').addEventListener('click',e => { if (e.target !== $('help-sheet')) return; const r = $('help-sheet').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('help-sheet').close(); });
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

  fillIcons(); setView(new URLSearchParams(location.search).get('view') === 'dispatch' ? 'dispatch' : 'app'); drawBase(); renderScenarios(); renderReports(); render();
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
