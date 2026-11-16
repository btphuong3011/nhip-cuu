'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSimulation, distance, VICTIM, RADIUS } = require('./simulation.js');
const run = id => { const sim = createSimulation(id); sim.startAuto(); sim.tick(600); return sim; };

test('complete standard drill records ordered milestones, freezes, and makes no ambulance arrival claim', () => {
  const sim = run('standard'), s = sim.state;
  assert.equal(s.phase,'done');
  assert.ok(Math.abs(s.metrics.compress-17) < .2);
  assert.ok(s.metrics.alarm < s.metrics.call && s.metrics.call < s.metrics.compress);
  assert.ok(s.metrics.firstVol > s.metrics.compress && s.metrics.aed > s.metrics.firstVol);
  assert.ok(s.log.some(e => e.text.includes('không thể đi')));
  const before = JSON.stringify(s); sim.tick(100); assert.equal(JSON.stringify(s),before);
  assert.match(sim.report().source,/mô phỏng/);
  assert.ok(!s.log.some(e => /^.*115 đã tới\.$/.test(e.text)));
});
test('a silent volunteer times out at 15 seconds and receives no duplicate assignment', () => {
  const sim = createSimulation('no-response'); sim.startAuto(); sim.tick(20.8);
  const v = sim.state.vols.find(v => v.id === 'v1');
  assert.equal(v.status,'notified');
  sim.tick(.4); assert.equal(v.status,'timedout');
  const event = sim.state.log.find(e => e.text.includes('Minh Anh không phản hồi'));
  assert.ok(Math.abs(event.t-v.notifiedAt-15) < .2);
  assert.ok(sim.state.log.some(e => e.t >= event.t && e.text.startsWith('Báo ') && !e.text.includes('Minh Anh')));
  sim.tick(600); assert.equal(sim.state.phase,'done');
  assert.ok(sim.state.metrics.firstVol != null);
  assert.equal(sim.state.log.filter(e => e.text.startsWith('Báo Minh Anh')).length,1);
});
test('manual acceptance prevents the no-response timeout', () => {
  const sim = createSimulation('no-response'); sim.startAuto(); sim.tick(8);
  assert.equal(sim.respond('v1',true),true); sim.tick(20);
  assert.equal(sim.state.vols.find(x => x.id === 'v1').status,'enroute');
  assert.ok(!sim.state.log.some(e => e.text.includes('Minh Anh không phản hồi')));
});
test('unavailable AED is excluded; runner follows the shortest available combined route', () => {
  const sim = createSimulation('aed-unavailable'); sim.startAuto(); sim.tick(6);
  const s = sim.state, runner = s.vols.find(v => v.role === 'aed');
  assert.ok(runner); assert.notEqual(runner.aed.id,'aed1'); assert.equal(s.aedTaken.aed1,undefined);
  const pool = s.vols.filter(v => ['idle','notified'].includes(v.status) && (!v.role || v.role === 'aed') && distance(v,VICTIM) <= RADIUS);
  const best = Math.min(...pool.flatMap(v => s.aeds.filter(a => a.available).map(a => distance(v,a)+distance(a,VICTIM))));
  assert.ok(Math.abs(distance(runner,runner.aed)+distance(runner.aed,VICTIM)-best) < .01);
  sim.tick(600); assert.equal(s.phase,'done'); assert.ok(s.metrics.aed != null);
  assert.ok(!s.log.some(e => /lấy AED tại Trạm y tế/.test(e.text)));
});
test('pause freezes deadlines and movement; resume completes without a time jump', () => {
  const sim = createSimulation('no-response'); sim.startAuto(); sim.tick(9); sim.state.paused = true;
  const before = JSON.stringify(sim.state); sim.tick(300); assert.equal(JSON.stringify(sim.state),before);
  sim.state.paused = false; sim.tick(1); assert.ok(Math.abs(sim.state.t-10) < .01);
  sim.tick(600); assert.equal(sim.state.phase,'done');
});
test('partial manual report preserves missing milestones instead of treating them as success', () => {
  const sim = createSimulation(); assert.equal(sim.act('send'),false); assert.equal(sim.report(),null);
  sim.act('sos'); assert.equal(sim.act('send'),false); sim.act('q1u'); sim.act('q2u'); sim.act('send');
  sim.act('call'); sim.act('end'); const r = sim.report();
  assert.equal(r.metrics.compress,null); assert.equal(r.metrics.firstVol,null); assert.equal(r.metrics.aed,null);
  assert.equal(r.mode,'Thao tác thủ công');
});
test('fresh simulation resets resources and every timestamp, and toggles persist into dispatch', () => {
  const old = run('aed-unavailable'), fresh = createSimulation('standard');
  assert.equal(fresh.state.t,null); assert.equal(fresh.state.log.length,0);
  assert.ok(fresh.state.aeds.every(a => a.available)); assert.notEqual(old.state,fresh.state);
  assert.equal(fresh.toggleVolunteer('v1'),true); fresh.startAuto(); fresh.tick(7);
  assert.equal(fresh.state.vols.find(v => v.id === 'v1').role,null);
  assert.equal(fresh.toggleVolunteer('v1'),false);
});
