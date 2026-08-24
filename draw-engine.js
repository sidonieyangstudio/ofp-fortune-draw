(function createDrawEngine(globalScope) {
  const choices = [
    { text: "拼拼圖五分鐘", bopomofo: "ㄆㄧㄣ ㄆㄧㄣ ㄊㄨˊ ㄨˇ ㄈㄣ ㄓㄨㄥ" },
    { text: "泡澡放鬆", bopomofo: "ㄆㄠˋ ㄗㄠˇ ㄈㄤˋ ㄙㄨㄥ" },
    { text: "畫喜歡的動物", bopomofo: "ㄏㄨㄚˋ ㄒㄧˇ ㄏㄨㄢ ㄉㄜ˙ ㄉㄨㄥˋ ㄨˋ" },
    { text: "看一本書", bopomofo: "ㄎㄢˋ ㄧˋ ㄅㄣˇ ㄕㄨ" },
    { text: "聽喜歡的音樂", bopomofo: "ㄊㄧㄥ ㄒㄧˇ ㄏㄨㄢ ㄉㄜ˙ ㄧㄣ ㄩㄝˋ" },
    { text: "玩最愛的玩具", bopomofo: "ㄨㄢˊ ㄗㄨㄟˋ ㄞˋ ㄉㄜ˙ ㄨㄢˊ ㄐㄩˋ" },
    { text: "唱一首喜歡的歌", bopomofo: "ㄔㄤˋ ㄧˋ ㄕㄡˇ ㄒㄧˇ ㄏㄨㄢ ㄉㄜ˙ ㄍㄜ" },
    { text: "蓋一座積木城堡", bopomofo: "ㄍㄞˋ ㄧˊ ㄗㄨㄛˋ ㄐㄧ ㄇㄨˋ ㄔㄥˊ ㄅㄠˇ" },
    { text: "幫玩具找一個家", bopomofo: "ㄅㄤ ㄨㄢˊ ㄐㄩˋ ㄓㄠˇ ㄧˊ ㄍㄜ˙ ㄐㄧㄚ" },
    { text: "畫三個喜歡的顏色", bopomofo: "ㄏㄨㄚˋ ㄙㄢ ㄍㄜ˙ ㄒㄧˇ ㄏㄨㄢ ㄉㄜ˙ ㄧㄢˊ ㄙㄜˋ" }
  ];
  const RESULT_LINE_LENGTH = 8;
  const MAX_CHOICE_LENGTH = RESULT_LINE_LENGTH * 2;

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

  const SECOND_READING_VARIATION_SELECTOR = "\u{E01E1}";
  const JIAO4_PHRASES = Object.freeze([
    "來睡覺去",
    "去睡覺",
    "舒服的睡一覺",
    "睡個午覺",
    "睡午覺"
  ]);

  function formatBopomofoText(text) {
    const withJiao4 = JIAO4_PHRASES.includes(text)
      ? text.replaceAll("覺", `覺${SECOND_READING_VARIATION_SELECTOR}`)
      : text;
    return text === "睡個午覺"
      ? withJiao4.replace("個", `個${SECOND_READING_VARIATION_SELECTOR}`)
      : withJiao4;
  }

  function splitResultText(text) {
    if (typeof text !== "string" || text.length > MAX_CHOICE_LENGTH) return null;
    const lines = [];
    for (let index = 0; index < text.length; index += RESULT_LINE_LENGTH) {
      lines.push(text.slice(index, index + RESULT_LINE_LENGTH));
    }
    return lines;
  }

  const CUSTOM_THEME_STORAGE_KEY = "ofp-draw-theme-custom";
  const FONT_MODE_STORAGE_KEY = "ofp-draw-font-mode";
  const FONT_MODE_DEFAULT = "bopomofo";
  const CUSTOM_THEME_DEFAULTS = Object.freeze({
    name: "自選",
    eyebrow: "不知道怎麼選的時候",
    hint: "點一下籤筒，看看會抽到什麼！",
    resultLine1: "今天就選",
    resultLine2: "這一個吧！"
  });
  const customChoices = Object.freeze(
    ["1號籤", "2號籤", "3號籤", "4號籤", "5號籤"].map((text) => Object.freeze({ text, bopomofo: "" }))
  );

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
    }),
    custom: Object.freeze({
      id: "custom",
      title: "自選抽籤筒",
      eyebrow: CUSTOM_THEME_DEFAULTS.eyebrow,
      hint: CUSTOM_THEME_DEFAULTS.hint,
      resultMessage: Object.freeze([CUSTOM_THEME_DEFAULTS.resultLine1, CUSTOM_THEME_DEFAULTS.resultLine2]),
      choices: customChoices
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
    if (cleaned.some((value) => value.length > MAX_CHOICE_LENGTH)) {
      return { ok: false, values: cleaned, message: `每個項目最多只能有 ${MAX_CHOICE_LENGTH} 個字。` };
    }
    if (new Set(cleaned).size !== cleaned.length) {
      return { ok: false, values: cleaned, message: "項目不能重複。" };
    }

    return { ok: true, values: cleaned, message: "" };
  }

  function normalizeFontMode(value) {
    return value === "plain" ? "plain" : FONT_MODE_DEFAULT;
  }

  function loadSavedFontMode(storage) {
    try {
      return normalizeFontMode(storage.getItem(FONT_MODE_STORAGE_KEY));
    } catch {
      return FONT_MODE_DEFAULT;
    }
  }

  function saveFontMode(storage, value) {
    const mode = normalizeFontMode(value);
    storage.setItem(FONT_MODE_STORAGE_KEY, mode);
    return mode;
  }

  function validateCustomThemeSettings(values) {
    if (!values || typeof values !== "object") {
      return { ok: false, value: null, message: "保存的主題格式不正確。" };
    }

    const fields = ["name", "eyebrow", "hint", "resultLine1", "resultLine2"];
    if (fields.some((field) => typeof values[field] !== "string")) {
      return { ok: false, value: null, message: "保存的主題格式不正確。" };
    }

    const cleaned = {
      name: values.name.trim().replace(/抽籤筒$/u, "").trim(),
      eyebrow: values.eyebrow.trim(),
      hint: values.hint.trim(),
      resultLine1: values.resultLine1.trim(),
      resultLine2: values.resultLine2.trim()
    };

    const limits = [
      ["name", 20, "主題名稱"],
      ["eyebrow", 40, "副標"],
      ["hint", 40, "提示文字"],
      ["resultLine1", 20, "籤紙第一行"],
      ["resultLine2", 20, "籤紙第二行"]
    ];
    for (const [field, maxLength, label] of limits) {
      if (!cleaned[field]) return { ok: false, value: null, message: `${label}不能留白。` };
      if (cleaned[field].length > maxLength) {
        return { ok: false, value: null, message: `${label}最多 ${maxLength} 個字。` };
      }
    }

    return { ok: true, value: cleaned, message: "" };
  }

  function buildCustomTheme(settings) {
    const result = validateCustomThemeSettings(settings);
    const value = result.ok ? result.value : CUSTOM_THEME_DEFAULTS;
    return Object.freeze({
      id: "custom",
      title: `${value.name}抽籤筒`,
      eyebrow: value.eyebrow,
      hint: value.hint,
      resultMessage: Object.freeze([value.resultLine1, value.resultLine2]),
      choices: THEMES.custom.choices
    });
  }

  function loadCustomThemeSettings(storage) {
    try {
      const result = validateCustomThemeSettings(JSON.parse(storage.getItem(CUSTOM_THEME_STORAGE_KEY)));
      return result.ok ? result.value : CUSTOM_THEME_DEFAULTS;
    } catch {
      return CUSTOM_THEME_DEFAULTS;
    }
  }

  function saveCustomThemeSettings(storage, settings) {
    const result = validateCustomThemeSettings(settings);
    if (!result.ok) throw new TypeError(result.message);
    storage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(result.value));
    return result.value;
  }

  function hasSavedCustomThemeSettings(storage) {
    try {
      return validateCustomThemeSettings(JSON.parse(storage.getItem(CUSTOM_THEME_STORAGE_KEY))).ok;
    } catch {
      return false;
    }
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
    MAX_CHOICE_LENGTH,
    RESULT_LINE_LENGTH,
    splitResultText,
    validateChoiceTexts,
    CUSTOM_THEME_DEFAULTS,
    FONT_MODE_DEFAULT,
    normalizeFontMode,
    loadSavedFontMode,
    saveFontMode,
    formatBopomofoText,
    validateCustomThemeSettings,
    buildCustomTheme,
    loadCustomThemeSettings,
    saveCustomThemeSettings,
    hasSavedCustomThemeSettings,
    loadSavedChoices,
    saveChoices,
    resetSavedChoices,
    pickFromChoices,
    cancelTimers
  });
})(globalThis);
