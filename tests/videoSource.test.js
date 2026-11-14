// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadVideo } from '../src/pose/videoSource.js';
import { createEngine } from '../src/engine.js';

// A stand-in for <video>: records what was set, and lets the test fire media events.
class FakeVideo extends EventTarget {
  constructor() {
    super();
    this.src = '';
    this.loop = false;
    this.muted = false;
    this.playsInline = false;
    this.played = 0;
    this.loads = 0;
  }
  load() { this.loads += 1; }
  play() { this.played += 1; return Promise.resolve(); }
}

afterEach(() => vi.useRealTimers());

describe('loadVideo with an injected fake video element', () => {
  it('sets the clip to loop muted, and resolves and plays once it has data', async () => {
    const v = new FakeVideo();
    const p = loadVideo(v, '/demo.mp4');
    expect(v.src).toBe('/demo.mp4');
    expect(v.loop).toBe(true);
    expect(v.muted).toBe(true);
    expect(v.playsInline).toBe(true);
    v.dispatchEvent(new Event('loadeddata'));
    await expect(p).resolves.toBeUndefined();
    expect(v.played).toBe(1);
  });

  it('a clip that cannot load rejects with no-camera', async () => {
    const v = new FakeVideo();
    const p = loadVideo(v, '/missing.mp4');
    v.dispatchEvent(new Event('error'));
    await expect(p).rejects.toMatchObject({ code: 'no-camera' });
    await expect(p).rejects.toThrow(/missing\.mp4/);
  });

  it('a clip that never loads times out as no-camera', async () => {
    vi.useFakeTimers();
    const p = loadVideo(new FakeVideo(), '/slow.mp4', { timeoutMs: 5000 });
    const check = expect(p).rejects.toMatchObject({ code: 'no-camera' });
    vi.advanceTimersByTime(5001);
    await check;
  });

  it('no path rejects with no-camera', async () => {
    await expect(loadVideo(new FakeVideo(), '')).rejects.toMatchObject({ code: 'no-camera' });
  });
});

describe('engine with ?video=', () => {
  it('loads the clip into the stage video instead of opening the camera, unmirrored', async () => {
    const stage = document.createElement('div');
    const getUserMedia = vi.fn();
    const errors = [];
    const engine = createEngine({ stage, search: '?video=/missing.mp4', mediaDevices: { getUserMedia }, onError: (e) => errors.push(e) });
    const started = engine.start();
    const video = stage.querySelector('video');
    expect(video.getAttribute('src')).toBe('/missing.mp4');
    expect(video.loop).toBe(true);
    expect(stage.querySelector('.pc-stage__mirror')).toBeNull();
    video.dispatchEvent(new Event('error'));
    await started;
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(errors).toEqual([{ code: 'no-camera', message: expect.stringContaining('/missing.mp4') }]);
    engine.stop();
  });

  it('the live camera stays mirrored', async () => {
    const stage = document.createElement('div');
    const engine = createEngine({ stage, search: '', mediaDevices: { getUserMedia: () => Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' })) } });
    await engine.start();
    expect(stage.querySelector('.pc-stage__mirror')).not.toBeNull();
    engine.stop();
  });
});
