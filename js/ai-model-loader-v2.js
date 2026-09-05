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

    try {
      if (
        window.FidelisAIModelConfig &&
        typeof window.FidelisAIModelConfig.get === "function"
      ) {
        return window.FidelisAIModelConfig.get(q);
      }
    } catch (error) {}

    return null;
  }

  function getURL(quality) {
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
        return window.FidelisModelURL.get(q);
      }
    } catch (error) {}

    return null;
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

  function emitProgress(quality, progress, loaded, total, callback) {
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

  async function fetchModel(quality, url, options = {}) {
    const q = normalizeQuality(quality);

    const controller = new AbortController();

    controllers.set(q, controller);

    const response = await fetch(url, {
      method: "GET",
      cache: "force-cache",
      signal: controller.signal,
      headers: {
        Accept: "application/octet-stream, application/octet-stream"
      }
    });

    if (!response.ok) {
      throw new Error(
        `Download model gagal. HTTP ${response.status}.`
      );
    }

    const contentLengthHeader =
      response.headers.get("content-length");

    const total = contentLengthHeader
      ? Number(contentLengthHeader)
      : 0;

    /*
     * Kalau browser menyediakan ReadableStream,
     * kita download sambil menghitung progress.
     */

    if (response.body && response.body.getReader) {
      const reader = response.body.getReader();

      const chunks = [];
      let loaded = 0;

      while (true) {
        const result = await reader.read();

        if (result.done) break;

        const chunk = result.value;

        chunks.push(chunk);

        loaded += chunk.byteLength;

        let progress = 0;

        if (total > 0) {
          progress = (loaded / total) * 100;
        } else {
          /*
           * Content-Length kadang tidak tersedia.
           * Tetap kasih progress indikatif.
           */
          progress = Math.min(
            95,
            5 + Math.log10(
              Math.max(1, loaded)
            ) * 15
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

    /*
     * Fallback kalau ReadableStream tidak tersedia.
     */

    const buffer = await response.arrayBuffer();

    emitProgress(
      q,
      100,
      buffer.byteLength,
      total || buffer.byteLength,
      options.onProgress
    );

    return buffer;
  }

  async function load(quality = "standard", options = {}) {
    const q = normalizeQuality(quality);

    /*
     * Return cache kalau model sudah pernah di-load.
     */
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

    /*
     * Kalau sedang didownload oleh request lain,
     * ikut promise yang sama.
     */
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

    const url = getURL(q);

    if (!url) {
      throw new Error(
        `URL model ${q} belum dikonfigurasi.`
      );
    }

    const promise = (async () => {
      try {
        console.log(
          `[FIDELIS] Downloading ${q} model...`
        );

        emitProgress(
          q,
          0,
          0,
          0,
          options.onProgress
        );

        const buffer = await fetchModel(
          q,
          url,
          options
        );

        if (
          !buffer ||
          buffer.byteLength === 0
        ) {
          throw new Error(
            `Model ${q} yang diterima kosong.`
          );
        }

        /*
         * Basic sanity check.
         *
         * ONNX file biasanya diawali dengan struktur
         * protobuf. Kita tidak memaksa magic bytes tertentu
         * karena ONNX protobuf tidak punya signature sederhana
         * seperti PNG/ZIP.
         */

        cache.set(q, buffer);

        console.log(
          `[FIDELIS] ${q} model loaded: ` +
          `${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`
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
    const buffer =
      cache.get(
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
      controller.abort();

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
    return Array.from(
      cache.keys()
    );
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
