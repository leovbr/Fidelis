/* =========================================================
   FIDELIS — APP CONTROLLER
   Debug Build
   ========================================================= */

(() => {
  "use strict";

  const state = {
    mode: "photo",
    quality: "standard",
    file: null,
    result: null,
    busy: false
  };

  const $ = (id) => document.getElementById(id);

  function log(...args) {
    console.log("[FIDELIS]", ...args);
  }

  function getEl(...ids) {
    for (const id of ids) {
      const el = $(id);
      if (el) return el;
    }
    return null;
  }

  function setText(ids, text) {
    const el = getEl(...ids);
    if (el) el.textContent = text;
  }

  function show(el) {
    if (el) el.classList.remove("hidden");
  }

  function hide(el) {
    if (el) el.classList.add("hidden");
  }

  function setStatus(message, type = "info") {
    let box = $("processingStatus");

    if (!box) {
      box = document.createElement("div");
      box.id = "processingStatus";
      box.style.cssText = `
        margin-top:16px;
        padding:14px;
        border-radius:12px;
        font-size:14px;
        line-height:1.5;
        white-space:pre-wrap;
        background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.12);
      `;

      const target =
        $("processingCard") ||
        $("uploadSection") ||
        $("mediaPreview")?.parentElement;

      if (target) target.appendChild(box);
    }

    box.textContent = message;

    if (type === "error") {
      box.style.borderColor = "#ff4d4d";
    } else if (type === "success") {
      box.style.borderColor = "#4dff88";
    } else {
      box.style.borderColor = "rgba(255,255,255,.12)";
    }

    show(box);
  }

  function setProgress(percent, message) {
    const bar = getEl(
      "progressBar",
      "processingProgressBar",
      "progressFill"
    );

    if (bar) {
      bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    }

    const text = getEl(
      "progressText",
      "processingProgressText",
      "progressLabel"
    );

    if (text && message) {
      text.textContent = message;
    }
  }

  function setBusy(value) {
    state.busy = value;

    const buttons = document.querySelectorAll(
      "button, input[type='button'], input[type='submit']"
    );

    buttons.forEach((button) => {
      if (
        button.id === "newFileBtn" ||
        button.id === "vipBtn" ||
        button.id === "closeVipBtn"
      ) {
        return;
      }

      button.disabled = value;
    });

    const enhanceBtn = getEl(
      "enhanceBtn",
      "enhanceAI",
      "enhanceButton"
    );

    if (enhanceBtn) {
      enhanceBtn.disabled = value;
      enhanceBtn.textContent = value
        ? "⏳ Processing..."
        : "✨ Enhance with AI";
    }
  }

  function clearPreview() {
    const preview = $("mediaPreview");

    if (!preview) return;

    preview.innerHTML = "";
  }

  function renderPreview(file) {
    const preview = $("mediaPreview");

    if (!preview) {
      setStatus(
        "❌ Preview container (#mediaPreview) tidak ditemukan.",
        "error"
      );
      return;
    }

    clearPreview();

    const url = URL.createObjectURL(file);

    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");

      img.src = url;
      img.alt = "FIDELIS Preview";
      img.className = "preview-image";

      img.onload = () => {
        log("Image preview loaded:", img.naturalWidth, "x", img.naturalHeight);
      };

      img.onerror = () => {
        setStatus("❌ Gagal menampilkan preview gambar.", "error");
      };

      preview.appendChild(img);

    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video");

      video.src = url;
      video.controls = true;
      video.playsInline = true;
      video.className = "preview-video";

      preview.appendChild(video);
    }
  }

  function validateFile(file) {
    if (!file) {
      throw new Error("Tidak ada file yang dipilih.");
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error("Ukuran file maksimal 20 MB.");
    }

    if (state.mode === "photo" && !file.type.startsWith("image/")) {
      throw new Error("Mode Photo hanya menerima file gambar.");
    }

    if (state.mode === "video" && !file.type.startsWith("video/")) {
      throw new Error("Mode Video hanya menerima file video.");
    }
  }

  function handleFile(file) {
    try {
      validateFile(file);

      state.file = file;
      state.result = null;

      log("File selected:", {
        name: file.name,
        type: file.type,
        size: file.size
      });

      setText(
        ["fileName", "selectedFileName"],
        file.name
      );

      renderPreview(file);

      const previewSection = getEl(
        "previewSection",
        "mediaSection"
      );

      if (previewSection) show(previewSection);

      setStatus(
        `✅ File siap diproses.\n${file.name}`,
        "success"
      );

    } catch (error) {
      console.error("[FIDELIS] File error:", error);
      setStatus(`❌ ${error.message}`, "error");
    }
  }

  function setupUpload() {
    const input = getEl(
      "fileInput",
      "mediaInput",
      "uploadInput"
    );

    if (!input) {
      log("Upload input tidak ditemukan.");
      return;
    }

    input.addEventListener("change", (event) => {
      const file = event.target.files?.[0];

      if (file) {
        handleFile(file);
      }
    });

    log("Upload input ready.");
  }

  function setupModeButtons() {
    const photoBtn = getEl(
      "photoMode",
      "photoBtn",
      "modePhoto"
    );

    const videoBtn = getEl(
      "videoMode",
      "videoBtn",
      "modeVideo"
    );

    if (photoBtn) {
      photoBtn.addEventListener("click", () => {
        state.mode = "photo";
        log("Mode:", state.mode);
      });
    }

    if (videoBtn) {
      videoBtn.addEventListener("click", () => {
        state.mode = "video";
        log("Mode:", state.mode);
      });
    }
  }

  function setupQualityButtons() {
    const qualityButtons = document.querySelectorAll(
      "[data-quality]"
    );

    qualityButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.quality = button.dataset.quality || "standard";

        log("Quality:", state.quality);

        qualityButtons.forEach((item) => {
          item.classList.remove("active");
        });

        button.classList.add("active");
      });
    });
  }

  async function enhance() {
    if (state.busy) {
      log("Processing already running.");
      return;
    }

    if (!state.file) {
      setStatus(
        "⚠️ Pilih foto/video terlebih dahulu.",
        "error"
      );
      return;
    }

    setBusy(true);
    setProgress(5, "Preparing AI...");

    setStatus(
      "🤖 Memulai AI enhancement...\nMohon tunggu.",
      "info"
    );

    const startedAt = performance.now();

    try {
      log("================================");
      log("START AI PROCESSING");
      log("File:", state.file.name);
      log("Mode:", state.mode);
      log("Quality:", state.quality);
      log("================================");

      if (
        !window.FidelisProcessing ||
        typeof window.FidelisProcessing.process !== "function"
      ) {
        throw new Error(
          "FidelisProcessing.process tidak ditemukan. Pastikan processing-engine.js termuat."
        );
      }

      setProgress(10, "Loading AI engine...");

      const timeout = new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              "AI processing melebihi 120 detik. Kemungkinan model/runtime sedang macet."
            )
          );
        }, 120000);
      });

      const processing = window.FidelisProcessing.process(
        state.file,
        {
          mode: state.mode,
          quality: state.quality,

          onProgress: (progress, message) => {
            log("Progress:", progress, message);

            if (typeof progress === "number") {
              setProgress(progress, message);
            } else if (message) {
              setStatus(`🤖 ${message}`, "info");
            }
          }
        }
      );

      const result = await Promise.race([
        processing,
        timeout
      ]);

      log("AI RESULT:", result);

      if (!result) {
        throw new Error("AI mengembalikan hasil kosong.");
      }

      if (result.fallback === true) {
        throw new Error(
          "AI menggunakan fallback. FIDELIS menolak hasil fallback."
        );
      }

      if (state.mode === "photo" && result.aiProcessed !== true) {
        throw new Error(
          "Inference AI tidak terkonfirmasi (aiProcessed !== true)."
        );
      }

      state.result = result;

      const elapsed =
        ((performance.now() - startedAt) / 1000).toFixed(2);

      setProgress(100, "Enhancement complete!");

      setStatus(
        `✅ AI enhancement berhasil!\n` +
        `⏱️ ${elapsed} detik\n` +
        `🤖 Model: ${result.model || "Real-ESRGAN"}\n` +
        `⚡ Backend: ${result.backend || result.engine || "auto"}\n` +
        `📐 ${result.width || "?"} × ${result.height || "?"}`,
        "success"
      );

      showResult(result);

    } catch (error) {
      console.error("[FIDELIS] AI PROCESSING ERROR:", error);

      setProgress(0, "Processing failed.");

      setStatus(
        `❌ AI PROCESSING ERROR\n\n${error.message || error}\n\n` +
        `Mode: ${state.mode}\n` +
        `Quality: ${state.quality}\n` +
        `File: ${state.file?.name || "-"}`,
        "error"
      );

      state.result = null;

    } finally {
      setBusy(false);
    }
  }

  function showResult(result) {
    const container = getEl(
      "resultPreview",
      "aiResult",
      "resultContainer"
    );

    if (!container) {
      log("Result container tidak ditemukan.");
      return;
    }

    container.innerHTML = "";

    if (result.canvas) {
      result.canvas.classList.add("result-image");
      container.appendChild(result.canvas);

    } else if (result.blob) {
      const img = document.createElement("img");

      img.src = URL.createObjectURL(result.blob);
      img.alt = "FIDELIS AI Result";
      img.className = "result-image";

      container.appendChild(img);

    } else {
      log("Result tidak memiliki canvas/blob.");
      return;
    }

    show(container);

    const resultSection = getEl(
      "resultSection",
      "resultCard"
    );

    if (resultSection) show(resultSection);
  }

  function newFile() {
    state.file = null;
    state.result = null;

    clearPreview();

    const input = getEl(
      "fileInput",
      "mediaInput",
      "uploadInput"
    );

    if (input) input.value = "";

    hide($("resultPreview"));
    hide($("resultSection"));

    setStatus(
      "Pilih file baru untuk memulai.",
      "info"
    );

    setProgress(0, "");
  }

  function openVipModal() {
    const modal = getEl(
      "vipModal",
      "vvipModal"
    );

    if (modal) {
      show(modal);
    }
  }

  function closeVipModal() {
    const modal = getEl(
      "vipModal",
      "vvipModal"
    );

    if (modal) {
      hide(modal);
    }
  }

  function setupEnhanceButton() {
    const button = getEl(
      "enhanceBtn",
      "enhanceAI",
      "enhanceButton"
    );

    if (!button) {
      log("Enhance button tidak ditemukan.");
      return;
    }

    button.addEventListener("click", enhance);

    log("Enhance button ready.");
  }

  function setupNewFileButton() {
    const button = getEl(
      "newFileBtn",
      "newFile",
      "resetBtn"
    );

    if (button) {
      button.addEventListener("click", newFile);
    }
  }

  function setupVipButtons() {
    const open = getEl(
      "vipBtn",
      "vvipBtn",
      "openVip"
    );

    const close = getEl(
      "closeVipBtn",
      "closeVip",
      "vipClose"
    );

    if (open) {
      open.addEventListener("click", openVipModal);
    }

    if (close) {
      close.addEventListener("click", closeVipModal);
    }
  }

  function init() {
    log("FIDELIS APP INITIALIZING...");

    setupUpload();
    setupModeButtons();
    setupQualityButtons();
    setupEnhanceButton();
    setupNewFileButton();
    setupVipButtons();

    log("FIDELIS APP READY.");
  }

  window.FidelisApp = {
    enhance,
    newFile,
    openVipModal,
    closeVipModal,
    getState: () => ({ ...state }),
    handleFile
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
