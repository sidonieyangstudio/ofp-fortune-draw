(function createDrawEngine(globalScope) {
  const choices = [
    { text: "看書", bopomofo: "ㄎㄢˋ ㄕㄨ" },
    { text: "畫畫", bopomofo: "ㄏㄨㄚˋ ㄏㄨㄚˋ" },
    { text: "到公園玩", bopomofo: "ㄉㄠˋ ㄍㄨㄥ ㄩㄢˊ ㄨㄢˊ" },
    { text: "玩桌遊", bopomofo: "ㄨㄢˊ ㄓㄨㄛ ㄧㄡˊ" },
    { text: "泡熱水澡", bopomofo: "ㄆㄠˋ ㄖㄜˋ ㄕㄨㄟˇ ㄗㄠˇ" },
    { text: "拼拼圖", bopomofo: "ㄆㄧㄣ ㄆㄧㄣ ㄊㄨˊ" },
    { text: "聽音樂", bopomofo: "ㄊㄧㄥ ㄧㄣ ㄩㄝˋ" },
    { text: "做點心", bopomofo: "ㄗㄨㄛˋ ㄉㄧㄢˇ ㄒㄧㄣ" },
    { text: "整理玩具", bopomofo: "ㄓㄥˇ ㄌㄧˇ ㄨㄢˊ ㄐㄩˋ" },
    { text: "散步找寶物", bopomofo: "ㄙㄢˋ ㄅㄨˋ ㄓㄠˇ ㄅㄠˇ ㄨˋ" }
  ];

  const drawingChoices = [
    { text: "杯子蛋糕", bopomofo: "ㄅㄟ ㄗ˙ ㄉㄢˋ ㄍㄠ" },
    { text: "咖喱", bopomofo: "ㄍㄚ ㄌㄧˇ" },
    { text: "彩虹", bopomofo: "ㄘㄞˇ ㄏㄨㄥˊ" },
    { text: "手錶", bopomofo: "ㄕㄡˇ ㄅㄧㄠˇ" },
    { text: "計算機", bopomofo: "ㄐㄧˋ ㄙㄨㄢˋ ㄐㄧ" },
    { text: "樹屋", bopomofo: "ㄕㄨˋ ㄨ" },
    { text: "巫婆", bopomofo: "ㄨ ㄆㄛˊ" },
    { text: "一疊書", bopomofo: "ㄧˋ ㄉㄧㄝˊ ㄕㄨ" },
    { text: "畫中畫", bopomofo: "ㄏㄨㄚˋ ㄓㄨㄥ ㄏㄨㄚˋ" },
    { text: "相機", bopomofo: "ㄒㄧㄤˋ ㄐㄧ" }
  ];

  const THEMES = Object.freeze({
    boredom: Object.freeze({
      id: "boredom",
      title: "無聊抽籤筒",
      eyebrow: "不知道要做什麼的時候",
      hint: "點一下籤筒，讓它幫你決定！",
      resultMessage: Object.freeze(["今天就做", "這件事吧！"]),
      choices: Object.freeze(choices)
    }),
    drawing: Object.freeze({
      id: "drawing",
      title: "畫畫抽籤筒",
      eyebrow: "不知道要畫什麼的時候",
      hint: "點一下籤筒，看看今天畫什麼！",
      resultMessage: Object.freeze(["今天就畫", "這個主題吧！"]),
      choices: Object.freeze(drawingChoices)
    })
  });

  const DRAW_TIMING = Object.freeze({
    shake: 900,
    reveal: 650,
    unfold: 500,
    complete: 2300
  });

  function pickChoice(random = Math.random) {
    return choices[Math.floor(random() * choices.length)];
  }

  function validateChoiceTexts(values) {
    if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
      return { ok: false, values: [], message: "保存的項目格式不正確。" };
    }

    const cleaned = values.map((value) => value.trim());

    if (cleaned.length < 2) {
      return { ok: false, values: cleaned, message: "每個主題至少需要 2 個項目。" };
    }
    if (cleaned.length > 20) {
      return { ok: false, values: cleaned, message: "每個主題最多只能有 20 個項目。" };
    }
    if (cleaned.some((value) => !value)) {
      return { ok: false, values: cleaned, message: "項目不能留白。" };
    }
    if (new Set(cleaned).size !== cleaned.length) {
      return { ok: false, values: cleaned, message: "項目不能重複。" };
    }

    return { ok: true, values: cleaned, message: "" };
  }

  function storageKey(themeId) {
    return `ofp-draw-choices-${themeId}`;
  }

  function defaultChoiceTexts(themeId) {
    const theme = THEMES[themeId] || THEMES.boredom;
    return theme.choices.map((item) => item.text);
  }

  function loadSavedChoices(storage, themeId) {
    const fallback = defaultChoiceTexts(themeId);

    try {
      const saved = JSON.parse(storage.getItem(storageKey(themeId)));
      const result = validateChoiceTexts(saved);
      return result.ok ? result.values : fallback;
    } catch {
      return fallback;
    }
  }

  function saveChoices(storage, themeId, values) {
    storage.setItem(storageKey(themeId), JSON.stringify(values));
  }

  function resetSavedChoices(storage, themeId) {
    storage.removeItem(storageKey(themeId));
  }

  function pickFromChoices(values, random = Math.random) {
    const available = validateChoiceTexts(values).ok ? values : defaultChoiceTexts("boredom");
    const text = available[Math.floor(random() * available.length)];
    const knownChoice = choices.concat(drawingChoices).find((item) => item.text === text);
    return knownChoice || { text, bopomofo: "" };
  }

  function cancelTimers(timerIds, cancelTimer) {
    while (timerIds.length) {
      cancelTimer(timerIds.pop());
    }
  }

  function getCenterTranslation(sourceRect, targetRect) {
    return {
      x: targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2),
      y: targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2)
    };
  }

  globalScope.DrawEngine = Object.freeze({
    choices,
    pickChoice,
    getCenterTranslation,
    DRAW_TIMING,
    THEMES,
    validateChoiceTexts,
    loadSavedChoices,
    saveChoices,
    resetSavedChoices,
    pickFromChoices,
    cancelTimers
  });
})(globalThis);
