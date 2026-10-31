kit.score(function (S, T) {
  const H = T.heist, BK = T.breached;
  S.tempo(112.5, { t0: H + 3.0 });
  S.program('pad', 'pad', { rev: 0.65 }); S.program('bass', 'bass'); S.program('keys', 'keys', { rev: 0.3 });
  S.program('mallet', 'pluck', { rev: 0.45, pan: 0.2 }); S.program('glock', 'glock', { rev: 0.55 });
  // opening: dot, scan line, city assembles, signal wakes
  S.note('pad', 'D2', { t: H + 0, dur: 3.2, vel: 26 });
  S.fx('sparkle', H + 0.45, { vel: 30 });
  S.fx('revswell', H + 2.2, { dur: 1.4, vel: 46 });
  const ticks = [];
  [[1.0, 26], [1.42, 23], [1.86, 21]].forEach(([t0, n]) => { for (let i = 0; i < n; i += 2) ticks.push(H + t0 + i / 44); });
  S.ticks(ticks, { vel: 14 });
  S.fx('pop', H + 2.25, { vel: 60 }); S.fx('pop', H + 2.62, { vel: 52 });
  // infiltration: light pulse
  S.chord('pad', ['D3', 'A3', 'E4', 'F4'], { t: H + 3.0, dur: 5.6, vel: 34 });
  S.pattern('bass', 'x.x.x.x.', { from: 0, repeat: 2, pitch: ['D2', 'D2', 'F2', 'D2'], vel: 52 });
  S.pattern('bass', 'x.x.x', { from: 8, pitch: ['D2', 'D2', 'C2'], vel: 56 });
  S.pattern('mallet', 'x...x...', { from: 0, repeat: 2, pitch: ['A5', 'F5', 'E5', 'D5'], vel: 34 });
  S.drums({ hat: 'o.o.x.o.' }, { from: 2, repeat: 2, vel: 40 });
  // near-detection: stop-time, alarm, gates
  S.chord('keys', ['D4', 'D#4', 'A4'], { t: H + 8.65, dur: 0.8, vel: 58 });
  S.fx('whoosh', H + 8.65, { dur: 0.6, into: 1, vel: 50 });
  S.fx('thud', H + 9.14, { vel: 92 }); S.drum('tom', { t: H + 9.14, vel: 70 });
  S.fx('thud', H + 9.44, { vel: 92 }); S.drum('tom', { t: H + 9.44, vel: 64 });
  S.chord('pad', ['D2', 'A2', 'D#3'], { t: H + 9.2, dur: 1.8, vel: 40 });
  S.fx('sparkle', H + 9.8, { vel: 50 });
  S.fx('whoosh', H + 10.38, { dur: 0.5, vel: 60 });
  // chase
  S.drums({ kick: 'x.x.x.x.', snare: '..x...x.', hat: 'xxxxxxxx' }, { from: 15, repeat: 2, vel: 84 });
  S.pattern('bass', 'xxxxxxxx', { from: 15, repeat: 2, pitch: ['D2', 'D2', 'D2', 'F2', 'D2', 'D2', 'A1', 'C2'], vel: 72 });
  S.chord('keys', ['D4', 'F4', 'A4'], { beat: 15, beats: 0.5, vel: 62 });
  S.chord('keys', ['C4', 'F4', 'A4'], { beat: 17, beats: 0.5, vel: 62 });
  S.chord('keys', ['A#3', 'D4', 'F4'], { beat: 19, beats: 0.5, vel: 64 });
  S.chord('keys', ['A3', 'E4', 'A4'], { beat: 21, beats: 0.5, vel: 68 });
  S.fx('whoosh', H + 12.0, { dur: 0.35, vel: 62 }); S.fx('whoosh', H + 12.55, { dur: 0.4, vel: 58 });
  S.fx('whoosh', H + 13.7, { dur: 0.45, vel: 64 });
  S.fx('thud', H + 13.1, { vel: 48 }); S.fx('thud', H + 14.38, { vel: 90 }); S.fx('thud', H + 14.95, { vel: 46 });
  // the vault: drop, heartbeat, countdown
  S.chord('pad', ['D2', 'A2', 'D3', 'F3'], { t: H + 15.3, dur: 3.3, vel: 42 });
  S.drums({ kick: 'x.' }, { from: 23, repeat: 5, vel: 52 });
  S.note('glock', 'A5', { t: H + 16.9, dur: 0.4, vel: 50 }); S.note('glock', 'A5', { t: H + 17.35, dur: 0.4, vel: 54 }); S.note('glock', 'D6', { t: H + 17.8, dur: 0.4, vel: 60 });
  S.fx('ding', H + 18.2, { vel: 62 });
  S.run('mallet', ['D5', 'F5', 'A5', 'C6', 'D6'], { t: H + 18.22, step: 0.08, vel: 50, cresc: 10 });
  S.fx('revswell', H + 18.66, { dur: 0.5, vel: 60 });
  S.fx('thud', H + 18.66, { vel: 66 });
  // breach
  S.note('bass', 'D2', { t: H + 19.2, dur: 0.15, vel: 50 });
  S.drum('kick', { t: H + 19.35, vel: 124 }); S.drum('crash', { t: H + 19.35, vel: 100 }); S.fx('thud', H + 19.35, { vel: 112 });
  S.chord('pad', ['D2', 'A2', 'D3', 'F3', 'A3'], { t: H + 19.35, dur: 1.25, vel: 70 });
  S.note('bass', 'D2', { t: H + 19.35, dur: 1.2, vel: 100 });
  S.fx('whoosh', H + 19.55, { dur: 0.9, vel: 70 });
  for (let k = 0; k < 15; k++) S.drum('snare', { t: H + 19.6 + k * 0.06, vel: 40 + k * 4 });
  [19.62, 19.8, 19.98, 20.16].forEach((x, i) => S.drum('tom', { t: H + x, vel: 90 - i * 8 }));
  S.fx('revswell', H + 20.58, { dur: 0.6, vel: 80 });
  S.drum('crash', { t: H + 20.58, vel: 110 }); S.drum('kick', { t: H + 20.58, vel: 110 });
  // BREACHED.
  S.drum('kick', { t: BK + 0.3, vel: 127 }); S.fx('thud', BK + 0.3, { vel: 120 });
  S.chord('pad', ['D2', 'A2', 'F3', 'A3', 'D4'], { t: BK + 0.3, dur: 2.7, vel: 62 });
  S.note('bass', 'D2', { t: BK + 0.3, dur: 2.5, vel: 96 });
  S.note('glock', 'D6', { t: BK + 0.32, dur: 1.5, vel: 40 });
  const cap = []; for (let i = 0; i < 26; i++) cap.push(BK + 0.95 + i / 42);
  S.ticks(cap, { vel: 14 });
  S.master({ gain: -6, fadeOut: 1.0 });
});
