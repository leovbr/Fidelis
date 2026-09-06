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

  function show(id) {
    const el = $(id);
    if (el) el.classList.remove("hidden");
  }

  function hide(id) {
    const el = $(id);
    if (el) el.classList.add("hidden");
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function status(message) {
    log(message);

    let box = $("debugStatus");

    if (!box) {
      box = document.createElement("div");
      box.id = "debugStatus";

      box.style.cssText = `
        margin-top:16px;
        padding:14px;
        border-radius:12px;
        background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.12);
        color:#fff;
        font-size:14px;
        line-height:1.5;
        white-space:pre-wrap;
      `;

      $("processingSection")?.appendChild(box);
    }

    box.textContent = message;
  }

  /* =========================
     FILE UPLOAD
     ========================= */

  function openFilePicker() {
    const input = $("fileInput");

    if (!input) {
      status("❌ fileInput tidak ditemukan.");
      return;
    }

    input.click();
  }

  function validateFile(file) {
    if (!file) {
      throw new Error("Tidak ada file yang dipilih.");
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error("Ukuran file maksimal 20 MB.");
    }

    if (state.mode === "photo") {
      if (!file.type.startsWith("image/")) {
        throw new Error("Mode PHOTO hanya menerima gambar.");
      }
    }

    if (state.mode === "video") {
      if (!file.type.startsWith("video/")) {
        throw new Error("Mode VIDEO hanya menerima video.");
      }
    }
  }

  function renderPreview(file) {
    const container = $("mediaPreview");

    if (!container) {
      status("❌ mediaPreview tidak ditemukan.");
      return;
    }

    container.innerHTML = "";

    const url = URL.createObjectURL(file);

    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");

      img.src = url;
      img.alt = "FIDELIS Preview";

      img.style.maxWidth = "100%";
      img.style.display = "block";
      img.style.margin = "0 auto";

      container.appendChild(img);

      img.onload = () => {
        log(
          "Preview loaded:",
          img.naturalWidth,
          "x",
          img.naturalHeight
        );
      };

    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video");

      video.src = url;
      video.controls = true;
      video.playsInline = true;

      video.style.width = "100%";

      container.appendChild(video);
    }
  }

  function handleFile(file) {
    try {
      validateFile(file);

      state.file = file;
      state.result = null;

      setText("fileName", file.name);

      renderPreview(file);

      show("previewSection");

      $("enhanceButton").disabled = false;

      status(`✅ File siap diproses:\n${file.name}`);

      log("File selected:", file);

    } catch (error) {
      status(`❌ ${error.message}`);
      console.error(error);
    }
  }

  /* =========================
     REMOVE FILE
     ========================= */

  function removeFile() {
    state.file = null;
    state.result = null;

    const input = $("fileInput");

    if (input) {
      input.value = "";
    }

    const preview = $("mediaPreview");

    if (preview) {
      preview.innerHTML = "";
    }

    hide("previewSection");

    $("enhanceButton").disabled = true;

    setText("fileName", "—");

    log("File removed.");
  }

  /* =========================
     MODE
     ========================= */

  function setMode(mode) {
    state.mode = mode;

    const photo = $("photoMode");
    const video = $("videoMode");

    photo?.classList.toggle("active", mode === "photo");
    video?.classList.toggle("active", mode === "video");

    const input = $("fileInput");

    if (input) {
      if (mode === "photo") {
        input.accept =
          "image/jpeg,image/png,image/webp";
      } else {
        input.accept =
          "video/mp4,video/webm,video/quicktime";
      }
    }

    setText(
      "uploadTitle",
      mode === "photo"
        ? "Upload your photo"
        : "Upload your video"
    );

    setText(
      "uploadDescription",
      mode === "photo"
        ? "JPG, JPEG, PNG or WEBP"
        : "MP4, WEBM or MOV"
    );

    removeFile();

    log("Mode:", mode);
  }

  /* =========================
     QUALITY
     ========================= */

  function setQuality(quality) {
    state.quality = quality;

    document
      .querySelectorAll(".quality-option")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.quality === quality
        );
      });

    log("Quality:", quality);
  }

  /* =========================
     PROGRESS
     ========================= */

  function updateProgress(percent, message) {
    const bar = $("progressBar");
    const text = $("progressText");
    const percentText = $("progressPercent");

    if (bar) {
      bar.style.width =
        `${Math.max(0, Math.min(100, percent))}%`;
    }

    if (text && message) {
      text.textContent = message;
    }

    if (percentText) {
      percentText.textContent =
        `${Math.round(percent)}%`;
    }
  }

  /* =========================
     AI ENHANCEMENT
     ========================= */

  async function enhance() {
    if (state.busy) return;

    if (!state.file) {
      alert("Pilih foto terlebih dahulu.");
      return;
    }

    state.busy = true;

    $("enhanceButton").disabled = true;

    show("processingSection");

    updateProgress(
      5,
      "Preparing AI engine..."
    );

    status(
      "🤖 FIDELIS AI sedang memproses..."
    );

    try {
      if (
        !window.FidelisProcessing ||
        typeof window.FidelisProcessing.process !==
          "function"
      ) {
        throw new Error(
          "FidelisProcessing tidak ditemukan."
        );
      }

      log("Starting AI processing...");

      const result =
        await window.FidelisProcessing.process(
          state.file,
          {
            mode: state.mode,
            quality: state.quality,

            onProgress: (
              progress,
              message
            ) => {
              log(
                "Progress:",
                progress,
                message
              );

              if (
                typeof progress ===
                "number"
              ) {
                updateProgress(
                  progress,
                  message ||
                    "Processing..."
                );
              }
            }
          }
        );

      log("AI result:", result);

      if (!result) {
        throw new Error(
          "AI tidak mengembalikan hasil."
        );
      }

      if (result.fallback === true) {
        throw new Error(
          "AI menggunakan fallback."
        );
      }

      if (
        state.mode === "photo" &&
        result.aiProcessed !== true
      ) {
        throw new Error(
          "AI inference tidak terkonfirmasi."
        );
      }

      state.result = result;

      updateProgress(
        100,
        "Enhancement complete!"
      );

      showResult(result);

      status(
        "✅ Enhancement berhasil!"
      );

    } catch (error) {
      console.error(
        "[FIDELIS] PROCESS ERROR:",
        error
      );

      updateProgress(
        0,
        "Processing failed."
      );

      status(
        `❌ AI ERROR\n\n${error.message}`
      );

      alert(
        "AI processing gagal:\n\n" +
        error.message
      );

    } finally {
      state.busy = false;

      $("enhanceButton").disabled =
        !state.file;
    }
  }

  /* =========================
     RESULT
     ========================= */

  function showResult(result) {
    const canvas =
      $("resultPreview");

    if (!canvas) {
      throw new Error(
        "resultPreview tidak ditemukan."
      );
    }

    if (result.canvas) {
      canvas.width =
        result.canvas.width;

      canvas.height =
        result.canvas.height;

      const ctx =
        canvas.getContext("2d");

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.drawImage(
        result.canvas,
        0,
        0
      );

    } else {
      throw new Error(
        "AI result tidak memiliki canvas."
      );
    }

    setText(
      "resultQuality",
      `AI Enhanced • ${
        result.scale
          ? result.scale + "×"
          : ""
      }`
    );

    show("resultSection");

    log("Result displayed.");
  }

  /* =========================
     DOWNLOAD
     ========================= */

  function downloadResult() {
    const canvas =
      $("resultPreview");

    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const url =
          URL.createObjectURL(blob);

        const a =
          document.createElement("a");

        a.href = url;
        a.download =
          "fidelis-enhanced.jpg";

        document.body.appendChild(a);

        a.click();

        a.remove();

        URL.revokeObjectURL(url);
      },
      "image/jpeg",
      0.95
    );
  }

  /* =========================
     NEW FILE
     ========================= */

  function newFile() {
    removeFile();

    hide("resultSection");
    hide("processingSection");

    updateProgress(
      0,
      "Preparing AI engine..."
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* =========================
     VVIP
     ========================= */

  function openVipModal() {
    show("vipModal");
  }

  function closeVipModal() {
    hide("vipModal");
  }

  /* =========================
     EVENTS
     ========================= */

  function init() {
    log(
      "================================"
    );

    log(
      "FIDELIS APP INITIALIZING..."
    );

    /* Upload button */
    $("uploadButton")
      ?.addEventListener(
        "click",
        openFilePicker
      );

    /* File input */
    $("fileInput")
      ?.addEventListener(
        "change",
        (event) => {
          const file =
            event.target.files?.[0];

          if (file) {
            handleFile(file);
          }
        }
      );

    /* Remove */
    $("removeButton")
      ?.addEventListener(
        "click",
        removeFile
      );

    /* Modes */
    $("photoMode")
      ?.addEventListener(
        "click",
        () => setMode("photo")
      );

    $("videoMode")
      ?.addEventListener(
        "click",
        () => setMode("video")
      );

    /* Quality */
    document
      .querySelectorAll(
        ".quality-option"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            setQuality(
              button.dataset.quality
            );
          }
        );
      });

    /* Enhance */
    $("enhanceButton")
      ?.addEventListener(
        "click",
        enhance
      );

    /* Download */
    $("downloadButton")
      ?.addEventListener(
        "click",
        downloadResult
      );

    /* New file */
    $("newFileButton")
      ?.addEventListener(
        "click",
        newFile
      );

    /* VVIP */
    $("vipButton")
      ?.addEventListener(
        "click",
        openVipModal
      );

    $("upgradeButton")
      ?.addEventListener(
        "click",
        openVipModal
      );

    $("upgradeModalButton")
      ?.addEventListener(
        "click",
        openVipModal
      );

    $("modalClose")
      ?.addEventListener(
        "click",
        closeVipModal
      );

    $("modalOverlay")
      ?.addEventListener(
        "click",
        closeVipModal
      );

    log(
      "FIDELIS APP READY."
    );

    log(
      "================================"
    );
  }

  window.FidelisApp = {
    enhance,
    newFile,
    openVipModal,
    closeVipModal,
    getState: () => ({
      ...state
    })
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
