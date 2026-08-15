const {
  THEMES,
  pickFromChoices,
  loadSavedChoices,
  saveChoices,
  resetSavedChoices,
  validateChoiceTexts,
  validateCustomThemeSettings,
  buildCustomTheme,
  loadCustomThemeSettings,
  saveCustomThemeSettings,
  hasSavedCustomThemeSettings,
  normalizeFontMode,
  loadSavedFontMode,
  saveFontMode,
  formatBopomofoText,
  cancelTimers,
  getCenterTranslation,
  DRAW_TIMING
} = globalThis.DrawEngine;
const { createSoundController } = globalThis.SoundEngine;

const stage = document.querySelector("#draw-stage");
const drawButton = document.querySelector("#draw-button");
const drawAgain = document.querySelector("#draw-again");
const resultLabel = document.querySelector("#result-label");
const resultText = document.querySelector("#result-text");
const resultBopomofo = document.querySelector("#result-bopomofo");
const resultMessage = document.querySelector("#result-message");
const hint = document.querySelector("#hint");
const showList = document.querySelector("#show-list");
const panel = document.querySelector("#choice-panel");
const list = document.querySelector("#choice-list");
const fortuneStick = document.querySelector("#fortune-stick");
const pageTitle = document.querySelector("#page-title");
const eyebrow = document.querySelector("#eyebrow");
const choiceHeading = document.querySelector("#choice-heading");
const themeButtons = Array.from(document.querySelectorAll("[data-theme]"));
const fontModeToggle = document.querySelector("#font-mode-toggle");
const editItems = document.querySelector("#edit-items");
const editorPanel = document.querySelector("#editor-panel");
const editorTitle = document.querySelector("#editor-title");
const editorRows = document.querySelector("#editor-rows");
const editorMessage = document.querySelector("#editor-message");
const itemCount = document.querySelector("#item-count");
const addChoice = document.querySelector("#add-choice");
const saveChoiceButton = document.querySelector("#save-choices");
const cancelEdit = document.querySelector("#cancel-edit");
const restoreDefaults = document.querySelector("#restore-defaults");
const editTheme = document.querySelector("#edit-theme");
const customThemePanel = document.querySelector("#custom-theme-panel");
const customThemeMessage = document.querySelector("#custom-theme-message");
const customThemeName = document.querySelector("#custom-theme-name");
const customThemeEyebrow = document.querySelector("#custom-theme-eyebrow");
const customThemeHint = document.querySelector("#custom-theme-hint");
const customResultLine1 = document.querySelector("#custom-result-line-1");
const customResultLine2 = document.querySelector("#custom-result-line-2");
const saveCustomThemeButton = document.querySelector("#save-custom-theme");
const cancelCustomThemeButton = document.querySelector("#cancel-custom-theme");
const soundController = createSoundController({
  shake: document.querySelector("#shake-sound"),
  stick: document.querySelector("#stick-sound"),
  paper: document.querySelector("#paper-sound")
}, window);
soundController.prepare();

let activeThemeId = "boredom";
let activeChoices = loadSavedChoices(window.localStorage, activeThemeId);
let activeCustomSettings = loadCustomThemeSettings(window.localStorage);
let activeFontMode = loadSavedFontMode(window.localStorage);
let editorSnapshot = [];
let customThemeSnapshot = null;
const drawTimers = [];

function currentTheme() {
  return activeThemeId === "custom" ? buildCustomTheme(activeCustomSettings) : THEMES[activeThemeId];
}

function renderFontMode(mode) {
  const normalizedMode = normalizeFontMode(mode);
  activeFontMode = normalizedMode;
  document.documentElement.dataset.fontMode = normalizedMode;
  fontModeToggle.textContent = normalizedMode === "bopomofo" ? "注音" : "無注音";
  fontModeToggle.setAttribute("aria-pressed", String(normalizedMode === "bopomofo"));
  fontModeToggle.setAttribute(
    "aria-label",
    normalizedMode === "bopomofo" ? "目前有注音，切換成無注音" : "目前無注音，切換成有注音"
  );
}

function renderChoiceList() {
  list.replaceChildren();
  activeChoices.forEach((choiceText) => {
    const item = document.createElement("li");
    item.textContent = formatBopomofoText(choiceText);
    list.append(item);
  });
  choiceHeading.textContent = `籤筒裡的 ${activeChoices.length} 個項目`;
}

