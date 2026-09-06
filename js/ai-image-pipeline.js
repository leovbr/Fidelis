(function () {
  "use strict";

  /*
   * FIDELIS AI IMAGE PIPELINE
   *
   * Flow:
   * ImageData
   *   ↓
   * Model Bridge
   *   ↓
   * Real-ESRGAN ONNX
   *   ↓
   * Canvas
   */

  let activeQuality = "standard";
  let processing = false;

  function normalizeQuality(quality) {
    const q = String(
      quality || "standard"
    ).toLowerCase();

    if (
      q === "basic" ||
      q === "free"
    ) {
      return "standard";
    }

    if (
      q === "premium"
    ) {
      return "high";
    }

    if (
      q === "4x" ||
      q === "4×"
    ) {
      return "ultra";
    }

    if (
      q !== "standard" &&
      q !== "high" &&
      q !== "ultra"
    ) {
      return "standard";
    }

    return q;
  }


  function getBridge() {
    if (
      !window.FidelisAIModelBridge
    ) {
      throw new Error(
        "FidelisAIModelBridge belum tersedia."
      );
    }

    if (
      typeof window.FidelisAIModelBridge.run !==
      "function"
    ) {
      throw new Error(
        "FidelisAIModelBridge.run tidak tersedia."
      );
    }

    return window.FidelisAIModelBridge;
  }


  function getModel(quality) {
    const bridge =
      getBridge();

    if (
      typeof bridge.getModel !==
      "function"
    ) {
      throw new Error(
        "FidelisAIModelBridge.getModel tidak tersedia."
      );
    }

    return bridge.getModel(
      normalizeQuality(
        quality
      )
    );
  }


  async function ensureReady(
    quality = "standard",
    options = {}
  ) {
    const q =
      normalizeQuality(
        quality
      );

    const bridge =
      getBridge();

    /*
     * If session already exists,
     * don't download/load again.
     */
    if (
      typeof bridge.getSession ===
        "function"
    ) {
      const existing =
        bridge.getSession(q);

      if (existing) {
        activeQuality = q;

        return {
          ready: true,
          quality: q,
          session: existing,
          alreadyLoaded: true
        };
      }
    }

    /*
     * Lazy initialization.
     *
     * The model is loaded here,
     * only when Enhance is actually used.
     */
    if (
      typeof bridge.createSession !==
      "function"
    ) {
      throw new Error(
        "FidelisAIModelBridge.createSession tidak tersedia."
      );
    }

    console.log(
      `[FIDELIS] Preparing ${q} AI pipeline...`
    );

    const session =
      await bridge.createSession(
        q,
        {
          onProgress:
            options.onProgress,

          signal:
            options.signal
        }
      );

    if (!session) {
      throw new Error(
        `AI session ${q} gagal dibuat.`
      );
    }

    activeQuality =
      q;

    console.log(
      `[FIDELIS] ${q} AI pipeline ready.`
    );

    return {
      ready: true,
      quality: q,
      session,
      alreadyLoaded: false
    };
  }


  function imageToImageData(
    source
  ) {
    if (
      !source
    ) {
      throw new Error(
        "Source image kosong."
      );
    }

    if (
      source instanceof ImageData
    ) {
      return source;
    }

    if (
      source instanceof HTMLCanvasElement
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

    if (
      source instanceof HTMLImageElement ||
      source instanceof HTMLVideoElement
    ) {
      const width =
        source.videoWidth ||
        source.naturalWidth ||
        source.width;

      const height =
        source.videoHeight ||
        source.naturalHeight ||
        source.height;

      if (
        !width ||
        !height
      ) {
        throw new Error(
          "Ukuran media tidak valid."
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
        source,
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

    throw new Error(
      "Format image source tidak didukung."
    );
  }


  async function processImage(
    source,
    quality = "standard",
    options = {}
  ) {
    if (
      processing
    ) {
      throw new Error(
        "AI sedang memproses gambar."
      );
    }

    processing =
      true;

    const q =
      normalizeQuality(
        quality
      );

    try {
      /*
       * Convert source into ImageData.
       */
      const imageData =
        imageToImageData(
          source
        );

      if (
        !imageData ||
        !imageData.width ||
        !imageData.height
      ) {
        throw new Error(
          "ImageData tidak valid."
        );
      }

      console.log(
        "[FIDELIS] Input image:",
        imageData.width,
        "x",
        imageData.height
      );

      /*
       * Load runtime + model + ONNX session.
       */
      await ensureReady(
        q,
        options
      );

      /*
       * Run actual AI inference.
       */
      const bridge =
        getBridge();

      const result =
        await bridge.run(
          imageData,
          q,
          options
        );

      if (
        !result
      ) {
        throw new Error(
          "AI pipeline tidak menghasilkan result."
        );
      }

      if (
        result.fallback
      ) {
        throw new Error(
          "AI fallback terdeteksi. FIDELIS membutuhkan AI inference nyata."
        );
      }

      if (
        result.aiProcessed !==
        true
      ) {
        throw new Error(
          "AI inference tidak terkonfirmasi."
        );
      }

      if (
        !result.canvas
      ) {
        throw new Error(
          "AI tidak menghasilkan canvas."
        );
      }

      console.log(
        "[FIDELIS] AI processing complete."
      );

      console.log(
        "[FIDELIS] Output:",
        result.canvas.width,
        "x",
        result.canvas.height
      );

      return {
        ...result,

        quality:
          q,

        aiProcessed:
          true,

        fallback:
          false,

        engine:
          result.engine ||
          "Real-ESRGAN ONNX",

        inputWidth:
          imageData.width,

        inputHeight:
          imageData.height,

        outputWidth:
          result.canvas.width,

        outputHeight:
          result.canvas.height
      };

    } finally {
      processing =
        false;
    }
  }


  function getStatus() {
    let bridgeStatus =
      null;

    try {
      const bridge =
        getBridge();

      if (
        typeof bridge.getStatus ===
        "function"
      ) {
        bridgeStatus =
          bridge.getStatus();
      }
    } catch (error) {
      bridgeStatus =
        null;
    }

    return {
      ready:
        !!bridgeStatus &&
        bridgeStatus.count > 0,

      processing,

      activeQuality,

      bridge:
        bridgeStatus
    };
  }


  async function preload(
    quality = "standard",
    options = {}
  ) {
    return await ensureReady(
      quality,
      options
    );
  }


  async function dispose(
    quality
  ) {
    const bridge =
      getBridge();

    if (
      typeof bridge.dispose !==
      "function"
    ) {
      return false;
    }

    return await bridge.dispose(
      normalizeQuality(
        quality
      )
    );
  }


  async function disposeAll() {
    const bridge =
      getBridge();

    if (
      typeof bridge.disposeAll !==
      "function"
    ) {
      return false;
    }

    return await bridge.disposeAll();
  }


  window.FidelisAIImagePipeline = {
    processImage,
    ensureReady,
    preload,
    getStatus,
    dispose,
    disposeAll,
    normalizeQuality
  };


  console.log(
    "[FIDELIS] AI Image Pipeline V3 loaded."
  );
})();
