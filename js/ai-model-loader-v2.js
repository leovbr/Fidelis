(function () {
  "use strict";

  const cache = new Map();
  const loading = new Map();
  const controllers = new Map();

  function normalizeQuality(quality) {
    const q = String(quality || "standard").toLowerCase();

    if (q === "ultra" || q === "vvip") return "ultra";
    if (q === "high" || q === "hq" || q === "premium") return "high";

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
        if (model) return model;
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
        if (model) return model;
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
        if (model) return model;
      }
    } catch (error) {
      console.warn("[FIDELIS] AI model config error:", error);
    }

    return null;
  }

  function getURL(quality) {
    const q = normalizeQuality(quality);
    const model = getModel(q);

    if (model && model.url) {
      return String(model.url);
    }

    try {
      if (
        window.FidelisModelURL &&
        typeof window.FidelisModelURL.get === "function"
      ) {
        const url = window.FidelisModelURL.get(q);

        if (url) {
          return String(url);
        }
      }
    } catch (error) {
      console.warn("[FIDELIS] Model URL error:", error);
    }

    return null;
  }

  function getURLCandidates(quality) {
    const q = normalizeQuality(quality);
    const primary = getURL(q);

    const urls = [];

    if (primary) {
      urls.push(primary);
    }

    /*
     * Hugging Face alternative:
     * URL yang sama tanpa ?download=true.
     */

    if (primary) {
      try {
        const cleanURL = primary.split("?")[0];

        if (!urls.includes(cleanURL)) {
          urls.push(cleanURL);
        }
      } catch (error) {}
    }

    return urls;
  }

  function checkTier(model) {
    if (!model) {
      throw new Error("Model tidak ditemukan.");
    }

    if (model.tier === "vvip") {
      let allowed = false;

      try {
        if (
          window.FidelisTierManager &&
          typeof window.FidelisTierManager.isVVIP === "function"
        ) {
          allowed = window.FidelisTierManager.isVVIP();
        }
      } catch (error) {}

      if (!allowed) {
        throw new Error(
          "FIDELIS Ultra hanya tersedia untuk pengguna VVIP."
        );
      }
    }

    return true;
  }

  function emitProgress(
    quality,
    progress,
    loaded,
    total,
    callback
  ) {
    const value = Math.max(
      0,
      Math.min(100, Math.round(progress))
    );

    const payload = {
      quality,
      progress: value,
      loaded: loaded || 0,
      total: total || 0,
      percent: value
    };

    if (typeof callback === "function") {
      try {
        callback(payload);
      } catch (error) {
        console.warn(
          "[FIDELIS] Progress callback error:",
          error
        );
      }
    }

    try {
      window.dispatchEvent(
        new CustomEvent("fidelis:model-progress", {
          detail: payload
        })
      );
    } catch (error) {}
  }

  async function fetchModel(
    quality,
    url,
    options = {}
  ) {
    const q = normalizeQuality(quality);

    const controller = new AbortController();

    controllers.set(q, controller);

    console.log(
      `[FIDELIS] Fetching ${q} model:`,
      url
    );

    let response;

    try {
      response = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "force-cache",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "application/octet-stream"
        }
      });
    } catch (error) {
      const message =
        error && error.message
          ? error.message
          : String(error);

      throw new Error(
        `Network/CORS error saat mengambil model ${q}. ` +
        `URL: ${url} | ${message}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Download model ${q} gagal. HTTP ${response.status} ${response.statusText}.`
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    console.log(
      `[FIDELIS] ${q} response:`,
      response.status,
      contentType
    );

    const contentLengthHeader =
      response.headers.get("content-length");

    const total = contentLengthHeader
      ? Number(contentLengthHeader)
      : 0;

    if (
      response.body &&
      typeof response.body.getReader === "function"
    ) {
      const reader = response.body.getReader();

      const chunks = [];
      let loaded = 0;

      while (true) {
        const result = await reader.read();

        if (result.done) {
          break;
        }

        const chunk = result.value;

        if (!chunk) {
          continue;
        }

        chunks.push(chunk);

        loaded += chunk.byteLength;

        let progress = 0;

        if (total > 0) {
          progress = (loaded / total) * 100;
        } else {
          progress = Math.min(
            95,
            5 +
              Math.log10(
                Math.max(1, loaded)
              ) *
                15
          );
        }

        emitProgress(
          q,
          progress,
          loaded,
          total,
          options.onProgress
        );
      }

      const buffer = new Uint8Array(loaded);

      let offset = 0;

      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
      }

      emitProgress(
        q,
        100,
        loaded,
        total || loaded,
        options.onProgress
      );

      return buffer.buffer;
    }

    const buffer =
      await response.arrayBuffer();

    emitProgress(
      q,
      100,
      buffer.byteLength,
      total || buffer.byteLength,
      options.onProgress
    );

    return buffer;
  }

  async function load(
    quality = "standard",
    options = {}
  ) {
    const q = normalizeQuality(quality);

    if (
      cache.has(q) &&
      options.forceReload !== true
    ) {
      const buffer = cache.get(q);

      emitProgress(
        q,
        100,
        buffer.byteLength,
        buffer.byteLength,
        options.onProgress
      );

      return buffer;
    }

    if (
      loading.has(q) &&
      options.forceReload !== true
    ) {
      return loading.get(q);
    }

    const model = getModel(q);

    if (!model) {
      throw new Error(
        `Konfigurasi model ${q} tidak ditemukan.`
      );
    }

    checkTier(model);

    const urls = getURLCandidates(q);

    if (!urls.length) {
      throw new Error(
        `URL model ${q} belum dikonfigurasi.`
      );
    }

    const promise = (async () => {
      try {
        console.log(
          `[FIDELIS] Preparing ${q} model...`
        );

        emitProgress(
          q,
          0,
          0,
          0,
          options.onProgress
        );

        let buffer = null;
        let lastError = null;

        for (let i = 0; i < urls.length; i++) {
          const url = urls[i];

          try {
            console.log(
              `[FIDELIS] Download attempt ${i + 1}/${urls.length}:`,
              url
            );

            buffer = await fetchModel(
              q,
              url,
              options
            );

            if (
              buffer &&
              buffer.byteLength > 0
            ) {
              console.log(
                `[FIDELIS] ${q} model downloaded successfully.`
              );

              break;
            }

            throw new Error(
              "Model yang diterima kosong."
            );
          } catch (error) {
            lastError = error;

            console.warn(
              `[FIDELIS] Attempt ${i + 1} failed:`,
              error
            );
          }
        }

        if (
          !buffer ||
          buffer.byteLength === 0
        ) {
          throw (
            lastError ||
            new Error(
              `Model ${q} gagal didownload.`
            )
          );
        }

        /*
         * Basic sanity check.
         *
         * ONNX adalah protobuf sehingga tidak memiliki
         * magic bytes sederhana seperti PNG/JPG.
         */

        if (buffer.byteLength < 1024) {
          throw new Error(
            `File model ${q} terlalu kecil (${buffer.byteLength} bytes).`
          );
        }

        cache.set(q, buffer);

        console.log(
          `[FIDELIS] ${q} model loaded: ` +
            `${(
              buffer.byteLength /
              1024 /
              1024
            ).toFixed(2)} MB`
        );

        return buffer;
      } catch (error) {
        console.error(
          `[FIDELIS] ${q} model loading failed:`,
          error
        );

        throw new Error(
          `Gagal memuat model ${q}: ${
            error.message || error
          }`
        );
      } finally {
        loading.delete(q);
        controllers.delete(q);
      }
    })();

    loading.set(q, promise);

    return promise;
  }

  function isLoaded(quality) {
    return cache.has(
      normalizeQuality(quality)
    );
  }

  function getLoadedSize(quality) {
    const buffer = cache.get(
      normalizeQuality(quality)
    );

    return buffer
      ? buffer.byteLength
      : 0;
  }

  function getStatus() {
    const models = {};

    [
      "standard",
      "high",
      "ultra"
    ].forEach(q => {
      const model = getModel(q);
      const buffer = cache.get(q);

      models[q] = {
        configured: !!getURL(q),
        loaded: !!buffer,
        loading: loading.has(q),
        size: buffer
          ? buffer.byteLength
          : 0,
        sizeMB: buffer
          ? Number(
              (
                buffer.byteLength /
                1024 /
                1024
              ).toFixed(2)
            )
          : 0,
        model: model || null
      };
    });

    return {
      models,
      cacheCount: cache.size,
      loadingCount: loading.size
    };
  }

  function cancel(quality) {
    const q = normalizeQuality(quality);

    const controller =
      controllers.get(q);

    if (controller) {
      try {
        controller.abort();
      } catch (error) {}

      controllers.delete(q);

      console.warn(
        `[FIDELIS] Download ${q} dibatalkan.`
      );
    }
  }

  function clear(quality) {
    const q = normalizeQuality(quality);

    cancel(q);

    cache.delete(q);
  }

  function clearAll() {
    controllers.forEach(controller => {
      try {
        controller.abort();
      } catch (error) {}
    });

    controllers.clear();
    loading.clear();
    cache.clear();

    console.log(
      "[FIDELIS] Semua model cache dibersihkan."
    );
  }

  function getLoadedModels() {
    return Array.from(cache.keys());
  }

  function getTotalCacheSize() {
    let total = 0;

    cache.forEach(buffer => {
      total += buffer.byteLength;
    });

    return total;
  }

  window.FidelisModelLoaderV2 = {
    load,
    isLoaded,
    getLoadedSize,
    getStatus,
    getLoadedModels,
    getTotalCacheSize,
    cancel,
    clear,
    clearAll
  };

  console.log(
    "[FIDELIS] Model Loader V2 loaded."
  );
})();
