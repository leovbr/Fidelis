/* =========================================================
   FIDELIS APP CONTROLLER
   ========================================================= */

(function () {
  "use strict";

  const state = {
    mode: "photo",
    quality: "standard",
    file: null,
    result: null,
    busy: false
  };

  const $ = id => document.getElementById(id);

  function notify(message, type = "info") {
    if (
      window.FidelisNotifications &&
      typeof window.FidelisNotifications.show === "function"
    ) {
      window.FidelisNotifications.show(message, type);
      return;
    }

    console.log(`[FIDELIS ${type}]`, message);
  }

  function setHidden(element, hidden) {
    if (!element) return;

    element.classList.toggle("hidden", hidden);
  }

  function setText(id, text) {
    const element = $(id);
    if (element) element.textContent = text;
  }

  function setProgress(percent, message) {
    const value = Math.max(0, Math.min(100, Number(percent) || 0));

    const bar = $("progressBar");

    if (bar) {
      bar.style.width = `${value}%`;
    }

    setText("progressPercent", `${Math.round(value)}%`);

    if (message) {
      setText("processingText", message);
    }
  }

  function showSection(id) {
    const sections = [
      "previewSection",
      "processingSection",
      "resultSection"
    ];

    sections.forEach(sectionId => {
      const element = $(sectionId);
      if (!element) return;

      element.classList.toggle(
        "hidden",
        sectionId !== id
      );
    });
  }

  function resetPreview() {
    const preview = $("mediaPreview");

    if (preview) {
      preview.innerHTML = "";
    }

    setText("fileName", "");
  }

  function resetResult() {
    const resultPreview = $("resultPreview");

    if (resultPreview) {
      resultPreview.innerHTML = "";
    }

    setText("resultQuality", "");
  }

  function updateUploadText() {
    const title = $("uploadTitle");
    const description = $("uploadDescription");
    const limit = $("uploadLimit");

    if (state.mode === "video") {
      if (title) title.textContent = "Upload your video";
      if (description) {
        description.textContent =
          "Choose a video to enhance with FIDELIS.";
      }

      if (limit) {
        limit.textContent = "MP4, MOV, WEBM";
      }

      return;
    }

    if (title) title.textContent = "Upload your photo";

    if (description) {
      description.textContent =
        "Drag & drop or choose an image.";
    }

    if (limit) {
      limit.textContent =
        "JPG, JPEG, PNG • Max 20 MB";
    }
  }

  function updateModeButtons() {
    const photo = $("photoMode");
    const video = $("videoMode");

    if (photo) {
      photo.classList.toggle(
        "active",
        state.mode === "photo"
      );
    }

    if (video) {
      video.classList.toggle(
        "active",
        state.mode === "video"
      );
    }

    const input = $("fileInput");

    if (input) {
      input.value = "";

      input.accept =
        state.mode === "photo"
          ? "image/*"
          : "video/*";
    }

    state.file = null;

    resetPreview();
    resetResult();

    setHidden($("previewSection"), true);
    setHidden($("processingSection"), true);
    setHidden($("resultSection"), true);

    updateUploadText();
  }

  function updateQualityButtons() {
    document
      .querySelectorAll(".quality-option")
      .forEach(button => {
        const quality =
          button.dataset.quality || "standard";

        button.classList.toggle(
          "active",
          quality === state.quality
        );
      });
  }

  function selectQuality(quality) {
    const q = String(quality || "standard")
      .toLowerCase();

    if (
      q !== "standard" &&
      q !== "high" &&
      q !== "ultra"
    ) {
      return;
    }

    /*
     * Ultra hanya untuk VVIP.
     * Kalau tier manager tersedia, gunakan pengecekan.
     */
    if (q === "ultra") {
      let allowed = false;

      try {
        if (
          window.FidelisTier &&
          typeof window.FidelisTier.canUse ===
            "function"
        ) {
          allowed =
            window.FidelisTier.canUse("ultra");
        }
      } catch (error) {
        console.warn(
          "[FIDELIS] Tier check failed:",
          error
        );
      }

      /*
       * Kalau tier manager belum tersedia,
       * jangan blokir UI. Pipeline nanti yang
       * menentukan apakah model ultra tersedia.
       */
      if (
        window.FidelisTier &&
        typeof window.FidelisTier.canUse ===
          "function" &&
        !allowed
      ) {
        openVipModal();
        return;
      }
    }

    state.quality = q;

    updateQualityButtons();
  }

  function renderPreview(file) {
    const container = $("mediaPreview");

    if (!container) return;

    container.innerHTML = "";

    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");

      img.alt = "FIDELIS preview";
      img.style.maxWidth = "100%";
      img.style.display = "block";

      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
      };

      img.src = url;

      container.appendChild(img);

      return;
    }

    if (file.type.startsWith("video/")) {
      const video =
        document.createElement("video");

      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.style.maxWidth = "100%";
      video.src = URL.createObjectURL(file);

      container.appendChild(video);
    }
  }

  function handleFile(file) {
    if (!file) return;

    const isImage =
      file.type &&
      file.type.startsWith("image/");

    const isVideo =
      file.type &&
      file.type.startsWith("video/");

    if (state.mode === "photo" && !isImage) {
      notify(
        "Mode Photo hanya menerima gambar.",
        "error"
      );
      return;
    }

    if (state.mode === "video" && !isVideo) {
      notify(
        "Mode Video hanya menerima video.",
        "error"
      );
      return;
    }

    if (isImage && file.size > 20 * 1024 * 1024) {
      notify(
        "Ukuran gambar maksimal 20 MB.",
        "error"
      );
      return;
    }

    state.file = file;

    setText("fileName", file.name);

    renderPreview(file);

    setHidden($("previewSection"), false);
    setHidden($("processingSection"), true);
    setHidden($("resultSection"), true);

    resetResult();

    notify("File berhasil dimuat.", "success");
  }

  async function enhance() {
    if (state.busy) return;

    if (!state.file) {
      notify(
        "Upload file terlebih dahulu.",
        "error"
      );
      return;
    }

    state.busy = true;

    const enhanceButton = $("enhanceButton");

    if (enhanceButton) {
      enhanceButton.disabled = true;
      enhanceButton.textContent =
        "Enhancing...";
    }

    setHidden($("previewSection"), true);
    setHidden($("resultSection"), true);
    setHidden($("processingSection"), false);

    setProgress(
      0,
      "Memulai FIDELIS..."
    );

    try {
      if (
        !window.FidelisProcessing ||
        typeof window.FidelisProcessing.process !==
          "function"
      ) {
        throw new Error(
          "Processing Engine belum tersedia."
        );
      }

      const result =
        await window.FidelisProcessing.process(
          state.file,
          {
            quality: state.quality,

            onProgress: event => {
              if (!event) return;

              setProgress(
                event.progress,
                event.message
              );
            }
          }
        );

      if (!result) {
        throw new Error(
          "Tidak ada hasil dari processing engine."
        );
      }

      if (
        state.mode === "photo" &&
        result.aiProcessed !== true
      ) {
        throw new Error(
          "Hasil tidak berasal dari AI."
        );
      }

      if (
        state.mode === "photo" &&
        result.fallback === true
      ) {
        throw new Error(
          "AI fallback terdeteksi. Hasil dibatalkan."
        );
      }

      state.result = result;

      showResult(result);

      notify(
        "Enhancement berhasil.",
        "success"
      );
    } catch (error) {
      console.error(
        "[FIDELIS] Enhancement error:",
        error
      );

      setHidden(
        $("processingSection"),
        true
      );

      setHidden(
        $("previewSection"),
        false
      );

      notify(
        error?.message ||
          "Enhancement gagal.",
        "error"
      );
    } finally {
      state.busy = false;

      if (enhanceButton) {
        enhanceButton.disabled = false;
        enhanceButton.textContent =
          "Enhance";
      }
    }
  }

  function showResult(result) {
    const container = $("resultPreview");

    if (!container) return;

    container.innerHTML = "";

    if (result.canvas) {
      const canvas = result.canvas;

      canvas.style.maxWidth = "100%";
      canvas.style.height = "auto";
      canvas.style.display = "block";

      container.appendChild(canvas);
    } else if (result.url) {
      const img = document.createElement("img");

      img.src = result.url;
      img.alt = "FIDELIS result";
      img.style.maxWidth = "100%";

      container.appendChild(img);
    }

    let label =
      result.quality || state.quality;

    if (result.scale) {
      label += ` • ${result.scale}×`;
    }

    if (result.backend) {
      label += ` • ${result.backend}`;
    }

    setText(
      "resultQuality",
      label.toUpperCase()
    );

    setProgress(
      100,
      "Enhancement selesai."
    );

    setHidden(
      $("processingSection"),
      true
    );

    setHidden(
      $("previewSection"),
      true
    );

    setHidden(
      $("resultSection"),
      false
    );
  }

  function downloadResult() {
    const result = state.result;

    if (!result) {
      notify(
        "Belum ada hasil untuk di-download.",
        "error"
      );
      return;
    }

    if (result.blob) {
      const url =
        URL.createObjectURL(result.blob);

      const link =
        document.createElement("a");

      link.href = url;

      const originalName =
        state.file?.name ||
        "fidelis-image.jpg";

      const cleanName =
        originalName.replace(
          /\.[^/.]+$/,
          ""
        );

      link.download =
        `${cleanName}-fidelis.jpg`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      return;
    }

    if (result.canvas) {
      result.canvas.toBlob(blob => {
        if (!blob) {
          notify(
            "Gagal membuat file download.",
            "error"
          );
          return;
        }

        const url =
          URL.createObjectURL(blob);

        const link =
          document.createElement("a");

        link.href = url;

        link.download =
          "fidelis-enhanced.jpg";

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }, "image/jpeg", 0.96);

      return;
    }

    notify(
      "Format hasil tidak dapat di-download.",
      "error"
    );
  }

  function newFile() {
    state.file = null;
    state.result = null;
    state.busy = false;

    resetPreview();
    resetResult();

    const input = $("fileInput");

    if (input) {
      input.value = "";
    }

    setHidden(
      $("previewSection"),
      true
    );

    setHidden(
      $("processingSection"),
      true
    );

    setHidden(
      $("resultSection"),
      true
    );

    updateUploadText();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function openVipModal() {
    const modal = $("vipModal");

    if (!modal) return;

    modal.classList.remove("hidden");
  }

  function closeVipModal() {
    const modal = $("vipModal");

    if (!modal) return;

    modal.classList.add("hidden");
  }

  function setup() {
    console.log(
      "🔥 FIDELIS App Controller starting..."
    );

    const photoMode = $("photoMode");
    const videoMode = $("videoMode");

    if (photoMode) {
      photoMode.addEventListener(
        "click",
        () => {
          state.mode = "photo";
          updateModeButtons();
        }
      );
    }

    if (videoMode) {
      videoMode.addEventListener(
        "click",
        () => {
          state.mode = "video";
          updateModeButtons();
        }
      );
    }

    const uploadButton = $("uploadButton");
    const fileInput = $("fileInput");
    const uploadBox = $("uploadBox");

    if (uploadButton && fileInput) {
      uploadButton.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();

          fileInput.click();
        }
      );
    }

    if (uploadBox && fileInput) {
      uploadBox.addEventListener(
        "click",
        event => {
          /*
           * Jangan trigger dua kali kalau user
           * mengklik tombol Upload yang sudah
           * memanggil fileInput.click().
           */
          if (
            event.target.closest(
              "#uploadButton"
            )
          ) {
            return;
          }

          fileInput.click();
        }
      );

      uploadBox.addEventListener(
        "dragover",
        event => {
          event.preventDefault();

          uploadBox.classList.add(
            "dragging"
          );
        }
      );

      uploadBox.addEventListener(
        "dragleave",
        () => {
          uploadBox.classList.remove(
            "dragging"
          );
        }
      );

      uploadBox.addEventListener(
        "drop",
        event => {
          event.preventDefault();

          uploadBox.classList.remove(
            "dragging"
          );

          const file =
            event.dataTransfer.files?.[0];

          handleFile(file);
        }
      );
    }

    if (fileInput) {
      fileInput.addEventListener(
        "change",
        event => {
          const file =
            event.target.files?.[0];

          handleFile(file);
        }
      );
    }

    document
      .querySelectorAll(".quality-option")
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            selectQuality(
              button.dataset.quality
            );
          }
        );
      });

    const enhanceButton =
      $("enhanceButton");

    if (enhanceButton) {
      enhanceButton.addEventListener(
        "click",
        enhance
      );
    }

    const removeButton =
      $("removeButton");

    if (removeButton) {
      removeButton.addEventListener(
        "click",
        newFile
      );
    }

    const downloadButton =
      $("downloadButton");

    if (downloadButton) {
      downloadButton.addEventListener(
        "click",
        downloadResult
      );
    }

    const newFileButton =
      $("newFileButton");

    if (newFileButton) {
      newFileButton.addEventListener(
        "click",
        newFile
      );
    }

    const vipButton =
      $("vipButton");

    if (vipButton) {
      vipButton.addEventListener(
        "click",
        openVipModal
      );
    }

    const upgradeButton =
      $("upgradeButton");

    if (upgradeButton) {
      upgradeButton.addEventListener(
        "click",
        openVipModal
      );
    }

    const modalClose =
      $("modalClose");

    if (modalClose) {
      modalClose.addEventListener(
        "click",
        closeVipModal
      );
    }

    const modalOverlay =
      $("modalOverlay");

    if (modalOverlay) {
      modalOverlay.addEventListener(
        "click",
        closeVipModal
      );
    }

    const upgradeModalButton =
      $("upgradeModalButton");

    if (upgradeModalButton) {
      upgradeModalButton.addEventListener(
        "click",
        () => {
          notify(
            "VVIP system belum terhubung.",
            "info"
          );
        }
      );
    }

    updateModeButtons();
    updateQualityButtons();

    console.log(
      "✅ FIDELIS App Controller ready"
    );
  }

  /*
   * Tunggu DOM agar script tetap aman
   * meskipun posisi script berubah.
   */
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      setup
    );
  } else {
    setup();
  }

  window.FidelisApp = {
    getState: () => ({
      ...state
    }),

    enhance,

    newFile,

    openVipModal,

    closeVipModal
  };
})();
