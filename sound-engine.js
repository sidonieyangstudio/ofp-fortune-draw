(function createSoundEngine(globalScope) {
  const SOUND_LEVELS = Object.freeze({
    shake: 1,
    stick: 0.28,
    paper: 0.5
  });

  function createSoundController(audio, timerApi = globalScope) {
    const timerIds = [];

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
      timerIds.push(timerApi.setTimeout(callback, delay));
    }

    function stop() {
      while (timerIds.length) timerApi.clearTimeout(timerIds.pop());
      Object.values(audio).forEach((sound) => {
        if (!sound) return;
        try {
          sound.pause();
          sound.currentTime = 0;
        } catch {}
      });
    }

    function start(timing) {
      stop();
      safePlay(audio.shake);
      schedule(() => safePlay(audio.shake), 260);
      schedule(() => safePlay(audio.shake), 520);
      schedule(() => safePlay(audio.stick), timing.shake);
      schedule(() => safePlay(audio.paper), timing.shake + timing.reveal);
    }

    return Object.freeze({ start, stop });
  }

  globalScope.SoundEngine = Object.freeze({ createSoundController, SOUND_LEVELS });
})(globalThis);
