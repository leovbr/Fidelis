/* =========================================================
   FIDELIS PROCESSING ENGINE
   Central processing controller
   ========================================================= */

(function () {
  "use strict";

  const state = {
    processing: false
  };

  function normalizeQuality(quality) {
    const q = String(quality || "standard").toLowerCase();

    if (q === "high") return "high";
    if (q === "ultra") return "ultra";

    return "standard";
  }

  function emit(callback, data) {
    if (typeof callback !== "function") return;

    try {
      callback(data);
    } catch (error) {
      console.warn("[FIDELIS] Progress callback error:", error);
    }
  }

  async function process(file, options = {}) {
    if (state.processing) {
      throw new Error(
        "FIDELIS masih memproses file sebelumnya."
      );
    }

    if (!file) {
      throw new Error("File tidak ditemukan.");
    }

    state.processing = true;

    const quality = normalizeQuality(options.quality);

    const onProgress =
      typeof options.onProgress === "function"
        ? options.onProgress
        : () => {};

    try {
      emit(onProgress, {
        stage: "start",
        progress: 0,
        message: "Memulai FIDELIS..."
      });

      /*
       * PHOTO
       *
       * Penting:
       * Jangan panggil FidelisImage.enhance().
       *
       * FidelisImage adalah legacy browser enhancement,
       * bukan Real-ESRGAN.
       */
      if (file.type && file.type.startsWith("image/")) {
        if (
          !window.FidelisImageAI ||
          typeof window.FidelisImageAI.enhance !== "function"
        ) {
          throw new Error(
            "FIDELIS Image AI belum tersedia."
          );
        }

        emit(onProgress, {
          stage: "ai",
          progress: 5,
          message: "Menghubungkan ke AI..."
        });

        const result =
          await window.FidelisImageAI.enhance(
            file,
            {
              quality,

              onProgress: event => {
                emit(onProgress, event);
              }
            }
          );

        /*
         * Absolute safety check.
         * ProcessingEngine tidak boleh menerima
         * hasil fake/legacy fallback.
         */
        if (!result || result.aiProcessed !== true) {
          throw new Error(
            "Hasil tidak berasal dari AI."
          );
        }

        if (result.fallback === true) {
          throw new Error(
            "Fallback terdeteksi. Hasil dibatalkan."
          );
        }

        emit(onProgress, {
          stage: "complete",
          progress: 100,
          message: "AI enhancement selesai."
        });

        return result;
      }

      /*
       * VIDEO
       *
       * Video engine masih dipisahkan.
       * Jangan pura-pura menyebut canvas enhancement
       * sebagai Real-ESRGAN video.
       */
      if (file.type && file.type.startsWith("video/")) {
        if (
          !window.FidelisVideo ||
          typeof window.FidelisVideo.enhance !== "function"
        ) {
          throw new Error(
            "Video engine belum tersedia."
          );
        }

        emit(onProgress, {
          stage: "video",
          progress: 5,
          message: "Menyiapkan video..."
        });

        const result =
          await window.FidelisVideo.enhance(
            file,
            {
              quality,

              onProgress: event => {
                emit(onProgress, event);
              }
            }
          );

        emit(onProgress, {
          stage: "complete",
          progress: 100,
          message: "Video selesai diproses."
        });

        return result;
      }

      throw new Error(
        "Format file tidak didukung."
      );
    } catch (error) {
      console.error(
        "[FIDELIS] Processing failed:",
        error
      );

      emit(onProgress, {
        stage: "error",
        progress: 0,
        message:
          error?.message ||
          "Processing gagal."
      });

      throw error;
    } finally {
      state.processing = false;
    }
  }

  function isProcessing() {
    return state.processing;
  }

  function getStatus() {
    return {
      processing: state.processing
    };
  }

  window.FidelisProcessing = {
    process,
    isProcessing,
    getStatus
  };

  console.log("🔥 FIDELIS Processing Engine ready");
})();
