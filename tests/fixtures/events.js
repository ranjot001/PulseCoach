// Synthetic compression events in the Contract 1 event shape.

// Spread `count` true values evenly across a run, so a rate of 0.8 marks exactly 80%.
function hit(i, rate) {
  return Math.floor((i + 1) * rate) > Math.floor(i * rate);
}

/**
 * @param {object} [opts]
 * @param {number} [opts.cpm=110]          starting rate, compressions per minute
 * @param {number} [opts.seconds=30]       session length
 * @param {number} [opts.lockedRate=1]     fraction 0..1 of events with elbowsLocked
 * @param {number} [opts.alignedRate=1]    fraction 0..1 of events with aligned
 * @param {number} [opts.recoilRate=1]     fraction 0..1 of events with fullRecoil
 * @param {number} [opts.slowDownBy=0]     cpm lost by the end of the session (negative speeds up)
 * @param {number|null} [opts.depthCm=null] depth for every event, or null
 */
export function makeEvents({
  cpm = 110,
  seconds = 30,
  lockedRate = 1,
  alignedRate = 1,
  recoilRate = 1,
  slowDownBy = 0,
  depthCm = null,
} = {}) {
  const events = [];
  const endMs = seconds * 1000;
  let t = 0;
  let index = 0;
  for (;;) {
    const rateNow = Math.max(1, cpm - slowDownBy * (t / endMs));
    const intervalMs = 60000 / rateNow;
    t += intervalMs;
    if (t > endMs) break;
    const elbowsLocked = hit(index, lockedRate);
    const aligned = hit(index, alignedRate);
    const fullRecoil = hit(index, recoilRate);
    events.push({
      index,
      tBottom: t - intervalMs / 2,
      tTop: t,
      travel: 0.1,
      intervalMs,
      elbowAngleDeg: elbowsLocked ? 172 : 140,
      armLeanDeg: aligned ? 4 : 25,
      recoilRatio: fullRecoil ? 0.95 : 0.6,
      elbowsLocked,
      aligned,
      fullRecoil,
      depthCm,
    });
    index += 1;
  }
  return events;
}
