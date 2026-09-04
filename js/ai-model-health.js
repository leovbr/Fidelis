(function () {
  "use strict";

  const state = {
    cache: new Map(),
    checking: new Map()
  };

  function normalizeQuality(quality) {
    const q = String(quality || "standard").toLowerCase();

    if (q === "ultra" || q === "vvip") {
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
    const q = normalizeQuality(quality);

    try {
      if (
        window.FidelisRealESRGAN &&
        typeof window.FidelisRealESRGAN.get === "function"
      ) {
        const model =
          window.FidelisRealESRGAN.get(q);

        if (model) {
          return model;
        }
      }
    } catch (error) {
      console.warn(
        "[FIDELIS] RealESRGAN config error:",
        error
      );
    }

    try {
      if (
        window.FidelisModelRegistry &&
        typeof window.FidelisModelRegistry.get === "function"
      ) {
        const model =
          window.FidelisModelRegistry.get(q);

        if (model) {
          return model;
        }
      }
    } catch (error) {
      console.warn(
        "[FIDELIS] Model registry error:",
        error
      );
    }

    try {
      if (
        window.FidelisAIModelConfig &&
        typeof window.FidelisAIModelConfig.get === "function"
      ) {
        return window.FidelisAIModelConfig.get(q);
      }
    } catch (error) {
      console.warn(
        "[FIDELIS] Model config error:",
        error
      );
    }

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
        const url =
          window.FidelisModelURL.get(q);

        if (url) {
          return url;
        }
      }
    } catch (error) {
      console.warn(
        "[FIDELIS] Model URL error:",
        error
      );
    }

    try {
      if (
        window.FidelisAIModels &&
        window.FidelisAIModels[q] &&
        window.FidelisAIModels[q].url
      ) {
        return window.FidelisAIModels[q].url;
      }
    } catch (error) {}

    return null;
  }

  function configured(quality) {
    return !!getURL(quality);
  }

  async function probeURL(url) {
    if (!url) {
      return {
        reachable: false,
        status: "not-configured",
        reason: "URL model belum dikonfigurasi."
      };
    }

    /*
     * Jangan pakai HEAD sebagai satu-satunya pengecekan.
     * Banyak CDN/repository memperlakukan HEAD berbeda
     * dengan GET.
     */

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Range: "bytes=0-1023"
        },
        cache: "no-store"
      });

      if (response.ok) {
        const contentLength =
          response.headers.get("content-length");

        const contentType =
          response.headers.get("content-type");

        return {
          reachable: true,
          status: response.status,
          contentLength,
          contentType,
          reason: null
        };
      }

      /*
       * 206 = Partial Content
       * 200 = server mengabaikan Range tapi tetap
       * mengizinkan GET.
       */

      if (
        response.status === 206 ||
        response.status === 200
      ) {
        return {
          reachable: true,
          status: response.status,
          contentLength:
            response.headers.get("content-length"),
          contentType:
            response.headers.get("content-type"),
          reason: null
        };
      }

      return {
        reachable: false,
        status: response.status,
        reason:
          `Server model mengembalikan HTTP ${response.status}.`
      };
    } catch (error) {
      /*
       * Jangan langsung menganggap model rusak.
       * Browser bisa memblokir probe karena CORS,
       * sementara loader utama masih mungkin berhasil.
       */

      return {
        reachable: null,
        status: "probe-failed",
        reason:
          error.message ||
          "Probe model gagal atau diblokir browser."
      };
    }
  }

  async function check(quality = "standard", options = {}) {
    const q = normalizeQuality(quality);

    if (
      state.cache.has(q) &&
      options.force !== true
    ) {
      return state.cache.get(q);
    }

    if (state.checking.has(q)) {
      return state.checking.get(q);
    }

    const promise = (async () => {
      const model = getModel(q);
      const url = getURL(q);

      if (!url) {
        const result = {
          quality: q,
          configured: false,
          reachable: false,
          ready: false,
          status: "not-configured",
          model: model || null,
          url: null,
          reason:
            "Model AI belum memiliki URL."
        };

        state.cache.set(q, result);

        return result;
      }

      const probe =
        options.skipNetwork
          ? {
              reachable: null,
              status: "not-tested",
              reason: null
            }
          : await probeURL(url);

      /*
       * ready = true jika URL terkonfigurasi dan
       * probe tidak memberikan HTTP error yang jelas.
       *
       * Ini sengaja dibuat longgar supaya CORS/probe
       * tidak memblokir inference sebenarnya.
       */

      const explicitHTTPFailure =
        typeof probe.status === "number" &&
        probe.status >= 400;

      const ready =
        !explicitHTTPFailure;

      const result = {
        quality: q,
        configured: true,
        reachable: probe.reachable,
        ready,
        status: probe.status,
        model: model || null,
        url,
        contentLength:
          probe.contentLength || null,
        contentType:
          probe.contentType || null,
        reason:
          explicitHTTPFailure
            ? probe.reason
            : probe.reason || null
      };

      state.cache.set(q, result);

      return result;
    })();

    state.checking.set(q, promise);

    try {
      return await promise;
    } finally {
      state.checking.delete(q);
    }
  }

  async function checkAll(options = {}) {
    const qualities = [
      "standard",
      "high",
      "ultra"
    ];

    const results = {};

    for (const quality of qualities) {
      results[quality] =
        await check(quality, options);
    }

    return results;
  }

  async function canUse(quality = "standard") {
    try {
      const result =
        await check(quality);

      return !!(
        result.configured &&
        result.ready
      );
    } catch (error) {
      return false;
    }
  }

  function clear(quality) {
    if (quality) {
      state.cache.delete(
        normalizeQuality(quality)
      );
      return;
    }

    state.cache.clear();
  }

  function getStatus() {
    const models = {};

    [
      "standard",
      "high",
      "ultra"
    ].forEach(quality => {
      const model = getModel(quality);

      models[quality] = {
        configured: configured(quality),
        url: getURL(quality),
        model: model || null,
        cached:
          state.cache.has(quality)
      };
    });

    return {
      models,
      cacheSize: state.cache.size,
      checking: state.checking.size
    };
  }

  window.FidelisModelHealth = {
    normalizeQuality,

    getModel,
    getURL,

    configured,

    probeURL,
    check,
    checkAll,

    canUse,

    clear,
    getStatus
  };

  console.log(
    "[FIDELIS] Model Health module loaded."
  );
})();
