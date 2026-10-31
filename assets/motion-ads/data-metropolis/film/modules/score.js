kit.score(function (S, T) {
  S.tempo(120, { t0: 0 });
  S.program('pad', 'pad', { rev: 0.75, gain: -3 });
  S.program('pl', 'pluck', { rev: 0.45, pan: -0.25, gain: -4 });
  S.program('gl', 'glock', { rev: 0.6, pan: 0.3, gain: -8 });
  S.program('ep', 'ep', { rev: 0.35, gain: -5 });
  S.program('bass', 'bass', { gain: -2 });
  // the first signal: a held open chord, one bright note on the point of light, a note as each bar lands
  S.chord('pad', ['A2', 'E3', 'B3'], { t: 0, dur: 7.4, vel: 30 });
  S.note('gl', 'E6', { t: 0, dur: 2, vel: 52 });
  ['A4', 'C5', 'D5', 'E5', 'G5', 'A5'].forEach(function (n, i) { S.note('pl', n, { t: 1.62 + i * 0.17, dur: 0.5, vel: 54 + i * 3 }); });
  // awakening: the turn into space, windows cascading on
  S.fx('whoosh', T.awakening + 0.1, { dur: 1.6, vel: 36 });
  S.pattern('gl', 'x.x.x.x.', { from: 8, repeat: 1, pitch: ['E5', 'B5', 'A5', 'E6'], vel: 34 });
  S.fx('sparkle', 5.4, { vel: 40 });
  S.fx('revswell', 8.0, { dur: 1.0, vel: 40 });
  // the city comes alive: the groove, Am F C G, stopping dead at the freeze
  S.drums({ kick: 'x...x...', hat: '.x.x.x.x' }, { from: 16, repeat: 4 });
  S.drums({ clap: '....x...', shaker: 'oooooooo' }, { from: 24, repeat: 2 });
  [['A1', 16], ['F1', 20], ['C2', 24], ['G1', 28]].forEach(function (b) { S.pattern('bass', 'x..x..x.', { from: b[1], repeat: 1, pitch: [b[0]], vel: 80 }); });
  [[['A3', 'C4', 'E4', 'G4'], 16], [['F3', 'A3', 'C4', 'E4'], 20], [['G3', 'C4', 'E4', 'B4'], 24], [['G3', 'B3', 'D4', 'A4'], 28]].forEach(function (c) { S.chord('ep', c[0], { beat: c[1], beats: 3.5, vel: 46 }); });
  S.pattern('pl', 'x.xx.xx.', { from: 16, repeat: 4, pitch: ['A4', 'E5', 'C5', 'G5', 'E5'], vel: 42 });
  S.fx('whoosh', 13.7, { dur: 0.9, vel: 44 });
  S.run('gl', ['A5', 'B5', 'C6', 'D6', 'E6', 'G6'], { t: 15.4, step: 0.1, vel: 44, cresc: 8 });
  // the reveal: silence for the freeze, then the pull back and the chart standing up
  S.fx('whoosh', 16.3, { dur: 1.4, vel: 46 });
  S.chord('pad', ['F2', 'C3', 'E3', 'A3'], { t: 16.3, dur: 3.9, vel: 40 });
  S.fx('sparkle', 18.4, { vel: 44 });
  S.note('gl', 'C6', { t: 18.45, dur: 1, vel: 40 }); S.note('gl', 'E6', { t: 18.7, dur: 1.2, vel: 40 });
  S.fx('revswell', T.metropolis, { dur: 1.2, vel: 46 });
  // the title lands
  S.chord('ep', ['C3', 'G3', 'D4', 'E4'], { t: T.metropolis, dur: 2, vel: 62 });
  S.chord('pad', ['C3', 'G3', 'E4'], { t: T.metropolis, dur: 2, vel: 44 });
  S.note('bass', 'C2', { t: T.metropolis, dur: 2, vel: 78 });
  S.drum('kick', { t: T.metropolis, vel: 90 });
  S.note('gl', 'G5', { t: T.metropolis, dur: 1.6, vel: 46 }); S.note('gl', 'E6', { t: T.metropolis + 0.12, dur: 1.6, vel: 42 });
  S.master({ gain: -6, fadeOut: 1.2 });
});