function renderResultMessage(theme) {
  const lines = theme.resultMessage.map((line) => {
    const span = document.createElement("span");
    span.textContent = line;
    return span;
  });
  resultMessage.replaceChildren(...lines);
}

function renderThemeContent() {
  const theme = currentTheme();
  pageTitle.textContent = theme.title;
  eyebrow.textContent = theme.eyebrow;
  hint.textContent = theme.hint;
  renderResultMessage(theme);
  document.title = `${theme.title}｜歐的樂星球`;
}

function resetDrawState() {
  stage.classList.remove("is-shaking", "is-revealing", "is-unfolding", "has-result");
  resultLabel.setAttribute("aria-hidden", "true");
  drawAgain.hidden = true;
  hint.classList.remove("is-result-hidden");
  hint.setAttribute("aria-hidden", "false");
}

function cancelDrawTimers() {
  cancelTimers(drawTimers, window.clearTimeout);
  soundController.stop();
  drawButton.disabled = false;
}

function scheduleDrawStep(callback, delay) {
  drawTimers.push(window.setTimeout(callback, delay));
}

function readEditorValues() {
  return Array.from(editorRows.querySelectorAll("input"), (input) => input.value);
}

function updateEditorCount() {
  const count = editorRows.children.length;
  itemCount.textContent = `${count}／20`;
  addChoice.disabled = count >= 20;
}

function showEditorMessage(message, isSuccess = false) {
  editorMessage.textContent = message;
  editorMessage.classList.toggle("is-success", isSuccess);
}

function renderEditorRows(values) {
  editorRows.replaceChildren();
  values.forEach((value, index) => {
    const row = document.createElement("div");
    row.className = "editor-row";

    const number = document.createElement("span");
    number.className = "editor-number";
    number.textContent = `${index + 1}.`;

    const input = document.createElement("input");
    input.className = "editor-input";
    input.type = "text";
    input.value = value;
    input.maxLength = 40;
    input.setAttribute("aria-label", `第 ${index + 1} 個項目`);

    const remove = document.createElement("button");
    remove.className = "delete-choice";
    remove.type = "button";
    remove.textContent = "刪除";
    remove.setAttribute("aria-label", `刪除第 ${index + 1} 個項目`);
    remove.addEventListener("click", () => {
      if (editorRows.children.length <= 2) {
        showEditorMessage("每個主題至少需要 2 個項目。");
        return;
      }
      row.remove();
      renderEditorRows(readEditorValues());
      showEditorMessage("");
    });

    row.append(number, input, remove);
    editorRows.append(row);
  });
  updateEditorCount();
}

function editorIsDirty() {
  return !editorPanel.hidden && JSON.stringify(readEditorValues()) !== JSON.stringify(editorSnapshot);
}

function closeEditor() {
  editorPanel.hidden = true;
  editItems.setAttribute("aria-expanded", "false");
  editItems.textContent = "編輯項目";
  showEditorMessage("");
}

function openEditor() {
  editorSnapshot = activeChoices.slice();
  editorTitle.textContent = `編輯${currentTheme().title.replace(/抽籤筒$/u, "")}項目`;
  renderEditorRows(editorSnapshot);
  panel.hidden = true;
  showList.setAttribute("aria-expanded", "false");
  showList.textContent = "看看項目";
  editorPanel.hidden = false;
  editItems.setAttribute("aria-expanded", "true");
  editItems.textContent = "收起編輯";
  showEditorMessage("");
}

function readCustomThemeValues() {
  return {
    name: customThemeName.value,
    eyebrow: customThemeEyebrow.value,
    hint: customThemeHint.value,
    resultLine1: customResultLine1.value,
    resultLine2: customResultLine2.value
  };
}

function fillCustomThemeValues(values) {
  customThemeName.value = values.name;
  customThemeEyebrow.value = values.eyebrow;
  customThemeHint.value = values.hint;
  customResultLine1.value = values.resultLine1;
  customResultLine2.value = values.resultLine2;
}

function showCustomThemeMessage(message, isSuccess = false) {
  customThemeMessage.textContent = message;
  customThemeMessage.classList.toggle("is-success", isSuccess);
}

