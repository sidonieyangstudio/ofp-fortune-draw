(function createSoundEngine(globalScope) {
  const SOUND_LEVELS = Object.freeze({
    shake: 1,
    stick: 0.28,
    paper: 0.5
  });
  const SOUND_NAMES = Object.freeze(["shake", "stick", "paper"]);

  function createSoundController(audio, runtime = globalScope) {
    const timerIds = [];
    const activeSources = new Set();
    const AudioContextClass = runtime.AudioContext || runtime.webkitAudioContext;
    let audioContext = null;
    let buffers = null;
    let preparePromise = null;

    Object.entries(SOUND_LEVELS).forEach(([name, volume]) => {
      if (audio[name]) audio[name].volume = volume;
    });

    function safePlay(sound) {
      if (!sound) return;
      try {
        sound.currentTime = 0;
        const result = sound.play();
        if (result && typeof result.catch === "function") result.catch(() => {});
      } catch {}
    }

    function schedule(callback, delay) {
      timerIds.push(runtime.setTimeout(callback, delay));
    }

    function startFallback(timing) {
      safePlay(audio.shake);
      schedule(() => safePlay(audio.shake), 260);
      schedule(() => safePlay(audio.shake), 520);
      schedule(() => safePlay(audio.stick), timing.shake);
      schedule(() => safePlay(audio.paper), timing.shake + timing.reveal);
    }

    function decodeAudioData(data) {
      return new Promise((resolve, reject) => {
        try {
          const result = audioContext.decodeAudioData(data, resolve, reject);
          if (result && typeof result.then === "function") result.then(resolve, reject);
        } catch (error) {
          reject(error);
        }
      });
    }

    function prepare() {
      if (!AudioContextClass || typeof runtime.fetch !== "function") {
        return Promise.resolve(false);
      }
      if (buffers) return Promise.resolve(true);

      try {
        if (!audioContext) audioContext = new AudioContextClass();
      } catch {
        return Promise.resolve(false);
      }

      if (!preparePromise) {
        preparePromise = Promise.all(SOUND_NAMES.map(async (name) => {
          const element = audio[name];
          const url = element && (element.currentSrc || element.src);
          if (!url) throw new Error(`缺少 ${name} 音效`);
          const response = await runtime.fetch(url);
          if (!response.ok) throw new Error(`${name} 音效載入失敗`);
          return [name, await decodeAudioData(await response.arrayBuffer())];
        })).then((entries) => {
          buffers = Object.fromEntries(entries);
          return true;
        }).catch(() => false);
      }

      return preparePromise;
    }

    function playBuffer(name, time, stopTime) {
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffers[name];
      gain.gain.value = SOUND_LEVELS[name];
      source.connect(gain);
      gain.connect(audioContext.destination);
      source.onended = () => activeSources.delete(source);
      activeSources.add(source);
      source.start(time);
      if (typeof stopTime === "number") source.stop(stopTime);
    }

    function stop() {
      while (timerIds.length) runtime.clearTimeout(timerIds.pop());
      activeSources.forEach((source) => {
        try { source.stop(); } catch {}
      });
      activeSources.clear();
      Object.values(audio).forEach((sound) => {
        if (!sound) return;
        try {
          sound.pause();
          sound.currentTime = 0;
        } catch {}
      });
    }

    async function start(timing) {
      stop();
      const readyPromise = prepare();

      if (!audioContext) {
        startFallback(timing);
        return false;
      }

      let resumePromise = Promise.resolve();
      try {
        if (audioContext.state === "suspended") resumePromise = audioContext.resume();
      } catch {
        startFallback(timing);
        return false;
      }

      try {
        const [isReady] = await Promise.all([readyPromise, resumePromise]);
        if (!isReady) {
          startFallback(timing);
          return false;
        }

        const baseTime = audioContext.currentTime;
        const shakeEnd = baseTime + timing.shake / 1000;
        playBuffer("shake", baseTime, baseTime + 0.26);
        playBuffer("shake", baseTime + 0.26, baseTime + 0.52);
        playBuffer("shake", baseTime + 0.52, shakeEnd);
        playBuffer("stick", shakeEnd);
        playBuffer("paper", baseTime + (timing.shake + timing.reveal) / 1000);
        return true;
      } catch {
        startFallback(timing);
        return false;
      }
    }

    return Object.freeze({ prepare, start, stop });
  }

  globalScope.SoundEngine = Object.freeze({ createSoundController, SOUND_LEVELS });
})(globalThis);
