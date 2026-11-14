// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createEngine, isPersonVisible } from '../src/engine.js';
import { openCamera } from '../src/pose/camera.js';

function domError(name) {
  const e = new Error(name);
  e.name = name;
  return e;
}

function failingDevices(name) {
  return { getUserMedia: vi.fn(() => Promise.reject(domError(name))) };
}

async function startWith(mediaDevices) {
  const errors = [];
  const states = [];
  const engine = createEngine({
    stage: document.createElement('div'),
    search: '',
    mediaDevices,
    onState: (s) => states.push(s),
    onCompression: () => {},
    onError: (e) => errors.push(e),
  });
  await engine.start();
  engine.stop();
  return { errors, states };
}

describe('camera engine errors', () => {
  it('a rejected permission reaches onError as camera-denied', async () => {
    const devices = failingDevices('NotAllowedError');
    const { errors, states } = await startWith(devices);
    expect(devices.getUserMedia).toHaveBeenCalledOnce();
    expect(devices.getUserMedia.mock.calls[0][0]).toMatchObject({ audio: false, video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('camera-denied');
    expect(typeof errors[0].message).toBe('string');
    expect(states.at(-1).ready).toBe(false);
  });

  it('a missing camera reaches onError as no-camera', async () => {
    const { errors } = await startWith(failingDevices('NotFoundError'));
    expect(errors.map((e) => e.code)).toEqual(['no-camera']);
  });

  it('no mediaDevices at all is no-camera', async () => {
    await expect(openCamera(undefined)).rejects.toMatchObject({ code: 'no-camera' });
  });

  it('the stage gets a video and a canvas', async () => {
    const stage = document.createElement('div');
    const engine = createEngine({ stage, search: '', mediaDevices: failingDevices('NotAllowedError') });
    const started = engine.start();
    expect(stage.querySelector('video')).not.toBeNull();
    expect(stage.querySelector('canvas')).not.toBeNull();
    await started;
    expect(() => { engine.setDebug(true); engine.reset(); engine.markRest(); engine.stop(); }).not.toThrow();
  });
});

describe('isPersonVisible', () => {
  const lm = (vis) => Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: vis }));
  it('needs a shoulder and a hip above MIN_VISIBILITY', () => {
    expect(isPersonVisible(null)).toBe(false);
    expect(isPersonVisible(lm(0.9))).toBe(true);
    expect(isPersonVisible(lm(0.1))).toBe(false);
    const sideOn = lm(0.1);
    sideOn[11].visibility = 0.9;
    sideOn[23].visibility = 0.9;
    expect(isPersonVisible(sideOn)).toBe(true);
  });
});