function customThemeIsDirty() {
  return !customThemePanel.hidden
    && JSON.stringify(readCustomThemeValues()) !== JSON.stringify(customThemeSnapshot);
}

function closeCustomThemeEditor() {
  customThemePanel.hidden = true;
  editTheme.setAttribute("aria-expanded", "false");
  editTheme.textContent = "設定主題";
  showCustomThemeMessage("");
}

function openCustomThemeEditor() {
  customThemeSnapshot = { ...activeCustomSettings };
  fillCustomThemeValues(customThemeSnapshot);
  closeEditor();
  panel.hidden = true;
  showList.setAttribute("aria-expanded", "false");
  showList.textContent = "看看項目";
  customThemePanel.hidden = false;
  editTheme.setAttribute("aria-expanded", "true");
  editTheme.textContent = "收起設定";
  showCustomThemeMessage("");
}

function canLeaveEditor() {
  return (!editorIsDirty() && !customThemeIsDirty())
    || window.confirm("尚未儲存的修改會消失，要繼續嗎？");
}

function saveCustomThemeEditor() {
  const result = validateCustomThemeSettings(readCustomThemeValues());
  if (!result.ok) {
    showCustomThemeMessage(result.message);
    return;
  }

  try {
    activeCustomSettings = saveCustomThemeSettings(window.localStorage, result.value);
  } catch {
    showCustomThemeMessage("這台裝置暫時無法保存，請稍後再試。");
    return;
  }

  customThemeSnapshot = { ...activeCustomSettings };
  cancelDrawTimers();
  resetDrawState();
  renderThemeContent();
  closeCustomThemeEditor();
}

function saveEditor() {
  const result = validateChoiceTexts(readEditorValues());
  if (!result.ok) {
    showEditorMessage(result.message);
    return;
  }

  try {
    saveChoices(window.localStorage, activeThemeId, result.values);
  } catch {
    showEditorMessage("這台裝置暫時無法保存，請稍後再試。");
    return;
  }

  activeChoices = result.values;
  editorSnapshot = result.values.slice();
  renderChoiceList();
  closeEditor();
  panel.hidden = false;
  showList.setAttribute("aria-expanded", "true");
  showList.textContent = "收起項目";
}

function restoreDefaultChoices() {
  if (!window.confirm("要恢復這個主題的預設項目嗎？")) return;

  try {
    resetSavedChoices(window.localStorage, activeThemeId);
  } catch {
    showEditorMessage("這台裝置暫時無法恢復預設，請稍後再試。");
    return;
  }

  activeChoices = loadSavedChoices(window.localStorage, activeThemeId);
  editorSnapshot = activeChoices.slice();
  renderChoiceList();
  renderEditorRows(activeChoices);
  showEditorMessage("已恢復這個主題的預設項目。", true);
}

function positionStickAnimation() {
  const translation = getCenterTranslation(
    fortuneStick.getBoundingClientRect(),
    resultLabel.getBoundingClientRect()
  );
  const stageHeight = stage.getBoundingClientRect().height;

  stage.style.setProperty("--stick-center-x", `${translation.x}px`);
  stage.style.setProperty("--stick-center-y", `${translation.y}px`);
  stage.style.setProperty("--stick-rise-x", `${Math.min(58, stageHeight * 0.1)}px`);
  stage.style.setProperty("--stick-rise-y", `${-Math.min(190, stageHeight * 0.32)}px`);
}

