/* =========================================================
   FIDELIS IMAGE AI
   Real AI Image Enhancement Entry Point
   ========================================================= */

(function () {
  "use strict";

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

  function normalizeQuality(quality) {
    const q = String(quality || "standard").toLowerCase();

    if (q === "high") return "high";
    if (q === "ultra") return "ultra";

    return "standard";
  }

  function validateFile(file) {
    if (!file) {
      throw new Error("Tidak ada file gambar.");
    }

    if (!(file instanceof File)) {
      throw new Error("File gambar tidak valid.");
    }

    if (!file.type || !file.type.startsWith("image/")) {
      throw new Error("File harus berupa gambar.");
    }

    if (file.size <= 0) {
      throw new Error("File gambar kosong.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Ukuran gambar terlalu besar. Maksimal 20 MB.");
    }

    return true;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (!img.naturalWidth || !img.naturalHeight) {
          reject(new Error("Gambar tidak memiliki dimensi yang valid."));
          return;
        }

        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Gagal membaca gambar."));
      };

      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      if (!canvas) {
        reject(new Error("Canvas hasil AI tidak tersedia."));
        return;
      }

      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error("Gagal membuat file hasil."));
            return;
          }

          resolve(blob);
        },
        type,
        quality
      );
    });
  }

  function ensureAIResult(result) {
    if (!result) {
      throw new Error("AI tidak menghasilkan hasil.");
    }

    if (result.fallback === true) {
      throw new Error(
        "FIDELIS menolak fallback. Model AI tidak berhasil melakukan inference."
      );
    }

    if (result.aiProcessed !== true) {
      throw new Error(
        "Gambar belum diproses oleh AI. Tidak ada hasil yang dikembalikan."
      );
    }

    if (!result.canvas) {
      throw new Error("Canvas hasil AI tidak tersedia.");
    }

    return result;
  }

  async function enhance(file, options = {}) {
    validateFile(file);

    const quality = normalizeQuality(options.quality);

    if (
      !window.FidelisPipelineRouter ||
      typeof window.FidelisPipelineRouter.processImage !== "function"
    ) {
      throw new Error(
        "AI Pipeline belum siap. Pastikan semua engine FIDELIS sudah dimuat."
      );
    }

    const report =
      typeof options.onProgress === "function"
        ? options.onProgress
        : () => {};

    report({
      stage: "loading",
      progress: 5,
      message: "Membaca gambar..."
    });

    const image = await loadImage(file);

    report({
      stage: "prepare",
      progress: 12,
      message: "Menyiapkan AI..."
    });

    /*
     * FaceGuard hanya melakukan pemeriksaan konservatif.
     * Ini BUKAN face recognition.
     */
    let guard = null;

    try {
      if (
        window.FidelisFaceGuard &&
        typeof window.FidelisFaceGuard.prepare === "function"
      ) {
        guard = await window.FidelisFaceGuard.prepare(image);
      }
    } catch (error) {
      console.warn("[FIDELIS] FaceGuard prepare warning:", error);
    }

    report({
      stage: "ai",
      progress: 20,
      message: "AI sedang meningkatkan detail..."
    });

    let result;

    try {
      result = await window.FidelisPipelineRouter.processImage(
        image,
        quality,
        {
          onProgress: event => {
            if (!event) return;

            let progress =
              typeof event.progress === "number"
                ? event.progress
                : 20;

            /*
             * Pipeline progress biasanya berada di 0–100.
             * Kita mapping ke UI FIDELIS 20–90%.
             */
            progress = 20 + progress * 0.7;

            report({
              stage: event.stage || "ai",
              progress,
              message:
                event.message ||
                "AI sedang memproses gambar..."
            });
          }
        }
      );
    } catch (error) {
      console.error("[FIDELIS] AI processing failed:", error);

      throw new Error(
        error?.message ||
          "AI gagal memproses gambar. Silakan coba lagi."
      );
    }

    ensureAIResult(result);

    /*
     * Finalize guard jika tersedia.
     */
    try {
      if (
        guard &&
        window.FidelisFaceGuard &&
        typeof window.FidelisFaceGuard.finalize === "function"
      ) {
        await window.FidelisFaceGuard.finalize(
          guard,
          result.canvas
        );
      }
    } catch (error) {
      console.warn("[FIDELIS] FaceGuard finalize warning:", error);
    }

    report({
      stage: "export",
      progress: 92,
      message: "Menyiapkan hasil..."
    });

    /*
     * Gunakan JPEG berkualitas tinggi.
     * Hasil tetap berasal dari canvas inference AI.
     */
    const blob = await canvasToBlob(
      result.canvas,
      "image/jpeg",
      0.96
    );

    if (!blob || blob.size <= 0) {
      throw new Error("Hasil AI kosong.");
    }

    report({
      stage: "complete",
      progress: 100,
      message: "Enhancement selesai."
    });

    return {
      blob,

      canvas: result.canvas,

      width: result.width || result.canvas.width,
      height: result.height || result.canvas.height,

      originalWidth:
        result.originalWidth || image.naturalWidth,

      originalHeight:
        result.originalHeight || image.naturalHeight,

      inputWidth: result.inputWidth,
      inputHeight: result.inputHeight,

      scale: result.scale || 2,

      quality,

      model: result.model || null,

      engine: result.engine || "Real-ESRGAN",

      backend: result.backend || "unknown",

      inputShape: result.inputShape || null,
      outputShape: result.outputShape || null,

      inferenceTime:
        typeof result.inferenceTime === "number"
          ? result.inferenceTime
          : null,

      aiProcessed: true,
      fallback: false
    };
  }

  function isReady(quality = "standard") {
    if (
      !window.FidelisPipelineRouter ||
      typeof window.FidelisPipelineRouter.isReady !== "function"
    ) {
      return false;
    }

    return window.FidelisPipelineRouter.isReady(
      normalizeQuality(quality)
    );
  }

  function getStatus(quality = "standard") {
    if (
      window.FidelisPipelineRouter &&
      typeof window.FidelisPipelineRouter.getStatus === "function"
    ) {
      return window.FidelisPipelineRouter.getStatus(
        normalizeQuality(quality)
      );
    }

    return {
      ready: false,
      quality: normalizeQuality(quality),
      error: "Pipeline router belum tersedia."
    };
  }

  window.FidelisImageAI = {
    enhance,
    isReady,
    getStatus,
    validateFile
  };

  console.log("🔥 FIDELIS Image AI ready");
})();
