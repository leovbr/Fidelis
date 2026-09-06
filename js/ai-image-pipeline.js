(function () {
  "use strict";

  /*
   * FIDELIS AI IMAGE PIPELINE
   *
   * Source
   *   ↓
   * ImageData
   *   ↓
   * AI Model Bridge
   *   ↓
   * Real-ESRGAN ONNX
   *   ↓
   * Canvas
   */

  function normalizeQuality(quality) {
    const value =
      String(
        quality || "standard"
      ).toLowerCase();

    if (
      value === "ultra" ||
      value === "vvip" ||
      value === "4k"
    ) {
      return "ultra";
    }

    if (
      value === "high" ||
      value === "hq" ||
      value === "hd"
    ) {
      return "high";
    }

    return "standard";
  }

  function getBridge() {
    if (
      !window.FidelisAIModelBridge
    ) {
      throw new Error(
        "FidelisAIModelBridge belum tersedia."
      );
    }

    return window.FidelisAIModelBridge;
  }

  async function sourceToImageData(
    source
  ) {
    if (!source) {
      throw new Error(
        "Source gambar tidak tersedia."
      );
    }

    /*
     * Jika sudah ImageData.
     */
    if (
      typeof ImageData !== "undefined" &&
      source instanceof ImageData
    ) {
      return source;
    }

    /*
     * HTMLImageElement
     */
    if (
      typeof HTMLImageElement !==
        "undefined" &&
      source instanceof
        HTMLImageElement
    ) {
      await waitImage(source);

      return imageElementToImageData(
        source
      );
    }

    /*
     * Canvas
     */
    if (
      typeof HTMLCanvasElement !==
        "undefined" &&
      source instanceof
        HTMLCanvasElement
    ) {
      const ctx =
        source.getContext(
          "2d",
          {
            willReadFrequently:
              true
          }
        );

      if (!ctx) {
        throw new Error(
          "Canvas context tidak tersedia."
        );
      }

      return ctx.getImageData(
        0,
        0,
        source.width,
        source.height
      );
    }

    /*
     * Blob / File
     */
    if (
      typeof Blob !== "undefined" &&
      source instanceof Blob
    ) {
      const bitmap =
        await createImageBitmap(
          source
        );

      return imageBitmapToImageData(
        bitmap
      );
    }

    /*
     * ImageBitmap
     */
    if (
      typeof ImageBitmap !==
        "undefined" &&
      source instanceof ImageBitmap
    ) {
      return imageBitmapToImageData(
        source
      );
    }

    /*
     * URL / data URL
     */
    if (
      typeof source === "string"
    ) {
      const img =
        await loadImage(
          source
        );

      return imageElementToImageData(
        img
      );
    }

    throw new Error(
      "Format source gambar tidak didukung."
    );
  }

  function waitImage(
    image
  ) {
    return new Promise(
      function (resolve, reject) {
        if (image.complete) {
          if (
            image.naturalWidth > 0
          ) {
            resolve();
          } else {
            reject(
              new Error(
                "Gambar gagal dimuat."
              )
            );
          }

          return;
        }

        image.onload =
          function () {
            resolve();
          };

        image.onerror =
          function () {
            reject(
              new Error(
                "Gambar gagal dimuat."
              )
            );
          };
      }
    );
  }

  function imageElementToImageData(
    image
  ) {
    const width =
      image.naturalWidth ||
      image.width;

    const height =
      image.naturalHeight ||
      image.height;

    if (
      !width ||
      !height
    ) {
      throw new Error(
        "Ukuran gambar tidak valid."
      );
    }

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      width;

    canvas.height =
      height;

    const ctx =
      canvas.getContext(
        "2d",
        {
          willReadFrequently:
            true
        }
      );

    if (!ctx) {
      throw new Error(
        "Canvas context tidak tersedia."
      );
    }

    ctx.drawImage(
      image,
      0,
      0,
      width,
      height
    );

    return ctx.getImageData(
      0,
      0,
      width,
      height
    );
  }

  function imageBitmapToImageData(
    bitmap
  ) {
    const width =
      bitmap.width;

    const height =
      bitmap.height;

    if (
      !width ||
      !height
    ) {
      throw new Error(
        "ImageBitmap tidak valid."
      );
    }

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      width;

    canvas.height =
      height;

    const ctx =
      canvas.getContext(
        "2d",
        {
          willReadFrequently:
            true
        }
      );

    if (!ctx) {
      throw new Error(
        "Canvas context tidak tersedia."
      );
    }

    ctx.drawImage(
      bitmap,
      0,
      0
    );

    return ctx.getImageData(
      0,
      0,
      width,
      height
    );
  }

  function loadImage(
    src
  ) {
    return new Promise(
      function (resolve, reject) {
        const image =
          new Image();

        image.onload =
          function () {
            resolve(image);
          };

        image.onerror =
          function () {
            reject(
              new Error(
                "Gagal memuat gambar."
              )
            );
          };

        image.src =
          src;
      }
    );
  }

  async function ensureReady(
    quality,
    options
  ) {
    const q =
      normalizeQuality(
        quality
      );

    const bridge =
      getBridge();

    console.log(
      "[FIDELIS PIPELINE] Ensuring model:",
      q
    );

    await bridge.createSession(
      q,
      options || {}
    );

    return {
      ready: true,
      quality: q
    };
  }

  async function processImage(
    source,
    quality,
    options
  ) {
    const q =
      normalizeQuality(
        quality
      );

    const bridge =
      getBridge();

    console.log(
      "========================================"
    );

    console.log(
      "[FIDELIS PIPELINE] START"
    );

    console.log(
      "[FIDELIS PIPELINE] Quality:",
      q
    );

    console.log(
      "========================================"
    );

    /*
     * Convert source.
     */
    const imageData =
      await sourceToImageData(
        source
      );

    console.log(
      "[FIDELIS PIPELINE] Source:",
      imageData.width +
        "x" +
        imageData.height
    );

    /*
     * Ensure AI session.
     */
    await ensureReady(
      q,
      options
    );

    /*
     * REAL AI PROCESSING.
     */
    const result =
      await bridge.run(
        imageData,
        q,
        options || {}
      );

    if (!result) {
      throw new Error(
        "AI pipeline tidak menghasilkan result."
      );
    }

    if (
      result.aiProcessed !== true
    ) {
      throw new Error(
        "Pipeline berhenti: hasil bukan AI processing."
      );
    }

    if (
      result.fallback === true
    ) {
      throw new Error(
        "Fallback terdeteksi. FIDELIS tidak menerima fallback."
      );
    }

    if (!result.canvas) {
      throw new Error(
        "AI pipeline tidak menghasilkan canvas."
      );
    }

    console.log(
      "========================================"
    );

    console.log(
      "[FIDELIS PIPELINE] SUCCESS"
    );

    console.log(
      "[FIDELIS PIPELINE] Engine:",
      result.engine
    );

    console.log(
      "[FIDELIS PIPELINE] Scale:",
      result.scale
    );

    console.log(
      "[FIDELIS PIPELINE] Output:",
      result.canvas.width +
        "x" +
        result.canvas.height
    );

    console.log(
      "========================================"
    );

    return {
      ...result,

      quality: q,

      sourceWidth:
        imageData.width,

      sourceHeight:
        imageData.height
    };
  }

  async function preload(
    quality
  ) {
    const q =
      normalizeQuality(
        quality
      );

    return ensureReady(
      q
    );
  }

  function getStatus() {
    try {
      const bridge =
        getBridge();

      return bridge.getStatus();
    } catch (error) {
      return {
        ready: false,
        error:
          error.message
      };
    }
  }

  async function dispose(
    quality
  ) {
    const bridge =
      getBridge();

    return bridge.dispose(
      normalizeQuality(
        quality
      )
    );
  }

  async function disposeAll() {
    const bridge =
      getBridge();

    return bridge.disposeAll();
  }

  window.FidelisAIImagePipeline = {
    processImage,

    process:
      processImage,

    ensureReady,

    preload,

    getStatus,

    dispose,

    disposeAll,

    normalizeQuality
  };

  console.log(
    "%cFIDELIS AI Image Pipeline loaded.",
    "color:#a78bfa;font-weight:bold;"
  );
})();