function setActiveTheme(themeId) {
  if (!THEMES[themeId] || themeId === activeThemeId) return;
  if (!canLeaveEditor()) return;

  closeEditor();
  closeCustomThemeEditor();
  cancelDrawTimers();

  const shouldOpenCustomSettings = themeId === "custom"
    && !hasSavedCustomThemeSettings(window.localStorage);
  activeThemeId = themeId;
  activeChoices = loadSavedChoices(window.localStorage, themeId);
  if (themeId === "custom") activeCustomSettings = loadCustomThemeSettings(window.localStorage);
  editTheme.hidden = themeId !== "custom";
  renderThemeContent();

  themeButtons.forEach((button) => {
    const isActive = button.dataset.theme === themeId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  renderChoiceList();
  resetDrawState();
  if (shouldOpenCustomSettings) openCustomThemeEditor();
}

function draw() {
  if (drawButton.disabled) return;
  if (!canLeaveEditor()) return;

  closeEditor();
  closeCustomThemeEditor();

  drawButton.disabled = true;
  cancelTimers(drawTimers, window.clearTimeout);
  soundController.start(DRAW_TIMING);
  resetDrawState();
  positionStickAnimation();
  const choice = pickFromChoices(activeChoices);
  resultText.textContent = formatBopomofoText(choice.text);
  resultBopomofo.textContent = choice.bopomofo;
  resultBopomofo.setAttribute("aria-label", `注音：${choice.bopomofo}`);
  stage.classList.add("is-shaking");

  scheduleDrawStep(() => {
    stage.classList.remove("is-shaking");
    stage.classList.add("is-revealing");
  }, DRAW_TIMING.shake);

  scheduleDrawStep(() => {
    stage.classList.remove("is-revealing");
    stage.classList.add("is-unfolding");
    resultLabel.setAttribute("aria-hidden", "false");
  }, DRAW_TIMING.shake + DRAW_TIMING.reveal);

  scheduleDrawStep(() => {
    stage.classList.add("has-result");
    hint.classList.add("is-result-hidden");
    hint.setAttribute("aria-hidden", "true");
  }, DRAW_TIMING.shake + DRAW_TIMING.reveal + DRAW_TIMING.unfold);

  scheduleDrawStep(() => {
    drawButton.disabled = false;
    drawAgain.hidden = false;
  }, DRAW_TIMING.complete);
}

drawButton.addEventListener("click", draw);
drawAgain.addEventListener("click", draw);

showList.addEventListener("click", () => {
  if (!canLeaveEditor()) return;
  closeEditor();
  closeCustomThemeEditor();
  const isOpening = panel.hidden;
  panel.hidden = !isOpening;
  showList.setAttribute("aria-expanded", String(isOpening));
  showList.textContent = isOpening ? "收起項目" : "看看項目";
});

themeButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTheme(button.dataset.theme));
});

fontModeToggle.addEventListener("click", () => {
  const nextFontMode = activeFontMode === "bopomofo" ? "plain" : "bopomofo";
  try {
    activeFontMode = saveFontMode(window.localStorage, nextFontMode);
  } catch {
    activeFontMode = normalizeFontMode(nextFontMode);
  }
  renderFontMode(activeFontMode);
});

editItems.addEventListener("click", () => {
  if (editorPanel.hidden) {
    if (canLeaveEditor()) {
      closeCustomThemeEditor();
      openEditor();
    }
  } else if (canLeaveEditor()) {
    closeEditor();
  }
});

editTheme.addEventListener("click", () => {
  if (customThemePanel.hidden) {
    if (canLeaveEditor()) openCustomThemeEditor();
  } else if (canLeaveEditor()) {
    closeCustomThemeEditor();
  }
});

addChoice.addEventListener("click", () => {
  const values = readEditorValues();
  if (values.length >= 20) {
    showEditorMessage("每個主題最多只能有 20 個項目。");
    return;
  }
  renderEditorRows(values.concat(""));
  editorRows.querySelector(".editor-row:last-child input").focus();
  showEditorMessage("");
});

saveChoiceButton.addEventListener("click", saveEditor);
cancelEdit.addEventListener("click", closeEditor);
restoreDefaults.addEventListener("click", restoreDefaultChoices);
saveCustomThemeButton.addEventListener("click", saveCustomThemeEditor);
cancelCustomThemeButton.addEventListener("click", closeCustomThemeEditor);

window.addEventListener("beforeunload", (event) => {
  if (!editorIsDirty() && !customThemeIsDirty()) return;
  event.preventDefault();
  event.returnValue = "";
});

function reportEmbedHeight() {
  if (window.parent === window) return;

  window.parent.postMessage({
    type: "ofp-fortune-resize",
    height: Math.ceil(document.documentElement.scrollHeight)
  }, "*");
}

if ("ResizeObserver" in window) {
  new ResizeObserver(reportEmbedHeight).observe(document.body);
}

window.addEventListener("load", reportEmbedHeight);

renderChoiceList();
renderThemeContent();
renderFontMode(activeFontMode);
