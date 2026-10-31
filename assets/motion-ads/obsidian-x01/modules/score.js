kit.score(function (S, T) {
  S.tempo(120, { t0: 0 });                       // a beat is half a second, so every cut lands on one
  S.program('pad', 'pad', { rev: .7 });
  S.program('keys', 'keys', { rev: .5 });
  S.program('bass', 'bass');
  S.program('pl', 'pluck', { rev: .35, pan: .15 });
  S.program('gl', 'glock', { rev: .7, pan: -.1 });
  // 1 · darkness, one scanning line, one blue pulse
  S.note('pad', 'D2', { t: 0, dur: 4.2, vel: 30 });
  S.note('pad', 'A2', { t: .4, dur: 3.8, vel: 22 });
  S.fx('whoosh', T.unknown + .1, { dur: 2.8, vel: 20 });
  S.note('gl', 'A5', { t: 1.95, dur: 1.6, vel: 40 });
  S.fx('revswell', T.separate, { dur: 1.2, vel: 38 });
  // 2 · the first separation
  S.fx('thud', T.separate, { vel: 58 });
  S.chord('pad', ['D2', 'A2', 'F3'], { t: 4, dur: 4.2, vel: 38 });
  S.fx('click', 4.25, { vel: 50 }); S.fx('click', 4.75, { vel: 46 });
  S.fx('whoosh', 4.8, { dur: 1.2, vel: 32 });
  [6.35, 6.5, 6.65, 6.8].forEach(t => S.drum('sidestick', { t, vel: 52 }));
  [6.4, 6.7, 7.0, 7.3].forEach(t => S.fx('tick', t, { vel: 28 }));
  S.fx('thud', 7.6, { vel: 52 });
  S.pattern('bass', 'x.......', { from: 12, repeat: 3, pitch: ['D2'], vel: 58 });
  // 3 · into the machine
  S.chord('pad', ['A#1', 'F2', 'D3'], { t: 8, dur: 2.7, vel: 40 });
  S.fx('whoosh', 9.0, { dur: 1.6, vel: 50 });
  S.fx('whoosh', 10.5, { dur: .35, vel: 38, pan: -.3 }); S.fx('whoosh', 10.85, { dur: .35, vel: 36, pan: .3 }); S.fx('whoosh', 11.15, { dur: .4, vel: 34 });
  S.pattern('pl', 'xxXxxxXxxxXx', { from: 20, repeat: 1, pitch: ['D4', 'A4', 'F4', 'C5'], vel: 42 });
  S.drums({ hat: 'oxoxoxoxoxox' }, { from: 20, repeat: 1, vel: 36 });
  S.chord('pad', ['C2', 'G2', 'E3'], { t: 10.6, dur: 2.6, vel: 42 });
  // 4 · the core awakens, builds, releases, freezes
  S.chord('pad', ['D2', 'A2', 'D3', 'F3'], { t: 13, dur: 4, vel: 34 });
  S.note('gl', 'D6', { t: 13.6, dur: 2, vel: 44 });
  S.fx('thud', 13.95, { vel: 46 }); S.note('gl', 'A5', { t: 14, dur: 1.5, vel: 38 });
  S.fx('sparkle', 14.4, { vel: 38 });
  [[15, 50], [15.75, 58], [16.25, 66], [16.6, 74], [16.85, 82]].forEach(k => S.drum('kick', { t: k[0], vel: k[1] }));
  S.run('gl', ['D5', 'E5', 'F5', 'A5', 'C6', 'D6', 'E6'], { t: 16.25, step: .1, vel: 36, cresc: 6 });
  S.fx('revswell', T.core + 4, { dur: 1.6, vel: 58 });
  S.drum('crash', { t: 17, vel: 100 }); S.drum('kick', { t: 17, vel: 115 }); S.fx('thud', 17, { vel: 88 });
  S.chord('keys', ['D3', 'A3', 'D4', 'F4', 'A4'], { t: 17, dur: 1.2, vel: 80 });
  S.note('bass', 'D1', { t: 17, dur: 1, vel: 100 });
  // 5 · perfect reassembly
  S.fx('whoosh', T.rebuild + .1, { dur: 1.2, vel: 48, into: 1 });
  S.drums({ kick: 'x...x...x...x...', hat: '.x.x.x.x.x.x.x.x' }, { from: 36, repeat: 1, vel: 70 });
  S.pattern('bass', 'x.x.x.x.x.x.x.x.', { from: 36, repeat: 1, pitch: ['D2', 'D2', 'F2', 'G2'], vel: 70 });
  S.pattern('pl', 'xxxxxxxxxxxxxxxx', { from: 36, repeat: 1, pitch: ['D5', 'A4', 'F5', 'A4'], vel: 44 });
  S.chord('pad', ['D2', 'A2', 'F3'], { t: 18, dur: 2, vel: 40 }); S.chord('pad', ['A#1', 'F2', 'D3'], { t: 20, dur: 2, vel: 44 });
  S.fx('click', 19.42, { vel: 55 });
  [20.5, 20.63, 20.76, 20.89].forEach(t => S.drum('sidestick', { t, vel: 72 }));
  S.fx('thud', 21.05, { vel: 70 });
  S.fx('click', 21.45, { vel: 72 }); S.fx('sparkle', 21.5, { vel: 34 });
  S.fx('revswell', T.reveal, { dur: .8, vel: 48 });
  // 6 · OBSIDIAN
  S.drum('kick', { t: 22, vel: 90 }); S.drum('crash', { t: 22, vel: 58 });
  S.chord('keys', ['D3', 'A3', 'E4', 'F#4', 'A4'], { t: 22, dur: 3, vel: 62 });
  S.chord('pad', ['D2', 'A2', 'F#3', 'A3'], { t: 22, dur: 3.2, vel: 48 });
  S.note('bass', 'D2', { t: 22, dur: 2.5, vel: 72 });
  S.note('gl', 'A5', { t: 23.3, dur: 1.5, vel: 40 }); S.note('gl', 'D6', { t: 23.55, dur: 1.5, vel: 38 });
  S.note('gl', 'F#6', { t: 24.1, dur: 1.2, vel: 34 });
  S.master({ gain: -6, fadeOut: 1 });
});
