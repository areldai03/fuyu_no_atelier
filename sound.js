(() => {
  'use strict';

  const STORAGE_KEY = 'fuyu-no-atelier-sound-v1';
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let enabled = true;
  try { enabled = localStorage.getItem(STORAGE_KEY) !== 'off'; } catch {}
  let context, musicBus, effectBus, musicTimer, nextStepTime = 0, stepIndex = 0, inStudio = false, rustleBuffer;

  const harmony = [
    {bass:50, pad:[62,66,69], arp:[62,66,69,76]},
    {bass:47, pad:[59,62,69], arp:[59,62,66,69]},
    {bass:43, pad:[59,62,66], arp:[59,62,66,69]},
    {bass:45, pad:[57,62,64], arp:[57,62,64,69]},
    {bass:42, pad:[62,66,69], arp:[62,66,69,76]},
    {bass:40, pad:[55,59,62], arp:[55,59,62,67]},
    {bass:43, pad:[58,62,64], arp:[58,62,64,69]},
    {bass:45, pad:[55,61,64], arp:[55,61,64,69]}
  ];
  const melody = [
    74,null,78,null,81,null,78,null,
    76,null,74,null,71,null,74,null,
    78,null,76,null,74,null,71,null,
    69,null,74,null,76,null,73,null,
    74,null,78,null,81,null,83,null,
    79,null,76,null,74,null,71,null,
    70,null,74,null,76,null,74,null,
    73,null,76,null,79,null,73,null
  ];
  const arpeggioOrder = [0,1,2,3,2,1,3,1];
  const ornamentScale = [74,76,78,79,81,83,85,86,85,83,81,79,78,76];
  const stepDuration = 60 / 78 / 2;
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

  function init() {
    if (context || !AudioContextClass) return !!context;
    try {
      context = new AudioContextClass();
      const master = context.createGain();
      master.gain.value = .68;
      master.connect(context.destination);
      musicBus = context.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(master);
      effectBus = context.createGain();
      effectBus.gain.value = .42;
      effectBus.connect(master);
      return true;
    } catch { return false; }
  }

  function note(midi, at, duration, level, bus, shape = 'sine') {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(frequency(midi), at);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain).connect(bus);
    osc.start(at);
    osc.stop(at + duration + .02);
  }

  function musicBox(midi, at, duration, level) {
    note(midi, at, duration, level, musicBus);
    note(midi + 12, at, Math.min(duration,.27), level * .13, musicBus);
  }

  function softPad(midi, at, duration, level) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency(midi), at);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.linearRampToValueAtTime(level, at + .65);
    gain.gain.setValueAtTime(level, at + duration - .65);
    gain.gain.linearRampToValueAtTime(.0001, at + duration);
    osc.connect(gain).connect(musicBus);
    osc.start(at);
    osc.stop(at + duration + .02);
  }

  function scheduleMusic() {
    if (!context || !inStudio || !enabled || document.hidden) return;
    while (nextStepTime < context.currentTime + .45) {
      const index = stepIndex % melody.length;
      const bar = Math.floor(index / 8);
      const beat = index % 8;
      const chord = harmony[bar];
      const pitch = melody[index];
      if (pitch !== null) musicBox(pitch, nextStepTime, stepDuration * 1.65, .15);
      musicBox(chord.arp[arpeggioOrder[beat]], nextStepTime + .035, stepDuration * 1.65, beat % 2 ? .046 : .035);
      if (beat === 0) {
        chord.pad.forEach(midi => softPad(midi, nextStepTime, stepDuration * 7.9, .023));
        note(chord.bass, nextStepTime, stepDuration * 4.1, .115, musicBus);
      }
      if (beat === 4) note(chord.bass + 7, nextStepTime, stepDuration * 3.2, .055, musicBus);
      if (beat === 7 && bar % 2 === 1) musicBox(chord.arp[3] + 12, nextStepTime + .15, .9, .025);
      nextStepTime += stepDuration;
      stepIndex++;
    }
  }

  function startMusic() {
    if (!inStudio || !enabled || document.hidden || !init()) return;
    context.resume().catch(() => {});
    if (musicTimer) return;
    musicBus.gain.setTargetAtTime(.31, context.currentTime, .35);
    nextStepTime = context.currentTime + .08;
    stepIndex = 0;
    scheduleMusic();
    musicTimer = window.setInterval(scheduleMusic, 130);
  }

  function stopMusic() {
    window.clearInterval(musicTimer);
    musicTimer = null;
    if (context) musicBus.gain.setTargetAtTime(0, context.currentTime, .12);
  }

  function rustle() {
    if (!rustleBuffer) {
      rustleBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .25), context.sampleRate);
      const data = rustleBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const at = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = rustleBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2300, at);
    filter.frequency.exponentialRampToValueAtTime(800, at + .22);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.linearRampToValueAtTime(.12, at + .035);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .23);
    source.connect(filter).connect(gain).connect(effectBus);
    source.start(at);
  }

  function ornamentPitch(index) { return ornamentScale[Math.max(0, index | 0) % ornamentScale.length]; }

  function play(kind = 'tap', pitch) {
    if (!enabled || !inStudio || !init()) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    const at = context.currentTime;
    if (kind === 'ornament') {
      const midi = Number.isFinite(pitch) ? Math.max(60, Math.min(90, pitch)) : ornamentPitch(0);
      note(midi, at, .82, .19, effectBus);
      note(midi + 12, at, .27, .027, effectBus);
      return;
    }
    if (kind === 'page') { rustle(); note(72, at + .045, .18, .045, effectBus); return; }
    if (kind === 'light' || kind === 'catch') {
      note(kind === 'catch' ? 84 : 79, at, .52, .15, effectBus);
      note(kind === 'catch' ? 88 : 83, at + .09, .6, .11, effectBus);
      return;
    }
    if (kind === 'gift') {
      [72, 76, 79].forEach((midi, i) => note(midi, at + i * .09, .55, .1, effectBus));
      return;
    }
    if (kind === 'brush') { note(62, at, .12, .025, effectBus, 'triangle'); return; }
    note(67, at, .09, .055, effectBus, 'triangle');
  }

  function updateButton() {
    const button = document.getElementById('storybookSound');
    if (!button) return;
    button.textContent = enabled ? '音を消す' : '音を出す';
    button.setAttribute('aria-label', button.textContent);
    button.setAttribute('aria-pressed', String(enabled));
  }

  function toggle() {
    enabled = !enabled;
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch {}
    if (enabled) startMusic(); else stopMusic();
    updateButton();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !inStudio || button.id === 'storybookSound') return;
    if (button.id === 'bookPrev' || button.id === 'bookNext') play('page');
    else if (button.matches('[data-story-gift],[data-panel-gift]')) play('gift');
    else if (button.matches('.storybook-light-hotspot')) return;
    else play('tap');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMusic(); else startMusic();
  });

  window.winterAudio = {
    enter() { inStudio = true; startMusic(); play('page'); },
    leave() { inStudio = false; stopMusic(); },
    play, toggle, updateButton, ornamentPitch,
    get enabled() { return enabled; },
    get playing() { return !!musicTimer && context?.state === 'running'; }
  };
})();
