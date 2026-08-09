import assert from 'node:assert/strict';
import { MODE_DRAWS, STATE_TO_MODE, resolvePreset } from '../dist/index.es.js';

const CUSTOM_COLOR = 'rgb(12, 34, 56)';

class RecordingCanvas {
  fillStyle = '';
  strokeStyle = '';
  globalAlpha = 1;
  lineWidth = 1;
  records = [];
  stack = [];

  save() {
    this.stack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      globalAlpha: this.globalAlpha,
      lineWidth: this.lineWidth
    });
  }

  restore() {
    const state = this.stack.pop();
    assert.ok(state, 'restore() must have a matching save()');
    Object.assign(this, state);
  }

  beginPath() {}
  arc() {}
  moveTo() {}
  lineTo() {}

  fill() {
    this.records.push({ kind: 'fill', style: this.fillStyle, alpha: this.globalAlpha });
  }

  stroke() {
    this.records.push({ kind: 'stroke', style: this.strokeStyle, alpha: this.globalAlpha });
  }
}

for (const state of Object.keys(STATE_TO_MODE)) {
  for (const size of [20, 64]) {
    const { mode, opts } = resolvePreset(state, size);
    const draw = MODE_DRAWS[mode];

    const tinted = new RecordingCanvas();
    draw(tinted, size, 1.25, true, opts, CUSTOM_COLOR);
    assert.ok(tinted.records.length > 0, `${state}/${size} must paint a tinted frame`);
    assert.ok(
      tinted.records.every(({ style }) => style === CUSTOM_COLOR),
      `${state}/${size} must use the supplied color for every painted primitive`
    );
    assert.ok(
      tinted.records.every(({ alpha }) => alpha > 0 && alpha <= 1),
      `${state}/${size} must preserve valid depth opacity`
    );
    assert.equal(tinted.globalAlpha, 1, `${state}/${size} must restore canvas alpha`);
    assert.equal(tinted.stack.length, 0, `${state}/${size} must balance save/restore`);

    const monochrome = new RecordingCanvas();
    draw(monochrome, size, 1.25, true, opts);
    assert.ok(monochrome.records.length > 0, `${state}/${size} must retain monochrome rendering`);
    assert.ok(
      monochrome.records.every(({ style }) => /^rgba\(\d+,\d+,\d+,[\d.]+\)$/.test(style)),
      `${state}/${size} must retain the original grayscale palette without color`
    );
  }
}

console.log(`Verified custom and monochrome paint paths for ${Object.keys(STATE_TO_MODE).length} states at both sizes.`);
