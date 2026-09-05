(function () {
  "use strict";

  const state = {
    processing: false,
    currentQuality: null,
    error: null
  };

  function normalizeQuality(quality) {
    const q = String(quality || "standard").toLowerCase();

    if (q === "ultra" || q === "vvip") return "ultra";
    if (q === "high" || q === "hq" || q === "premium") return "high";

    return "standard";
  }

  function report(options, progress, text) {
    const value = Math.max(0, Math.min(100, Math.round(progress)));

    if (typeof options.onProgress === "function") {
      try {
        options.onProgress({
          progress: value,
          percent: value,
          text: text || ""
        });
      } catch (error) {}
    }

    try {
      window.dispatchEvent(
        new CustomEvent("fidelis:image-progress", {
          detail: {
            progress: value,
            percent: value,
            text: text || ""
          }
        })
      );
    } catch (error) {}
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      if (source instanceof HTMLImageElement) {
        if (source.complete && source.naturalWidth > 0) {
          resolve(source);
        } else {
          source.onload = () => resolve(source);
          source.onerror = () =>
            reject(new Error("Gagal membaca gambar."));
        }
        return;
      }

      let url = null;

      if (source instanceof Blob || source instanceof File) {
        url = URL.createObjectURL(source);
      } else if (typeof source === "string") {
        url = source;
      }

      if (!url) {
        reject(new Error("Source gambar tidak valid."));
        return;
      }

      const image = new Image();

      image.onload = () => {
        if (source instanceof Blob || source instanceof File) {
          URL.revokeObjectURL(url);
        }

        resolve(image);
      };

      image.onerror = () => {
        if (source instanceof Blob || source instanceof File) {
          URL.revokeObjectURL(url);
        }

        reject(new Error("Gagal memuat gambar."));
      };

      image.src = url;
    });
  }

  function imageToCanvas(image) {
    const canvas = document.createElement("canvas");

    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const ctx = canvas.getContext("2d", {
      alpha: false,
      willReadFrequently: true
    });

    if (!ctx) {
      throw new Error("Canvas tidak tersedia.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas;
  }

  function resizeCanvas(canvas, maxDimension) {
    if (
      canvas.width <= maxDimension &&
      canvas.height <= maxDimension
    ) {
      return canvas;
    }

    const scale =
      maxDimension /
      Math.max(canvas.width, canvas.height);

    const width = Math.max(
      1,
      Math.round(canvas.width * scale)
    );

    const height = Math.max(
      1,
      Math.round(canvas.height * scale)
    );

    const output = document.createElement("canvas");

    output.width = width;
    output.height = height;

    const ctx = output.getContext("2d", {
      alpha: false
    });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      canvas,
      0,
      0,
      width,
      height
    );

    return output;
  }

  function getImageData(canvas, x, y, width, height) {
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true
    });

    if (!ctx) {
      throw new Error("Canvas context tidak tersedia.");
    }

    return ctx.getImageData(
      x,
      y,
      width,
      height
    );
  }

  function getModel(quality) {
    const q = normalizeQuality(quality);

    try {
      if (
        window.FidelisRealESRGAN &&
        typeof window.FidelisRealESRGAN.get === "function"
      ) {
        const model = window.FidelisRealESRGAN.get(q);
        if (model) return model;
      }
    } catch (error) {}

    try {
      if (
        window.FidelisModelRegistry &&
        typeof window.FidelisModelRegistry.get === "function"
      ) {
        const model = window.FidelisModelRegistry.get(q);
        if (model) return model;
      }
    } catch (error) {}

    return null;
  }

  async function processTile(tileCanvas, quality, options) {
    const ctx = tileCanvas.getContext("2d", {
      willReadFrequently: true
    });

    const imageData = ctx.getImageData(
      0,
      0,
      tileCanvas.width,
      tileCanvas.height
    );

    if (
      !window.FidelisAIModelBridge ||
      typeof window.FidelisAIModelBridge.run !== "function"
    ) {
      throw new Error(
        "AI Model Bridge belum tersedia."
      );
    }

    return await window.FidelisAIModelBridge.run(
      imageData,
      quality,
      {
        onProgress: options.onModelProgress
      }
    );
  }

  async function enhance(source, quality = "standard", options = {}) {
    if (state.processing) {
      throw new Error(
        "FIDELIS sedang memproses gambar lain."
      );
    }

    const q = normalizeQuality(quality);

    state.processing = true;
    state.currentQuality = q;
    state.error = null;

    try {
      report(
        options,
        2,
        "Membaca gambar..."
      );

      const image =
        await loadImage(source);

      report(
        options,
        8,
        "Menyiapkan gambar..."
      );

      let canvas =
        imageToCanvas(image);

      /*
       * Batas input untuk menjaga penggunaan RAM.
       */
      const maxInput =
        Number(options.maxInputDimension) || 4096;

      if (
        canvas.width > maxInput ||
        canvas.height > maxInput
      ) {
        canvas =
          resizeCanvas(
            canvas,
            maxInput
          );
      }

      const inputWidth = canvas.width;
      const inputHeight = canvas.height;

      const model = getModel(q);

      if (!model) {
        throw new Error(
          `Model ${q} tidak ditemukan.`
        );
      }

      const scale =
        Number(model.scale) || 2;

      /*
       * Output maksimum.
       * Jangan izinkan output terlalu besar karena
       * canvas raksasa bisa menghabiskan RAM browser.
       */
      const maxOutput =
        Number(options.maxOutputDimension) || 8192;

      const expectedWidth =
        inputWidth * scale;

      const expectedHeight =
        inputHeight * scale;

      if (
        expectedWidth > maxOutput ||
        expectedHeight > maxOutput
      ) {
        const safeInput =
          maxOutput / scale;

        canvas =
          resizeCanvas(
            canvas,
            safeInput
          );
      }

      const width = canvas.width;
      const height = canvas.height;

      report(
        options,
        12,
        "Menyiapkan AI Real-ESRGAN..."
      );

      if (
        !window.FidelisAIModelBridge ||
        typeof window.FidelisAIModelBridge.createSession !==
          "function"
      ) {
        throw new Error(
          "AI Model Bridge belum siap."
        );
      }

      /*
       * Session dibuat sekali.
       * Model loader akan memakai cache kalau sudah ada.
       */
      await window.FidelisAIModelBridge.createSession(
        q,
        {
          onProgress: payload => {
            const modelProgress =
              payload &&
              Number.isFinite(payload.progress)
                ? payload.progress
                : 0;

            report(
              options,
              12 + modelProgress * 0.28,
              `Memuat model AI ${Math.round(modelProgress)}%`
            );
          }
        }
      );

      report(
        options,
        40,
        "AI siap. Memproses gambar..."
      );

      /*
       * Tentukan apakah perlu tile processing.
       */
      let tileSettings = {
        tileSize: 512,
        overlap: 32
      };

      if (
        window.FidelisTileEngine &&
        typeof window.FidelisTileEngine.getRecommendedSettings ===
          "function"
      ) {
        tileSettings =
          window.FidelisTileEngine.getRecommendedSettings(
            width,
            height,
            options
          );
      }

      let result;

      const shouldTile =
        options.forceTiles === true ||
        width > tileSettings.tileSize ||
        height > tileSettings.tileSize;

      if (
        shouldTile &&
        window.FidelisTileEngine &&
        typeof window.FidelisTileEngine.process ===
          "function"
      ) {
        result =
          await window.FidelisTileEngine.process(
            canvas,
            async (tileCanvas, tileInfo) => {
              return await processTile(
                tileCanvas,
                q,
                {
                  ...options,
                  onModelProgress: progress => {
                    if (
                      progress &&
                      Number.isFinite(progress.progress)
                    ) {
                      const local =
                        progress.progress / 100;

                      const tileBase =
                        Number(tileInfo?.progress) || 0;

                      report(
                        options,
                        40 +
                          tileBase * 0.58 +
                          local * 0.02,
                        "AI sedang meningkatkan detail..."
                      );
                    }
                  }
                }
              );
            },
            {
              ...tileSettings,

              onProgress: payload => {
                const progress =
                  payload &&
                  Number.isFinite(payload.progress)
                    ? payload.progress
                    : 0;

                report(
                  options,
                  40 + progress * 0.58,
                  "AI sedang meningkatkan detail..."
                );
              }
            }
          );
      } else {
        /*
         * Direct inference untuk gambar kecil.
         */
        const imageData =
          getImageData(
            canvas,
            0,
            0,
            width,
            height
          );

        result =
          await window.FidelisAIModelBridge.run(
            imageData,
            q
          );
      }

      if (
        !result ||
        !result.canvas
      ) {
        throw new Error(
          "AI tidak menghasilkan gambar."
        );
      }

      let outputCanvas =
        result.canvas;

      /*
       * Final safety limit.
       */
      if (
        outputCanvas.width > maxOutput ||
        outputCanvas.height > maxOutput
      ) {
        outputCanvas =
          resizeCanvas(
            outputCanvas,
            maxOutput
          );
      }

      report(
        options,
        96,
        "Menyelesaikan hasil..."
      );

      await new Promise(resolve =>
        requestAnimationFrame(resolve)
      );

      report(
        options,
        100,
        "Enhancement selesai."
      );

      return {
        canvas: outputCanvas,

        width:
          outputCanvas.width,

        height:
          outputCanvas.height,

        inputWidth: width,
        inputHeight: height,

        scale:
          Number(result.scale) || scale,

        model:
          result.model || model,

        quality: q,

        aiProcessed: true,

        fallback: false,

        engine:
          result.engine || "Real-ESRGAN",

        backend:
          result.backend ||
          (
            window.FidelisRuntime &&
            typeof window.FidelisRuntime.getBackend ===
              "function"
              ? window.FidelisRuntime.getBackend()
              : null
          )
      };
    } catch (error) {
      state.error = error;

      console.error(
        "[FIDELIS] Image pipeline error:",
        error
      );

      throw error;
    } finally {
      state.processing = false;
      state.currentQuality = null;
    }
  }

  function getStatus() {
    return {
      processing:
        state.processing,

      quality:
        state.currentQuality,

      error:
        state.error
          ? state.error.message ||
            String(state.error)
          : null,

      tileEngine:
        !!window.FidelisTileEngine,

      bridge:
        !!window.FidelisAIModelBridge
    };
  }

  window.FidelisImagePipeline = {
    normalizeQuality,
    loadImage,
    imageToCanvas,
    resizeCanvas,
    getImageData,
    enhance,
    getStatus
  };

  console.log(
    "[FIDELIS] Image Pipeline loaded."
  );
})();
