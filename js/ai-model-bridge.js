(function () {
  "use strict";

  const sessions = new Map();

  const state = {
    initialized: false,
    error: null
  };

  function normalizeQuality(quality) {
    const q =
      String(
        quality || "standard"
      ).toLowerCase();

    if (
      q === "ultra" ||
      q === "vvip"
    ) {
      return "ultra";
    }

    if (
      q === "high" ||
      q === "hq" ||
      q === "premium"
    ) {
      return "high";
    }

    return "standard";
  }

  function getModel(quality) {
    const q =
      normalizeQuality(quality);

    try {
      if (
        window.FidelisRealESRGAN &&
        typeof window.FidelisRealESRGAN.get ===
          "function"
      ) {
        const model =
          window.FidelisRealESRGAN.get(q);

        if (model) {
          return model;
        }
      }
    } catch (error) {
      console.warn(
        "[FIDELIS] RealESRGAN model config error:",
        error
      );
    }

    try {
      if (
        window.FidelisModelRegistry &&
        typeof window.FidelisModelRegistry.get ===
          "function"
      ) {
        const model =
          window.FidelisModelRegistry.get(q);

        if (model) {
          return model;
        }
      }
    } catch (error) {}

    try {
      if (
        window.FidelisAIModelConfig &&
        typeof window.FidelisAIModelConfig.get ===
          "function"
      ) {
        const model =
          window.FidelisAIModelConfig.get(q);

        if (model) {
          return model;
        }
      }
    } catch (error) {}

    return null;
  }

  function getModelURL(quality) {
    const q =
      normalizeQuality(quality);

    const model =
      getModel(q);

    if (
      model &&
      model.url
    ) {
      return model.url;
    }

    try {
      if (
        window.FidelisModelURL &&
        typeof window.FidelisModelURL.get ===
          "function"
      ) {
        return (
          window.FidelisModelURL.get(q)
        );
      }
    } catch (error) {}

    return null;
  }

  function checkTier(model) {
    if (!model) {
      throw new Error(
        "Model AI tidak ditemukan."
      );
    }

    if (
      model.tier === "vvip"
    ) {
      const tierManager =
        window.FidelisTierManager;

      let allowed = false;

      try {
        if (
          tierManager &&
          typeof tierManager.isVVIP ===
            "function"
        ) {
          allowed =
            tierManager.isVVIP();
        }
      } catch (error) {}

      if (!allowed) {
        throw new Error(
          "FIDELIS Ultra hanya tersedia untuk tier VVIP."
        );
      }
    }

    return true;
  }

  async function init() {
    if (state.initialized) {
      return true;
    }

    if (
      !window.FidelisRuntime
    ) {
      throw new Error(
        "FIDELIS Runtime belum tersedia."
      );
    }

    await window.FidelisRuntime.init();

    state.initialized = true;

    return true;
  }

  async function loadBinary(
    quality,
    options = {}
  ) {
    const q =
      normalizeQuality(quality);

    const model =
      getModel(q);

    if (!model) {
      throw new Error(
        `Model ${q} tidak ditemukan.`
      );
    }

    checkTier(model);

    const url =
      getModelURL(q);

    if (!url) {
      throw new Error(
        `URL model ${q} belum dikonfigurasi.`
      );
    }

    /*
     * V2 loader adalah loader utama.
     */

    if (
      window.FidelisModelLoaderV2 &&
      typeof window.FidelisModelLoaderV2.load ===
        "function"
    ) {
      return await window.FidelisModelLoaderV2.load(
        q,
        options
      );
    }

    /*
     * Fallback ke loader lama.
     */

    if (
      window.FidelisModelLoader &&
      typeof window.FidelisModelLoader.load ===
        "function"
    ) {
      return await window.FidelisModelLoader.load(
        q,
        options
      );
    }

    /*
     * Last resort: fetch langsung.
     */

    const response =
      await fetch(url, {
        cache: "force-cache"
      });

    if (!response.ok) {
      throw new Error(
        `Model ${q} gagal di-download. HTTP ${response.status}.`
      );
    }

    return await response.arrayBuffer();
  }

  async function createSession(
    quality,
    options = {}
  ) {
    const q =
      normalizeQuality(quality);

    if (
      sessions.has(q) &&
      options.forceReload !== true
    ) {
      return sessions.get(q);
    }

    await init();

    const model =
      getModel(q);

    if (!model) {
      throw new Error(
        `Model ${q} tidak tersedia.`
      );
    }

    checkTier(model);

    try {
      console.log(
        `[FIDELIS] Loading model ${q}...`
      );

      const binary =
        await loadBinary(
          q,
          {
            onProgress:
              options.onProgress
          }
        );

      if (!binary) {
        throw new Error(
          "Binary model kosong."
        );
      }

      if (
        !window.FidelisAIInference ||
        typeof window.FidelisAIInference.loadModel !==
          "function"
      ) {
        throw new Error(
          "AI Inference module belum tersedia."
        );
      }

      const session =
        await window.FidelisAIInference.loadModel(
          binary,
          model
        );

      sessions.set(
        q,
        session
      );

      console.log(
        `[FIDELIS] Session ${q} siap.`
      );

      return session;
    } catch (error) {
      state.error = error;

      console.error(
        `[FIDELIS] Gagal membuat session ${q}:`,
        error
      );

      throw new Error(
        `Model ${q} gagal dijalankan: ${
          error.message || error
        }`
      );
    }
  }

  async function run(
    imageData,
    quality = "standard",
    options = {}
  ) {
    const q =
      normalizeQuality(quality);

    if (
      !imageData ||
      !imageData.data
    ) {
      throw new Error(
        "ImageData untuk inference tidak valid."
      );
    }

    const model =
      getModel(q);

    if (!model) {
      throw new Error(
        `Model ${q} tidak ditemukan.`
      );
    }

    checkTier(model);

    /*
     * Pastikan session tersedia.
     */

    await createSession(
      q,
      options
    );

    /*
     * AIInference menyimpan session aktif.
     */

    const result =
      await window.FidelisAIInference.run(
        imageData,
        options
      );

    if (
      !result ||
      !result.tensor
    ) {
      throw new Error(
        "Inference tidak menghasilkan tensor."
      );
    }

    const canvas =
      window.FidelisAIInference.tensorToCanvas(
        result.tensor,
        {
          model
        }
      );

    if (
      !canvas ||
      !canvas.width ||
      !canvas.height
    ) {
      throw new Error(
        "Output AI menghasilkan canvas kosong."
      );
    }

    return {
      canvas,

      width:
        canvas.width,

      height:
        canvas.height,

      scale:
        Number(model.scale) || 2,

      model,

      quality: q,

      aiProcessed: true,

      fallback: false,

      engine:
        "Real-ESRGAN",

      backend:
        window.FidelisRuntime &&
        typeof window.FidelisRuntime.getBackend ===
          "function"
          ? window.FidelisRuntime.getBackend()
          : null,

      inputShape:
        result.inputShape ||
        null,

      outputShape:
        result.shape ||
        null
    };
  }

  function dispose(
    quality
  ) {
    const q =
      normalizeQuality(quality);

    sessions.delete(q);

    /*
     * AIInference menggunakan session aktif.
     * Jangan release global runtime di sini.
     */

    if (
      sessions.size === 0 &&
      window.FidelisAIInference &&
      typeof window.FidelisAIInference.disposeSession ===
        "function"
    ) {
      try {
        window.FidelisAIInference.disposeSession();
      } catch (error) {
        console.warn(
          "[FIDELIS] Inference dispose error:",
          error
        );
      }
    }
  }

  function disposeAll() {
    sessions.clear();

    if (
      window.FidelisAIInference &&
      typeof window.FidelisAIInference.disposeSession ===
        "function"
    ) {
      try {
        window.FidelisAIInference.disposeSession();
      } catch (error) {
        console.warn(
          "[FIDELIS] Dispose all error:",
          error
        );
      }
    }
  }

  function getStatus() {
    const models = {};

    [
      "standard",
      "high",
      "ultra"
    ].forEach(q => {
      const model =
        getModel(q);

      models[q] = {
        configured:
          !!getModelURL(q),

        model:
          model || null,

        session:
          sessions.has(q)
      };
    });

    return {
      initialized:
        state.initialized,

      sessions:
        sessions.size,

      models,

      runtime:
        window.FidelisRuntime &&
        typeof window.FidelisRuntime.getStatus ===
          "function"
          ? window.FidelisRuntime.getStatus()
          : null,

      inference:
        window.FidelisAIInference &&
        typeof window.FidelisAIInference.getStatus ===
          "function"
          ? window.FidelisAIInference.getStatus()
          : null,

      error:
        state.error
          ? state.error.message ||
            String(state.error)
          : null
    };
  }

  window.FidelisAIModelBridge = {
    normalizeQuality,

    getModel,
    getModelURL,

    init,
    loadBinary,
    createSession,

    run,

    dispose,
    disposeAll,

    getStatus
  };

  console.log(
    "[FIDELIS] AI Model Bridge loaded."
  );
})();
