(function () {
  "use strict";

  const VERSION = "1.29.0";

  const CDN = {
    webgpu:
      `https://cdn.jsdelivr.net/npm/onnxruntime-web@${VERSION}/dist/ort.webgpu.min.js`,
    webgl:
      `https://cdn.jsdelivr.net/npm/onnxruntime-web@${VERSION}/dist/ort.webgl.min.js`,
    wasm:
      `https://cdn.jsdelivr.net/npm/onnxruntime-web@${VERSION}/dist/ort.wasm.min.js`
  };

  const state = {
    initialized: false,
    initializing: false,
    backend: null,
    ort: null,
    error: null,
    scriptPromise: null
  };

  function detectWebGPU() {
    return !!(
      typeof navigator !== "undefined" &&
      navigator.gpu
    );
  }

  function detectWebGL() {
    try {
      const canvas = document.createElement("canvas");

      return !!(
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
      );
    } catch (error) {
      return false;
    }
  }

  function getAvailableBackends() {
    const result = [];

    if (detectWebGPU()) {
      result.push("webgpu");
    }

    if (detectWebGL()) {
      result.push("webgl");
    }

    result.push("wasm");

    return result;
  }

  function loadScript(src) {
    if (state.scriptPromise) {
      return state.scriptPromise;
    }

    state.scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(
        `script[data-fidelis-ort="${src}"]`
      );

      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => {
          reject(new Error("Gagal memuat ONNX Runtime Web."));
        }, { once: true });

        if (window.ort) {
          resolve();
        }

        return;
      }

      const script = document.createElement("script");

      script.src = src;
      script.async = true;
      script.dataset.fidelisOrt = src;

      script.onload = () => resolve();

      script.onerror = () => {
        state.scriptPromise = null;
        reject(
          new Error(
            "ONNX Runtime Web gagal dimuat dari CDN."
          )
        );
      };

      document.head.appendChild(script);
    });

    return state.scriptPromise;
  }

  async function loadBackend(backend) {
    state.scriptPromise = null;

    const url = CDN[backend];

    if (!url) {
      throw new Error(`Backend ${backend} tidak tersedia.`);
    }

    await loadScript(url);

    if (!window.ort) {
      throw new Error(
        "ONNX Runtime Web berhasil dimuat tetapi objek ORT tidak ditemukan."
      );
    }

    state.ort = window.ort;

    return state.ort;
  }

  function getSessionOptions(backend, extraOptions) {
    const options = {
      executionProviders: [backend],
      graphOptimizationLevel: "all"
    };

    if (backend === "wasm") {
      options.executionProviders = [
        {
          name: "wasm",
          numThreads: Math.max(
            1,
            Math.min(
              4,
              typeof navigator !== "undefined" &&
              navigator.hardwareConcurrency
                ? navigator.hardwareConcurrency
                : 2
            )
          )
        }
      ];
    }

    if (extraOptions && typeof extraOptions === "object") {
      Object.assign(options, extraOptions);

      if (extraOptions.executionProviders) {
        options.executionProviders = extraOptions.executionProviders;
      }
    }

    return options;
  }

  async function init(options = {}) {
    if (state.initialized && state.ort) {
      return getStatus();
    }

    if (state.initializing) {
      while (state.initializing) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (state.initialized) {
        return getStatus();
      }
    }

    state.initializing = true;
    state.error = null;

    try {
      const available = getAvailableBackends();

      let preferred = options.backend || options.preferredBackend;

      let candidates;

      if (preferred && available.includes(preferred)) {
        candidates = [
          preferred,
          ...available.filter(x => x !== preferred)
        ];
      } else {
        candidates = available;
      }

      let lastError = null;

      for (const backend of candidates) {
        try {
          console.log(
            `[FIDELIS] Mencoba ONNX backend: ${backend}`
          );

          await loadBackend(backend);

          state.backend = backend;
          state.initialized = true;

          console.log(
            `[FIDELIS] ONNX Runtime siap menggunakan ${backend}.`
          );

          return getStatus();
        } catch (error) {
          console.warn(
            `[FIDELIS] Backend ${backend} gagal:`,
            error
          );

          lastError = error;

          state.backend = null;
          state.ort = null;
          state.initialized = false;
          state.scriptPromise = null;
        }
      }

      throw (
        lastError ||
        new Error(
          "Tidak ada backend ONNX Runtime yang dapat digunakan."
        )
      );
    } catch (error) {
      state.error = error;

      console.error(
        "[FIDELIS] Runtime initialization failed:",
        error
      );

      throw error;
    } finally {
      state.initializing = false;
    }
  }

  async function createSession(modelData, options = {}) {
    if (!modelData) {
      throw new Error("Data model ONNX kosong.");
    }

    await init({
      backend: options.backend || options.preferredBackend
    });

    const ort = state.ort;

    if (!ort || !ort.InferenceSession) {
      throw new Error(
        "ONNX Runtime Web belum siap."
      );
    }

    const sessionOptions = getSessionOptions(
      state.backend,
      options.sessionOptions
    );

    try {
      return await ort.InferenceSession.create(
        modelData,
        sessionOptions
      );
    } catch (firstError) {
      /*
       * WebGPU / WebGL bisa tersedia di browser tetapi
       * gagal menjalankan graph tertentu.
       *
       * Kalau itu terjadi, coba backend berikutnya.
       */

      if (
        state.backend !== "wasm" &&
        options.allowFallback !== false
      ) {
        const previousBackend = state.backend;

        console.warn(
          `[FIDELIS] ${previousBackend} gagal membuat session. Mencoba fallback...`
        );

        const available = getAvailableBackends();

        const fallbackBackends = available.filter(
          backend => backend !== previousBackend
        );

        for (const backend of fallbackBackends) {
          try {
            await loadBackend(backend);

            state.backend = backend;
            state.initialized = true;

            const fallbackOptions =
              getSessionOptions(
                backend,
                options.sessionOptions
              );

            const session =
              await state.ort.InferenceSession.create(
                modelData,
                fallbackOptions
              );

            console.log(
              `[FIDELIS] Fallback berhasil: ${backend}`
            );

            return session;
          } catch (fallbackError) {
            console.warn(
              `[FIDELIS] Fallback ${backend} gagal:`,
              fallbackError
            );
          }
        }
      }

      throw new Error(
        `Gagal membuat ONNX session. Backend: ${state.backend}. ` +
        `Detail: ${firstError.message || firstError}`
      );
    }
  }

  function getBackend() {
    return state.backend;
  }

  function getORT() {
    return state.ort;
  }

  function isReady() {
    return !!(
      state.initialized &&
      state.ort &&
      state.backend
    );
  }

  function getStatus() {
    return {
      ready: isReady(),
      initialized: state.initialized,
      initializing: state.initializing,
      backend: state.backend,
      version: VERSION,
      webgpu: detectWebGPU(),
      webgl: detectWebGL(),
      wasm: true,
      availableBackends: getAvailableBackends(),
      error: state.error
        ? state.error.message || String(state.error)
        : null
    };
  }

  function dispose() {
    state.initialized = false;
    state.initializing = false;
    state.backend = null;
    state.ort = null;
    state.error = null;
    state.scriptPromise = null;
  }

  window.FidelisRuntime = {
    VERSION,
    CDN,

    init,
    createSession,

    getBackend,
    getORT,

    isReady,
    getStatus,

    detectWebGPU,
    detectWebGL,
    getAvailableBackends,

    dispose
  };

  console.log(
    `[FIDELIS] Runtime module loaded — ONNX Runtime Web ${VERSION}`
  );
})();
