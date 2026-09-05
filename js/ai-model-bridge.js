(function () {
  "use strict";

  const sessions = new Map();
  const loading = new Map();

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


  function getModel(quality) {
    const q =
      normalizeQuality(quality);

    let model = null;


    if (
      window.FidelisRealESRGAN &&
      typeof window.FidelisRealESRGAN.get ===
        "function"
    ) {
      model =
        window.FidelisRealESRGAN.get(q);
    }


    if (
      !model &&
      window.FidelisModelRegistry &&
      typeof window.FidelisModelRegistry.get ===
        "function"
    ) {
      model =
        window.FidelisModelRegistry.get(q);
    }


    if (
      !model &&
      window.FidelisAIModelConfig &&
      typeof window.FidelisAIModelConfig.get ===
        "function"
    ) {
      model =
        window.FidelisAIModelConfig.get(q);
    }


    if (!model) {
      throw new Error(
        `Model ${q} tidak ditemukan.`
      );
    }


    return {
      ...model,
      quality: q,
      scale:
        Number(
          model.scale || 2
        )
    };
  }


  function getModelURL(quality) {
    const model =
      getModel(quality);

    if (model.url) {
      return model.url;
    }


    if (
      window.FidelisModelURL &&
      typeof window.FidelisModelURL.get ===
        "function"
    ) {
      const url =
        window.FidelisModelURL.get(
          quality
        );

      if (url) {
        return url;
      }
    }


    if (
      window.FidelisModelRegistry &&
      typeof window.FidelisModelRegistry.getURL ===
        "function"
    ) {
      const url =
        window.FidelisModelRegistry.getURL(
          quality
        );

      if (url) {
        return url;
      }
    }


    return null;
  }


  function checkTier(model) {
    if (
      !model ||
      model.tier !== "vvip"
    ) {
      return true;
    }


    if (
      window.FidelisTier &&
      typeof window.FidelisTier.canUse ===
        "function"
    ) {
      return !!window.FidelisTier.canUse(
        "ultra"
      );
    }


    if (
      window.FidelisTierManager &&
      typeof window.FidelisTierManager.canUse ===
        "function"
    ) {
      return !!window.FidelisTierManager.canUse(
        "ultra"
      );
    }


    /*
     * Untuk development/testing,
     * jangan blok Standard/High.
     */
    return true;
  }


  async function initRuntime() {
    if (
      !window.FidelisRuntime
    ) {
      throw new Error(
        "FidelisRuntime tidak tersedia."
      );
    }


    if (
      typeof window.FidelisRuntime.init !==
      "function"
    ) {
      throw new Error(
        "FidelisRuntime.init tidak tersedia."
      );
    }


    return await window.FidelisRuntime.init();
  }


  async function loadBinary(
    quality,
    options = {}
  ) {
    const q =
      normalizeQuality(quality);


    /*
     * Prefer V2 loader.
     */
    if (
      window.FidelisModelLoaderV2 &&
      typeof window.FidelisModelLoaderV2.load ===
        "function"
    ) {
      return await window.FidelisModelLoaderV2.load(
        q,
        {
          onProgress:
            options.onProgress,

          signal:
            options.signal
        }
      );
    }


    /*
     * Legacy loader.
     */
    if (
      window.FidelisModelLoader &&
      typeof window.FidelisModelLoader.load ===
        "function"
    ) {
      return await window.FidelisModelLoader.load(
        q,
        {
          onProgress:
            options.onProgress,

          signal:
            options.signal
        }
      );
    }


    /*
     * Last-resort direct fetch.
     */
    const url =
      getModelURL(q);


    if (!url) {
      throw new Error(
        `URL model ${q} belum dikonfigurasi.`
      );
    }


    const response =
      await fetch(
        url,
        {
          cache:
            "force-cache",

          signal:
            options.signal
        }
      );


    if (!response.ok) {
      throw new Error(
        `Model request gagal: HTTP ${response.status}`
      );
    }


    return await response.arrayBuffer();
  }


  async function createSession(
    quality = "standard",
    options = {}
  ) {
    const q =
      normalizeQuality(quality);


    /*
     * Return existing session.
     */
    if (
      sessions.has(q)
    ) {
      const existing =
        sessions.get(q);

      return existing.session;
    }


    /*
     * Share concurrent loading.
     */
    if (
      loading.has(q)
    ) {
      return await loading.get(q);
    }


    const promise =
      (async () => {
        const model =
          getModel(q);


        if (
          !checkTier(model)
        ) {
          throw new Error(
            `${q} membutuhkan akses VVIP.`
          );
        }


        const url =
          getModelURL(q);


        if (!url) {
          throw new Error(
            `URL model ${q} belum tersedia.`
          );
        }


        await initRuntime();


        console.log(
          `[FIDELIS] Loading ${q} model...`
        );


        const modelData =
          await loadBinary(
            q,
            {
              onProgress:
                options.onProgress,

              signal:
                options.signal
            }
          );


        if (
          !modelData ||
          !modelData.byteLength
        ) {
          throw new Error(
            `Binary model ${q} kosong.`
          );
        }


        console.log(
          `[FIDELIS] Model ${q} loaded:`,
          Math.round(
            modelData.byteLength /
              1024 /
              1024 *
              10
          ) / 10,
          "MB"
        );


        /*
         * IMPORTANT:
         *
         * We create the ONNX session here,
         * then store the actual session per quality.
         *
         * This prevents Standard/High
         * session collisions.
         */
        if (
          !window.FidelisRuntime ||
          typeof window.FidelisRuntime.createSession !==
            "function"
        ) {
          throw new Error(
            "FidelisRuntime.createSession tidak tersedia."
          );
        }


        const session =
          await window.FidelisRuntime.createSession(
            modelData,
            {
              model
            }
          );


        if (!session) {
          throw new Error(
            `ONNX session ${q} gagal dibuat.`
          );
        }


        const info = {
          quality: q,
          model,
          session,
          createdAt:
            Date.now(),

          inputNames:
            Array.from(
              session.inputNames ||
                []
            ),

          outputNames:
            Array.from(
              session.outputNames ||
                []
            ),

          inputMetadata:
            session.inputMetadata ||
            null,

          outputMetadata:
            session.outputMetadata ||
            null,

          backend:
            window.FidelisRuntime &&
            typeof window.FidelisRuntime.getBackend ===
              "function"
              ? window.FidelisRuntime.getBackend()
              : null
        };


        sessions.set(
          q,
          info
        );


        console.log(
          `[FIDELIS] ${q} session ready.`
        );

        console.log(
          "[FIDELIS] Input:",
          info.inputNames
        );

        console.log(
          "[FIDELIS] Output:",
          info.outputNames
        );


        return session;
      })();


    loading.set(
      q,
      promise
    );


    try {
      return await promise;
    } finally {
      loading.delete(q);
    }
  }


  async function run(
    imageData,
    quality = "standard",
    options = {}
  ) {
    const q =
      normalizeQuality(quality);


    if (!imageData) {
      throw new Error(
        "ImageData kosong."
      );
    }


    /*
     * Ensure session exists.
     */
    const session =
      sessions.has(q)
        ? sessions.get(q).session
        : await createSession(
            q,
            options
          );


    if (!session) {
      throw new Error(
        `Session ${q} tidak tersedia.`
      );
    }


    const info =
      sessions.get(q);


    const model =
      info &&
      info.model
        ? info.model
        : getModel(q);


    /*
     * IMPORTANT:
     *
     * Do NOT call the global
     * FidelisAIInference.run()
     * because that can use another
     * quality's session.
     *
     * We create the tensor and execute
     * THIS session directly.
     */
    if (
      !window.FidelisAIInference
    ) {
      throw new Error(
        "FidelisAIInference tidak tersedia."
      );
    }


    if (
      typeof window.FidelisAIInference.imageToTensor !==
      "function"
    ) {
      throw new Error(
        "FidelisAIInference.imageToTensor tidak tersedia."
      );
    }


    const tensor =
      window.FidelisAIInference.imageToTensor(
        imageData,
        model
      );


    const inputName =
      info &&
      info.inputNames &&
      info.inputNames.length
        ? info.inputNames[0]
        : session.inputNames[0];


    const outputName =
      info &&
      info.outputNames &&
      info.outputNames.length
        ? info.outputNames[0]
        : session.outputNames[0];


    if (!inputName) {
      throw new Error(
        `Model ${q} tidak mempunyai input name.`
      );
    }


    if (!outputName) {
      throw new Error(
        `Model ${q} tidak mempunyai output name.`
      );
    }


    const feeds = {};

    feeds[inputName] =
      tensor;


    console.log(
      `[FIDELIS] ${q} inference`
    );

    console.log(
      "[FIDELIS] Input shape:",
      tensor.dims
    );


    const started =
      performance.now();


    const outputs =
      await session.run(
        feeds
      );


    const elapsed =
      performance.now() -
      started;


    const output =
      outputs[outputName];


    if (!output) {
      throw new Error(
        `Model ${q} tidak menghasilkan output.`
      );
    }


    console.log(
      "[FIDELIS] Output shape:",
      output.dims
    );


    console.log(
      `[FIDELIS] Inference time: ${Math.round(elapsed)} ms`
    );


    /*
     * Convert output using the same model
     * configuration.
     */
    const canvas =
      window.FidelisAIInference.tensorToCanvas(
        output,
        {
          model
        }
      );


    if (!canvas) {
      throw new Error(
        "Output canvas gagal dibuat."
      );
    }


    return {
      canvas,

      width:
        canvas.width,

      height:
        canvas.height,

      scale:
        model.scale,

      model,

      quality: q,

      aiProcessed:
        true,

      fallback:
        false,

      engine:
        "Real-ESRGAN ONNX",

      backend:
        info.backend,

      inputShape:
        Array.from(
          tensor.dims
        ),

      outputShape:
        Array.from(
          output.dims
        ),

      inferenceTime:
        Math.round(
          elapsed
        )
    };
  }


  function getSession(
    quality
  ) {
    const q =
      normalizeQuality(quality);

    const info =
      sessions.get(q);

    return info
      ? info.session
      : null;
  }


  function getStatus() {
    const models = {};

    for (
      const [
        quality,
        info
      ] of sessions.entries()
    ) {
      models[quality] = {
        loaded:
          true,

        createdAt:
          info.createdAt,

        inputNames:
          info.inputNames,

        outputNames:
          info.outputNames,

        inputMetadata:
          info.inputMetadata,

        outputMetadata:
          info.outputMetadata,

        backend:
          info.backend
      };
    }


    return {
      loadedSessions:
        Object.keys(models),

      loading:
        Array.from(
          loading.keys()
        ),

      count:
        sessions.size,

      models
    };
  }


  async function dispose(
    quality
  ) {
    const q =
      normalizeQuality(quality);


    const info =
      sessions.get(q);


    if (!info) {
      return false;
    }


    try {
      if (
        info.session &&
        typeof info.session.release ===
          "function"
      ) {
        await info.session.release();
      }
    } catch (error) {
      console.warn(
        `[FIDELIS] Failed releasing ${q} session:`,
        error
      );
    }


    sessions.delete(q);

    return true;
  }


  async function disposeAll() {
    const qualities =
      Array.from(
        sessions.keys()
      );


    for (
      const quality of qualities
    ) {
      await dispose(
        quality
      );
    }


    sessions.clear();

    return true;
  }


  function clear() {
    sessions.clear();
    loading.clear();
  }


  window.FidelisAIModelBridge = {
    createSession,
    run,
    getSession,
    getModel,
    getModelURL,
    getStatus,
    dispose,
    disposeAll,
    clear
  };


  console.log(
    "[FIDELIS] AI Model Bridge V2 loaded."
  );
})();
