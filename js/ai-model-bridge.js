(function () {
  "use strict";

  /*
   * FIDELIS AI MODEL BRIDGE
   * ------------------------
   * Direct proven path:
   *
   * Model URL
   *   ↓
   * fetch()
   *   ↓
   * ArrayBuffer
   *   ↓
   * ONNX Runtime Web
   *   ↓
   * WebGPU
   *   ↓
   * InferenceSession
   *
   * Tidak menggunakan ModelLoaderV2 untuk jalur utama.
   */

  const sessions = new Map();
  const modelBuffers = new Map();
  const loading = new Map();

  function normalizeQuality(quality) {
    const value = String(quality || "standard").toLowerCase();

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

  function getModel(quality) {
    const q = normalizeQuality(quality);

    try {
      if (
        window.FidelisRealESRGAN &&
        typeof window.FidelisRealESRGAN.get === "function"
      ) {
        const model = window.FidelisRealESRGAN.get(q);

        if (model) {
          return { ...model };
        }
      }
    } catch (error) {
      console.warn("[FIDELIS] RealESRGAN config error:", error);
    }

    try {
      if (
        window.FidelisModelRegistry &&
        typeof window.FidelisModelRegistry.get === "function"
      ) {
        const model = window.FidelisModelRegistry.get(q);

        if (model) {
          return { ...model };
        }
      }
    } catch (error) {
      console.warn("[FIDELIS] Model registry error:", error);
    }

    try {
      if (
        window.FidelisAIModelConfig &&
        typeof window.FidelisAIModelConfig.get === "function"
      ) {
        const model = window.FidelisAIModelConfig.get(q);

        if (model) {
          return { ...model };
        }
      }
    } catch (error) {
      console.warn("[FIDELIS] AI model config error:", error);
    }

    return null;
  }

  function getModelURL(quality) {
    const q = normalizeQuality(quality);

    const model = getModel(q);

    if (model && model.url) {
      return model.url;
    }

    try {
      if (
        window.FidelisModelURL &&
        typeof window.FidelisModelURL.get === "function"
      ) {
        const url = window.FidelisModelURL.get(q);

        if (url) {
          return url;
        }
      }
    } catch (error) {
      console.warn("[FIDELIS] Model URL error:", error);
    }

    try {
      if (
        window.FidelisModelRegistry &&
        typeof window.FidelisModelRegistry.getURL === "function"
      ) {
        const url = window.FidelisModelRegistry.getURL(q);

        if (url) {
          return url;
        }
      }
    } catch (error) {
      console.warn("[FIDELIS] Registry URL error:", error);
    }

    try {
      if (
        window.FidelisRealESRGAN &&
        typeof window.FidelisRealESRGAN.getURL === "function"
      ) {
        const url = window.FidelisRealESRGAN.getURL(q);

        if (url) {
          return url;
        }
      }
    } catch (error) {
      console.warn("[FIDELIS] RealESRGAN URL error:", error);
    }

    return null;
  }

  function checkUltraAccess(quality) {
    const q = normalizeQuality(quality);

    if (q !== "ultra") {
      return true;
    }

    try {
      if (
        window.FidelisTierManager &&
        typeof window.FidelisTierManager.canUse === "function"
      ) {
        return Boolean(
          window.FidelisTierManager.canUse("ultra")
        );
      }
    } catch (_) {}

    /*
     * Jika tier manager tidak tersedia,
     * jangan memblokir engine saat testing.
     */
    return true;
  }

  async function ensureRuntime() {
    if (
      !window.FidelisRuntime ||
      typeof window.FidelisRuntime.init !== "function"
    ) {
      throw new Error(
        "FidelisRuntime tidak tersedia."
      );
    }

    await window.FidelisRuntime.init();

    if (
      !window.ort ||
      !window.ort.InferenceSession ||
      !window.ort.Tensor
    ) {
      throw new Error(
        "ONNX Runtime Web belum tersedia."
      );
    }

    return window.ort;
  }

  async function fetchModel(url, quality) {
    const q = normalizeQuality(quality);

    if (modelBuffers.has(q)) {
      console.log(
        "[FIDELIS] Model buffer cache hit:",
        q
      );

      return modelBuffers.get(q);
    }

    console.log(
      "[FIDELIS] Downloading model:",
      q
    );

    console.log(
      "[FIDELIS] URL:",
      url
    );

    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      redirect: "follow",
      credentials: "omit",
      headers: {
        Accept: "application/octet-stream"
      }
    });

    if (!response.ok) {
      throw new Error(
        "Model fetch HTTP " +
        response.status +
        " " +
        response.statusText
      );
    }

    const contentLength =
      response.headers.get("content-length");

    if (contentLength) {
      console.log(
        "[FIDELIS] Content-Length:",
        contentLength
      );
    }

    let buffer;

    /*
     * Gunakan stream jika tersedia agar progress
     * dapat dilihat di console.
     */
    if (
      response.body &&
      typeof response.body.getReader === "function"
    ) {
      const reader = response.body.getReader();

      const chunks = [];
      let received = 0;

      while (true) {
        const result = await reader.read();

        if (result.done) {
          break;
        }

        if (result.value) {
          chunks.push(result.value);
          received += result.value.byteLength;

          if (contentLength) {
            const total = Number(contentLength);

            if (total > 0) {
              const percent =
                Math.round(
                  (received / total) * 100
                );

              if (
                percent % 10 === 0
              ) {
                console.log(
                  "[FIDELIS] Model download:",
                  percent + "%"
                );
              }
            }
          }
        }
      }

      const totalLength = chunks.reduce(
        (sum, chunk) =>
          sum + chunk.byteLength,
        0
      );

      const merged =
        new Uint8Array(totalLength);

      let offset = 0;

      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }

      buffer = merged.buffer;
    } else {
      buffer = await response.arrayBuffer();
    }

    if (!(buffer instanceof ArrayBuffer)) {
      throw new Error(
        "Model data bukan ArrayBuffer."
      );
    }

    if (buffer.byteLength < 1024) {
      throw new Error(
        "Model terlalu kecil / data tidak valid."
      );
    }

    console.log(
      "[FIDELIS] Model downloaded:",
      (
        buffer.byteLength /
        1024 /
        1024
      ).toFixed(2) + " MB"
    );

    modelBuffers.set(q, buffer);

    return buffer;
  }

  async function createSession(
    quality,
    options
  ) {
    const q = normalizeQuality(quality);

    if (sessions.has(q)) {
      console.log(
        "[FIDELIS] Session cache hit:",
        q
      );

      return sessions.get(q);
    }

    if (loading.has(q)) {
      console.log(
        "[FIDELIS] Waiting existing load:",
        q
      );

      return loading.get(q);
    }

    if (!checkUltraAccess(q)) {
      throw new Error(
        "FIDELIS Ultra membutuhkan akses VVIP."
      );
    }

    const promise = (async function () {
      const model = getModel(q);

      if (!model) {
        throw new Error(
          "Model " +
          q +
          " tidak ditemukan."
        );
      }

      const url = getModelURL(q);

      if (!url) {
        throw new Error(
          "URL model " +
          q +
          " tidak tersedia."
        );
      }

      console.log(
        "========================================"
      );

      console.log(
        "[FIDELIS] Creating AI session"
      );

      console.log(
        "[FIDELIS] Quality:",
        q
      );

      console.log(
        "[FIDELIS] Model:",
        model.name || model.id
      );

      console.log(
        "[FIDELIS] Scale:",
        model.scale
      );

      console.log(
        "[FIDELIS] URL:",
        url
      );

      console.log(
        "========================================"
      );

      const ort =
        await ensureRuntime();

      /*
       * Direct fetch path.
       * Ini sengaja dibuat sama dengan
       * Direct ONNX Test yang sudah SUCCESS.
       */
      const modelData =
        await fetchModel(url, q);

      console.log(
        "[FIDELIS] Creating InferenceSession..."
      );

      const sessionStart =
        performance.now();

      let session;

      try {
        session =
          await ort.InferenceSession.create(
            modelData,
            {
              executionProviders: [
                "webgpu"
              ],
              graphOptimizationLevel:
                "all"
            }
          );
      } catch (directError) {
        console.error(
          "[FIDELIS] Direct WebGPU session failed:",
          directError
        );

        /*
         * Jika runtime punya session creator,
         * coba fallback internal.
         */
        if (
          window.FidelisRuntime &&
          typeof window.FidelisRuntime.createSession ===
            "function"
        ) {
          console.warn(
            "[FIDELIS] Trying runtime session fallback..."
          );

          try {
            session =
              await window.FidelisRuntime.createSession(
                modelData,
                {
                  model
                }
              );
          } catch (runtimeError) {
            throw new Error(
              "Gagal membuat ONNX session.\n" +
              "Direct WebGPU: " +
              directError.message +
              "\nRuntime fallback: " +
              runtimeError.message
            );
          }
        } else {
          throw directError;
        }
      }

      const sessionTime =
        performance.now() -
        sessionStart;

      if (!session) {
        throw new Error(
          "InferenceSession gagal dibuat."
        );
      }

      console.log(
        "[FIDELIS] Session created in:",
        Math.round(sessionTime) +
          " ms"
      );

      console.log(
        "[FIDELIS] Inputs:",
        session.inputNames
      );

      console.log(
        "[FIDELIS] Outputs:",
        session.outputNames
      );

      /*
       * Metadata model dibuat eksplisit supaya
       * inference pipeline tahu format input/output.
       */
      const normalizedModel = {
        ...model,

        quality: q,

        scale:
          Number(model.scale) || 2,

        inputLayout:
          model.inputLayout ||
          "NCHW",

        inputColor:
          model.inputColor ||
          "RGB",

        inputRange:
          model.inputRange ||
          "0..1",

        outputLayout:
          model.outputLayout ||
          "NCHW",

        outputColor:
          model.outputColor ||
          "RGB",

        outputRange:
          model.outputRange ||
          "0..1"
      };

      sessions.set(q, {
        session,
        model: normalizedModel,
        modelData,
        url
      });

      return sessions.get(q);
    })();

    loading.set(q, promise);

    try {
      return await promise;
    } finally {
      loading.delete(q);
    }
  }

  async function getSession(
    quality,
    options
  ) {
    const q = normalizeQuality(quality);

    const cached =
      sessions.get(q);

    if (cached) {
      return cached.session;
    }

    const created =
      await createSession(
        q,
        options
      );

    return created.session;
  }

  async function run(
    imageData,
    quality,
    options
  ) {
    const q =
      normalizeQuality(quality);

    if (!imageData) {
      throw new Error(
        "ImageData tidak tersedia."
      );
    }

    const entry =
      sessions.get(q) ||
      await createSession(
        q,
        options
      );

    const session =
      entry.session;

    const model =
      entry.model;

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
        "imageToTensor tidak tersedia."
      );
    }

    if (
      typeof window.FidelisAIInference.tensorToCanvas !==
      "function"
    ) {
      throw new Error(
        "tensorToCanvas tidak tersedia."
      );
    }

    console.log(
      "[FIDELIS] Preparing tensor..."
    );

    const tensor =
      await window.FidelisAIInference.imageToTensor(
        imageData,
        model,
        options || {}
      );

    if (!tensor) {
      throw new Error(
        "Input tensor gagal dibuat."
      );
    }

    const inputName =
      session.inputNames &&
      session.inputNames.length
        ? session.inputNames[0]
        : "input";

    const feeds = {};

    feeds[inputName] =
      tensor;

    console.log(
      "[FIDELIS] Running inference..."
    );

    const inferenceStart =
      performance.now();

    const outputs =
      await session.run(
        feeds
      );

    const inferenceTime =
      performance.now() -
      inferenceStart;

    console.log(
      "[FIDELIS] Inference completed:",
      Math.round(inferenceTime) +
        " ms"
    );

    if (!outputs) {
      throw new Error(
        "ONNX tidak menghasilkan output."
      );
    }

    let outputTensor = null;

    const outputName =
      session.outputNames &&
      session.outputNames.length
        ? session.outputNames[0]
        : "output";

    if (
      outputs[outputName]
    ) {
      outputTensor =
        outputs[outputName];
    }

    if (!outputTensor) {
      const keys =
        Object.keys(outputs);

      if (keys.length > 0) {
        outputTensor =
          outputs[keys[0]];
      }
    }

    if (!outputTensor) {
      throw new Error(
        "Output tensor tidak ditemukan."
      );
    }

    console.log(
      "[FIDELIS] Output:",
      outputName
    );

    console.log(
      "[FIDELIS] Converting output..."
    );

    const canvas =
      await window.FidelisAIInference.tensorToCanvas(
        outputTensor,
        model,
        options || {}
      );

    if (!canvas) {
      throw new Error(
        "Canvas hasil AI gagal dibuat."
      );
    }

    return {
      canvas,

      aiProcessed: true,

      fallback: false,

      engine:
        "Real-ESRGAN ONNX",

      quality: q,

      scale:
        model.scale,

      model,

      inferenceTime:
        Math.round(inferenceTime),

      inputName,

      outputName
    };
  }

  function getModel(quality) {
    const q =
      normalizeQuality(quality);

    const entry =
      sessions.get(q);

    if (entry) {
      return entry.model;
    }

    return null;
  }

  function getStatus() {
    const result = {};

    [
      "standard",
      "high",
      "ultra"
    ].forEach(function (q) {
      const entry =
        sessions.get(q);

      result[q] = {
        loaded:
          Boolean(entry),

        modelCached:
          modelBuffers.has(q),

        loading:
          loading.has(q),

        url:
          getModelURL(q),

        model:
          entry
            ? entry.model
            : getModel(q)
      };
    });

    return {
      engine:
        "Real-ESRGAN ONNX",

      backend:
        window.FidelisRuntime &&
        typeof window.FidelisRuntime.getBackend ===
          "function"
          ? window.FidelisRuntime.getBackend()
          : "unknown",

      sessions:
        sessions.size,

      modelBuffers:
        modelBuffers.size,

      qualities:
        result
    };
  }

  async function dispose(
    quality
  ) {
    const q =
      normalizeQuality(quality);

    const entry =
      sessions.get(q);

    if (
      entry &&
      entry.session &&
      typeof entry.session.release ===
        "function"
    ) {
      try {
        await entry.session.release();
      } catch (_) {}
    }

    sessions.delete(q);

    modelBuffers.delete(q);

    console.log(
      "[FIDELIS] Disposed:",
      q
    );
  }

  async function disposeAll() {
    const qualities = [
      "standard",
      "high",
      "ultra"
    ];

    for (const q of qualities) {
      await dispose(q);
    }
  }

  function clear() {
    sessions.clear();
    modelBuffers.clear();

    console.log(
      "[FIDELIS] Bridge cache cleared."
    );
  }

  window.FidelisAIModelBridge = {
    normalizeQuality,

    createSession,

    getSession,

    getModel,

    getModelURL,

    run,

    getStatus,

    dispose,

    disposeAll,

    clear
  };

  console.log(
    "%cFIDELIS AI Model Bridge loaded.",
    "color:#a78bfa;font-weight:bold;"
  );
})();
