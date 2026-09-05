/* =========================================================
   FIDELIS APP CONTROLLER
   Stable UI Controller
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

  function $(id) {
    return document.getElementById(id);
  }

  function notify(message, type) {
    if (
      window.FidelisNotifications &&
      typeof window.FidelisNotifications.show === "function"
    ) {
      window.FidelisNotifications.show(
        message,
        type || "info"
      );
      return;
    }

    console.log(
      "[FIDELIS]",
      type || "info",
      message
    );
  }

  function setHidden(element, hidden) {
    if (!element) return;

    element.classList.toggle(
      "hidden",
      !!hidden
    );
  }

  function setText(id, text) {
    const element = $(id);

    if (element) {
      element.textContent =
        text == null ? "" : String(text);
    }
  }

  function setProgress(percent, message) {
    let value = Number(percent);

    if (!Number.isFinite(value)) {
      value = 0;
    }

    value = Math.max(
      0,
      Math.min(100, value)
    );

    const bar = $("progressBar");

    if (bar) {
      bar.style.width =
        value + "%";
    }

    setText(
      "progressPercent",
      Math.round(value) + "%"
    );

    if (message) {
      setText(
        "processingText",
        message
      );
    }
  }

  function normalizeQuality(value) {
    const quality =
      String(value || "standard")
        .toLowerCase();

    if (quality === "high") {
      return "high";
    }

    if (quality === "ultra") {
      return "ultra";
    }

    return "standard";
  }

  function resetPreview() {
    const preview =
      $("mediaPreview");

    if (preview) {
      preview.innerHTML = "";
    }

    setText("fileName", "");
  }

  function resetResult() {
    const result =
      $("resultPreview");

    if (result) {
      result.innerHTML = "";
    }

    setText(
      "resultQuality",
      ""
    );
  }

  function updateModeUI() {
    const photo =
      $("photoMode");

    const video =
      $("videoMode");

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

    const input =
      $("fileInput");

    if (input) {
      input.accept =
        state.mode === "photo"
          ? "image/*"
          : "video/*";
    }

    const title =
      $("uploadTitle");

    const description =
      $("uploadDescription");

    const limit =
      $("uploadLimit");

    if (state.mode === "photo") {
      if (title) {
        title.textContent =
          "Upload your photo";
      }

      if (description) {
        description.textContent =
          "Drag & drop or choose an image.";
      }

      if (limit) {
        limit.textContent =
          "JPG, JPEG, PNG • Max 20 MB";
      }
    } else {
      if (title) {
        title.textContent =
          "Upload your video";
      }

      if (description) {
        description.textContent =
          "Choose a video to enhance with FIDELIS.";
      }

      if (limit) {
        limit.textContent =
          "MP4, MOV, WEBM";
      }
    }
  }

  function updateQualityUI() {
    const buttons =
      document.querySelectorAll(
        ".quality-option"
      );

    buttons.forEach(button => {
      const quality =
        normalizeQuality(
          button.dataset.quality
        );

      button.classList.toggle(
        "active",
        quality === state.quality
      );
    });
  }

  function selectQuality(value) {
    const quality =
      normalizeQuality(value);

    if (quality === "ultra") {
      /*
       * Jangan sampai tier system yang error
       * membuat tombol quality mati.
       *
       * Kalau tier manager memang tersedia
       * dan menolak Ultra, tampilkan modal.
       */

      if (
        window.FidelisTier &&
        typeof window.FidelisTier.canUse ===
          "function"
      ) {
        try {
          const allowed =
            window.FidelisTier.canUse(
              "ultra"
            );

          if (!allowed) {
            openVipModal();
            return;
          }
        } catch (error) {
          console.warn(
            "[FIDELIS] Tier check failed:",
            error
          );
        }
      }
    }

    state.quality = quality;

    updateQualityUI();

    console.log(
      "[FIDELIS] Quality:",
      state.quality
    );
  }

  function renderPreview(file) {
    const container =
      $("mediaPreview");

    if (!container) {
      return;
    }

    container.innerHTML = "";

    if (
      file.type &&
      file.type.startsWith("image/")
    ) {
      const image =
        document.createElement("img");

      image.alt =
        "FIDELIS preview";

      image.style.maxWidth =
        "100%";

      image.style.height =
        "auto";

      image.style.display =
        "block";

      const url =
        URL.createObjectURL(file);

      image.onload = function () {
        URL.revokeObjectURL(url);
      };

      image.src = url;

      container.appendChild(image);

      return;
    }

    if (
      file.type &&
      file.type.startsWith("video/")
    ) {
      const video =
        document.createElement("video");

      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";

      video.style.maxWidth =
        "100%";

      video.style.height =
        "auto";

      video.src =
        URL.createObjectURL(file);

      container.appendChild(video);
    }
  }

  function handleFile(file) {
    if (!file) {
      return;
    }

    const isImage =
      file.type &&
      file.type.startsWith("image/");

    const isVideo =
      file.type &&
      file.type.startsWith("video/");

    if (
      state.mode === "photo" &&
      !isImage
    ) {
      notify(
        "Mode Photo hanya menerima gambar.",
        "error"
      );
      return;
    }

    if (
      state.mode === "video" &&
      !isVideo
    ) {
      notify(
        "Mode Video hanya menerima video.",
        "error"
      );
      return;
    }

    if (
      isImage &&
      file.size >
        20 * 1024 * 1024
    ) {
      notify(
        "Ukuran gambar maksimal 20 MB.",
        "error"
      );
      return;
    }

    state.file = file;
    state.result = null;

    setText(
      "fileName",
      file.name
    );

    renderPreview(file);

    setHidden(
      $("previewSection"),
      false
    );

    setHidden(
      $("processingSection"),
      true
    );

    setHidden(
      $("resultSection"),
      true
    );

    resetResult();

    notify(
      "File berhasil dimuat.",
      "success"
    );
  }

  async function enhance() {
    if (state.busy) {
      return;
    }

    if (!state.file) {
      notify(
        "Upload file terlebih dahulu.",
        "error"
      );
      return;
    }

    state.busy = true;

    const button =
      $("enhanceButton");

    if (button) {
      button.disabled = true;
      button.textContent =
        "Enhancing...";
    }

    setHidden(
      $("previewSection"),
      true
    );

    setHidden(
      $("resultSection"),
      true
    );

    setHidden(
      $("processingSection"),
      false
    );

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
            quality:
              state.quality,

            onProgress:
              function (event) {
                if (!event) {
                  return;
                }

                setProgress(
                  event.progress,
                  event.message
                );
              }
          }
        );

      if (!result) {
        throw new Error(
          "Processing tidak menghasilkan output."
        );
      }

      /*
       * Untuk PHOTO, hasil wajib berasal
       * dari AI sungguhan.
       */
      if (
        state.mode === "photo"
      ) {
        if (
          result.aiProcessed !== true
        ) {
          throw new Error(
            "Hasil tidak berasal dari AI."
          );
        }

        if (
          result.fallback === true
        ) {
          throw new Error(
            "AI fallback terdeteksi. Hasil dibatalkan."
          );
        }
      }

      state.result =
        result;

      showResult(result);

      notify(
        "Enhancement berhasil.",
        "success"
      );
    } catch (error) {
      console.error(
        "[FIDELIS] Enhancement failed:",
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
        error &&
        error.message
          ? error.message
          : "Enhancement gagal.",
        "error"
      );
    } finally {
      state.busy = false;

      if (button) {
        button.disabled = false;
        button.textContent =
          "Enhance";
      }
    }
  }

  function showResult(result) {
    const container =
      $("resultPreview");

    if (!container) {
      return;
    }

    container.innerHTML = "";

    if (result.canvas) {
      const canvas =
        result.canvas;

      canvas.style.maxWidth =
        "100%";

      canvas.style.height =
        "auto";

      canvas.style.display =
        "block";

      container.appendChild(
        canvas
      );
    }

    let label =
      normalizeQuality(
        result.quality ||
          state.quality
      ).toUpperCase();

    if (result.scale) {
      label +=
        " • " +
        result.scale +
        "×";
    }

    if (result.backend) {
      label +=
        " • " +
        result.backend;
    }

    setText(
      "resultQuality",
      label
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
    const result =
      state.result;

    if (!result) {
      notify(
        "Belum ada hasil.",
        "error"
      );
      return;
    }

    if (result.blob) {
      downloadBlob(
        result.blob,
        getOutputName()
      );
      return;
    }

    if (result.canvas) {
      result.canvas.toBlob(
        function (blob) {
          if (!blob) {
            notify(
              "Gagal membuat file.",
              "error"
            );
            return;
          }

          downloadBlob(
            blob,
            getOutputName()
          );
        },
        "image/jpeg",
        0.96
      );

      return;
    }

    notify(
      "Hasil tidak dapat di-download.",
      "error"
    );
  }

  function getOutputName() {
    const original =
      state.file &&
      state.file.name
        ? state.file.name
        : "image";

    const clean =
      original.replace(
        /\.[^/.]+$/,
        ""
      );

    return (
      clean +
      "-fidelis.jpg"
    );
  }

  function downloadBlob(
    blob,
    filename
  ) {
    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    setTimeout(
      function () {
        URL.revokeObjectURL(url);
      },
      1000
    );
  }

  function newFile() {
    state.file = null;
    state.result = null;
    state.busy = false;

    const input =
      $("fileInput");

    if (input) {
      input.value = "";
    }

    resetPreview();
    resetResult();

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

    setProgress(
      0,
      ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function openVipModal() {
    const modal =
      $("vipModal");

    if (!modal) {
      return;
    }

    modal.classList.remove(
      "hidden"
    );
  }

  function closeVipModal() {
    const modal =
      $("vipModal");

    if (!modal) {
      return;
    }

    modal.classList.add(
      "hidden"
    );
  }

  function setup() {
    console.log(
      "🔥 FIDELIS App Controller starting..."
    );

    const photoMode =
      $("photoMode");

    const videoMode =
      $("videoMode");

    if (photoMode) {
      photoMode.addEventListener(
        "click",
        function () {
          state.mode =
            "photo";

          state.file = null;

          if ($("fileInput")) {
            $("fileInput").value =
              "";
          }

          resetPreview();
          resetResult();

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

          updateModeUI();
        }
      );
    }

    if (videoMode) {
      videoMode.addEventListener(
        "click",
        function () {
          state.mode =
            "video";

          state.file = null;

          if ($("fileInput")) {
            $("fileInput").value =
              "";
          }

          resetPreview();
          resetResult();

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

          updateModeUI();
        }
      );
    }

    const uploadBox =
      $("uploadBox");

    const uploadButton =
      $("uploadButton");

    const fileInput =
      $("fileInput");

    if (uploadButton && fileInput) {
      uploadButton.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopPropagation();

          fileInput.click();
        }
      );
    }

    if (uploadBox && fileInput) {
      uploadBox.addEventListener(
        "click",
        function (event) {
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
        function (event) {
          event.preventDefault();

          uploadBox.classList.add(
            "dragging"
          );
        }
      );

      uploadBox.addEventListener(
        "dragleave",
        function () {
          uploadBox.classList.remove(
            "dragging"
          );
        }
      );

      uploadBox.addEventListener(
        "drop",
        function (event) {
          event.preventDefault();

          uploadBox.classList.remove(
            "dragging"
          );

          const files =
            event.dataTransfer &&
            event.dataTransfer.files;

          if (
            files &&
            files.length
          ) {
            handleFile(
              files[0]
            );
          }
        }
      );
    }

    if (fileInput) {
      fileInput.addEventListener(
        "change",
        function (event) {
          const files =
            event.target.files;

          if (
            files &&
            files.length
          ) {
            handleFile(
              files[0]
            );
          }
        }
      );
    }

    document
      .querySelectorAll(
        ".quality-option"
      )
      .forEach(
        function (button) {
          button.addEventListener(
            "click",
            function () {
              selectQuality(
                button.dataset.quality
              );
            }
          );
        }
      );

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
        function () {
          notify(
            "VVIP system belum terhubung.",
            "info"
          );
        }
      );
    }

    updateModeUI();
    updateQualityUI();

    console.log(
      "✅ FIDELIS App Controller ready"
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      setup
    );
  } else {
    setup();
  }

  window.FidelisApp = {
    enhance: enhance,
    newFile: newFile,
    openVipModal:
      openVipModal,
    closeVipModal:
      closeVipModal,

    getState: function () {
      return {
        mode: state.mode,
        quality: state.quality,
        file: state.file,
        result: state.result,
        busy: state.busy
      };
    }
  };
})();
