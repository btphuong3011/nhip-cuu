/* Nhịp Cứu: deterministic, browser-independent simulation. No real alerts or locations. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NhipCuuSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const BPM = 110, RADIUS = 500, MOVE_SPEED = 2, AED_PICKUP = 15, RESPONSE_TIMEOUT = 15;
  const VICTIM = { x: 606, y: 246, label: 'Sảnh nhà B3' };
  const AEDS = [
    { id: 'aed1', x: 425, y: 368, label: 'Trạm y tế' },
    { id: 'aed2', x: 600, y: 398, label: 'Nhà thi đấu' },
    { id: 'aed3', x: 430, y: 188, label: 'Căn tin' }
  ];
  const VOLUNTEERS = [
    ['v1','Minh Anh',700,318,true,7,true], ['v2','Quốc Bảo',520,140,true,9,false],
    ['v3','Thu Hà',800,250,true,11,true], ['v4','Gia Huy',360,300,true,6,true],
    ['v5','Ngọc Lan',455,420,true,8,true], ['v6','Đức Thịnh',840,420,true,10,true],
    ['v7','Khánh Linh',250,145,true,12,true], ['v8','Hoàng Nam',150,250,true,9,true],
    ['v9','Bảo Trâm',60,440,true,9,true], ['v10','Tuấn Kiệt',780,540,true,9,true],
    ['v11','Mai Phương',330,520,true,9,true], ['v12','Văn Long',610,145,false,9,true],
    ['v13','Thanh Tâm',120,145,false,9,true], ['v14','Hải Yến',860,80,true,9,true]
  ];
  const SCENARIOS = [
    { id: 'standard', name: 'Ca tiêu chuẩn', subtitle: 'Theo dõi trọn vẹn một lượt điều phối.', detail: 'Một TNV từ chối; hệ thống chọn người thay thế. Cả 3 trạm AED đều khả dụng.', icon: 'heart' },
    { id: 'no-response', name: 'TNV không phản hồi', subtitle: 'Tự chuyển ca sau 15 giây chờ.', detail: 'Minh Anh không phản hồi. Sau 15 giây, hệ thống giao nhiệm vụ cho TNV khác trong bán kính 500 m.', icon: 'timer' },
    { id: 'aed-unavailable', name: 'Trạm AED tạm ngưng', subtitle: 'Chọn tuyến lấy AED còn khả dụng.', detail: 'AED tại Trạm y tế đang bảo trì. Bộ điều phối loại trạm này và chọn cặp TNV–AED có tổng quãng đường ngắn nhất trong mô hình.', icon: 'aed' }
  ];
  const TARGETS = { compress: 60, firstVol: 240, aed: 300 };
  const METRICS = [
    ['alarm', 'Gửi báo động'], ['call', 'Gọi 115 (mô phỏng)'], ['compress', 'Ép tim đầu tiên'],
    ['firstAccept', 'TNV đầu tiên nhận ca'], ['firstVol', 'TNV đầu tiên tới'], ['aed', 'AED tới hiện trường']
  ];
  const SCRIPT = [ [0,'sos'], [3,'q1'], [5,'q2'], [6,'send'], [11,'call'], [17,'cpr'] ];
  const distance = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
  function createSimulation(scenarioId) {
    const scenario = SCENARIOS.find(x => x.id === scenarioId) || SCENARIOS[0];
    const state = {
      scenario: scenario.id, t: null, phase: 'idle', auto: false, paused: false, scriptIndex: 0,
      q1: null, q2: null, cprAt: null, doneAt: null, endReason: null,
      caption: 'Bấm “Bắt đầu ép” để chạy nhịp hướng dẫn mô phỏng.', cueVersion: 0, lastCue: 0, lastSwap: 0,
      vols: VOLUNTEERS.map(([id,name,x,y,ready,delay,accept]) => ({
        id,name,x,y,ready,delay: scenario.id === 'no-response' && id === 'v1' ? null : delay,
        accept, status: ready ? 'idle' : 'off', role: null, path: [], dwell: 0,
        notifiedAt: null, decideAt: null, aed: null, me: id === 'v1'
      })),
      aeds: AEDS.map(a => ({ ...a, available: !(scenario.id === 'aed-unavailable' && a.id === 'aed1') })),
      aedTaken: {}, log: [], metrics: Object.fromEntries(METRICS.map(([key]) => [key,null]))
    };
    const log = (text,kind = '') => state.log.push({ t: state.t ?? 0, text, kind });
    const cue = text => { state.caption = text; state.cueVersion++; };
    const candidates = () => state.vols.filter(v => v.status === 'idle' && distance(v,VICTIM) <= RADIUS);
    function pathLeft(v) {
      let p = v, d = 0;
      for (const w of v.path) { d += distance(p,w); p = w; }
      return d;
    }
    function eta(v) {
      const pickup = v.path.some(w => w.aed) && state.aedTaken[v.aed?.id] !== v.id ? AED_PICKUP : 0;
      return pathLeft(v)/MOVE_SPEED + v.dwell + pickup;
    }
    function notify(v,role,aed) {
      v.status = 'notified'; v.role = role; v.aed = aed || null;
      v.notifiedAt = state.t; v.decideAt = v.delay == null ? null : state.t + v.delay;
      log(role === 'aed' ? `Giao ${v.name} lấy AED tại ${aed.label}, rồi tới ${VICTIM.label}.` : `Báo ${v.name} tới hiện trường · cách ${Math.round(distance(v,VICTIM))} m.`, role === 'aed' ? 'aed' : '');
    }
    function notifyScene() {
      const next = candidates().sort((a,b) => distance(a,VICTIM)-distance(b,VICTIM))[0];
      if (next) notify(next,'scene');
      else log('Không còn TNV sẵn sàng trong bán kính 500 m. Tiếp tục hướng dẫn và gọi 115.','alarm');
    }
    function notifyAed() {
      let best = null;
      for (const v of candidates()) for (const a of state.aeds) {
        if (!a.available || state.aedTaken[a.id]) continue;
        const cost = distance(v,a)+distance(a,VICTIM);
        if (!best || cost < best.cost) best = { v,a,cost };
      }
      if (best) { state.aedTaken[best.a.id] = 'assigned'; notify(best.v,'aed',best.a); }
      else log('Chưa có cặp TNV–AED khả dụng trong mô hình. Không yêu cầu người đang ép tim rời hiện trường.','alarm');
    }
    function dispatch() {
      const pool = candidates().sort((a,b) => distance(a,VICTIM)-distance(b,VICTIM));
      log(`Phát báo động giả lập tới mạng lưới: ${pool.length} TNV sẵn sàng trong 500 m.`,'alarm');
      if (scenario.id === 'aed-unavailable') log('Loại AED tại Trạm y tế khỏi điều phối: đang bảo trì.','aed');
      pool.slice(0,3).forEach(v => notify(v,'scene'));
      notifyAed();
    }
    function accept(v) {
      if (v.status !== 'notified') return;
      v.status = 'enroute';
      v.path = v.role === 'aed' ? [{ x:v.aed.x,y:v.aed.y,aed:v.aed.id },{...VICTIM}] : [{...VICTIM}];
      if (state.metrics.firstAccept == null) state.metrics.firstAccept = state.t;
      log(`${v.name} nhận ca · ETA mô hình ${Math.ceil(eta(v))} giây.`,'go');
    }
    function decline(v,timeout = false) {
      if (v.status !== 'notified') return;
      v.status = timeout ? 'timedout' : 'declined';
      log(timeout ? `${v.name} không phản hồi sau ${RESPONSE_TIMEOUT} giây · tự tìm người thay thế.` : `${v.name} không thể đi · chuyển nhiệm vụ cho người khác.`, timeout ? 'alarm' : '');
      if (v.role === 'aed') { delete state.aedTaken[v.aed.id]; notifyAed(); }
      else notifyScene();
    }
    function finish(reason) {
      if (state.phase === 'idle' || state.phase === 'done') return false;
      state.phase = 'done'; state.doneAt = state.t; state.endReason = reason; state.paused = false;
      log('Kết thúc lượt mô phỏng. Không suy diễn xe 115 đã tới hoặc người bệnh đã hồi phục.','');
      return true;
    }
    function act(action) {
      if (state.phase === 'done') return false;
      if (action === 'sos' && state.phase === 'idle') {
        state.t = 0; state.phase = 'confirm'; log('Người chứng kiến bắt đầu báo động mô phỏng.','alarm');
      } else if ((action === 'q1' || action === 'q1u') && state.phase === 'confirm') state.q1 = action === 'q1' ? 'yes' : 'unsure';
      else if ((action === 'q2' || action === 'q2u') && state.phase === 'confirm') state.q2 = action === 'q2' ? 'yes' : 'unsure';
      else if (action === 'send' && state.phase === 'confirm' && state.q1 && state.q2) {
        state.phase = state.metrics.call != null ? 'coach' : 'call'; state.metrics.alarm = state.t; log(`Gửi vị trí giả lập: ${VICTIM.label}.`,'alarm'); dispatch();
      } else if ((action === 'call' && state.phase === 'call') || action === 'call-now') {
        // The 115 action stays available before assessment; it never unlocks CPR by itself.
        if (state.phase === 'idle') { state.t = 0; state.phase = 'confirm'; }
        if (state.metrics.call == null) { state.metrics.call = state.t; log('Gọi 115 và bật loa ngoài (mô phỏng, không thực hiện cuộc gọi).'); }
        if (state.phase === 'call') state.phase = 'coach';
      } else if (action === 'cpr' && state.phase === 'coach' && state.cprAt == null) {
        state.cprAt = state.t; state.lastCue = state.t; state.lastSwap = state.t;
        if (state.metrics.compress == null) state.metrics.compress = state.t;
        log('Bắt đầu nhịp hướng dẫn ép tim mô phỏng.','go');
        cue('Hai tay chồng lên nhau, đặt giữa ngực. Ấn mạnh và nhanh; để ngực nảy lên hết sau mỗi lần ấn.');
      } else if (action === 'end') return finish('manual');
      else return false;
      return true;
    }
    function arrive(v) {
      v.status = 'arrived';
      if (v.role === 'aed') {
        if (state.metrics.aed == null) state.metrics.aed = state.t;
        log(`${v.name} mang AED tới hiện trường (mô phỏng).`,'aed');
        if (state.phase === 'coach') cue('AED đã tới. Bật máy và làm theo hướng dẫn bằng giọng nói của máy.');
      } else {
        if (state.metrics.firstVol == null) state.metrics.firstVol = state.t;
        if (state.metrics.compress == null) state.metrics.compress = state.t;
        log(`${v.name} tới hiện trường, tham gia ép tim trong kịch bản.`, 'go');
      }
    }
    function tick(dt) {
      if (!Number.isFinite(dt) || dt <= 0 || state.t == null || state.paused || state.phase === 'done') return;
      // Substeps keep dispatch, deadlines and travel reproducible across display frame rates.
      let remaining = dt;
      while (remaining > 1e-8 && state.phase !== 'done') {
        const delta = Math.min(remaining,0.1); remaining -= delta; state.t += delta;
        if (state.auto) while (state.scriptIndex < SCRIPT.length && SCRIPT[state.scriptIndex][0] <= state.t+1e-8) {
          act(SCRIPT[state.scriptIndex][1]); state.scriptIndex++;
        }
        for (const v of state.vols) {
          if (v.status === 'notified') {
            if (v.decideAt != null && state.t+1e-8 >= v.decideAt) v.accept ? accept(v) : decline(v);
            else if (state.t+1e-8 >= v.notifiedAt+RESPONSE_TIMEOUT) decline(v,true);
          }
          if (v.status !== 'enroute') continue;
          let time = delta;
          while (time > 1e-8 && (v.path.length || v.dwell > 0)) {
            if (v.dwell > 0) {
              const spent = Math.min(time,v.dwell); time -= spent; v.dwell -= spent;
              if (v.dwell <= 1e-8) { v.dwell = 0; log(`${v.name} đã lấy AED, đang mang tới.`,'aed'); }
              continue;
            }
            const w = v.path[0], d = distance(v,w), needed = d/MOVE_SPEED;
            if (needed <= time+1e-8) {
              v.x = w.x; v.y = w.y; time -= needed; v.path.shift();
              if (w.aed) { state.aedTaken[w.aed] = v.id; v.dwell = AED_PICKUP; }
            } else { v.x += (w.x-v.x)/d*MOVE_SPEED*time; v.y += (w.y-v.y)/d*MOVE_SPEED*time; time = 0; }
          }
          if (!v.path.length && v.dwell <= 0) arrive(v);
        }
        if (state.phase === 'coach' && state.cprAt != null) {
          if (state.t-state.lastSwap >= 120) { state.lastSwap = state.t; state.lastCue = state.t; cue('Đã hai phút. Nếu có người thay, đổi người ép và giảm tối đa thời gian gián đoạn.'); }
          else if (state.t-state.lastCue >= 30) { state.lastCue = state.t; cue('Ấn sâu khoảng 5 đến 6 xăng ti mét ở người lớn, theo nhịp hướng dẫn. Để ngực nảy lên hết.'); }
        }
        if (state.auto && ((state.metrics.aed != null && state.t-state.metrics.aed >= 10) || state.t >= 600)) finish('auto');
      }
    }
    function startAuto() { if (state.phase !== 'idle') return false; state.auto = true; act('sos'); state.scriptIndex = 1; return true; }
    function respond(id,accepted) { const v = state.vols.find(x => x.id === id); if (v?.status === 'notified') { accepted ? accept(v) : decline(v); return true; } return false; }
    function toggleVolunteer(id) { const v = state.vols.find(x => x.id === id); if (state.phase !== 'idle' || !v || !['idle','off'].includes(v.status)) return false; v.status = v.status === 'idle' ? 'off' : 'idle'; return true; }
    function report() {
      if (state.phase !== 'done') return null;
      return {
        version: 1, scenario: scenario.id, scenarioName: scenario.name, source: 'Dữ liệu mô phỏng; không phải diễn tập thực địa hoặc kết quả lâm sàng.',
        mode: state.auto ? 'Kịch bản tự động' : 'Thao tác thủ công', endReason: state.endReason, duration: state.doneAt,
        assumptions: { movementMetersPerSecond: MOVE_SPEED, pickupSeconds: AED_PICKUP, radiusMeters: RADIUS, responseTimeoutSeconds: RESPONSE_TIMEOUT },
        metrics: {...state.metrics}, targets: {...TARGETS}, log: state.log.map(e => ({...e}))
      };
    }
    return { state, act, tick, startAuto, respond, toggleVolunteer, pathLeft, eta, report };
  }
  return { BPM,RADIUS,MOVE_SPEED,AED_PICKUP,RESPONSE_TIMEOUT,VICTIM,SCENARIOS,TARGETS,METRICS,distance,createSimulation };
});
