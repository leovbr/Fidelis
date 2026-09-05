/* =========================================================
   FIDELIS AI RUNTIME
   ONNX Runtime Web loader
   ========================================================= */

(function () {
  "use strict";

  const ORT_VERSION = "1.29.0";

  const CDN_BASE =
    `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

  const BACKEND_URLS = {
    webgpu:
      CDN_BASE + "ort.webgpu.min.js",

    webgl:
      CDN_BASE + "ort.webgl.min.js",

    wasm:
      CDN_BASE + "ort.wasm.min.js"
  };

  const state = {
    ready: false,
    initializing: false,
    backend: null,
    ort: null,
    loadedScripts: {},
    error: null
  };

  function hasWebGPU() {
    return (
      typeof navigator !== "undefined" &&
      "gpu" in navigator
    );
  }

  function hasWebGL() {
    try {
      const canvas =
        document.createElement("canvas");

      return !!(
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl")
      );
    } catch (error) {
      return false;
    }
  }

  function hasWASM() {
    try {
      return (
        typeof WebAssembly !==
        "undefined"
      );
    } catch (error) {
      return false;
    }
  }

  function getAvailableBackends() {
    const result = [];

    if (hasWebGPU()) {
      result.push("webgpu");
    }

    if (hasWebGL()) {
      result.push("webgl");
    }

    if (hasWASM()) {
      result.push("wasm");
    }

    return result;
  }

  function loadScript(src, key) {
    return new Promise(
      (resolve, reject) => {
        if (state.loadedScripts[key]) {
          resolve();
          return;
        }

        /*
         * Kalau script ORT sudah tersedia
         * globalmente, não precisamos baixar
         * novamente.
         */
        if (
          window.ort &&
          typeof window.ort.InferenceSession ===
            "object"
        ) {
          state.loadedScripts[key] = true;
          resolve();
          return;
        }

        const existing =
          document.querySelector(
            `script[data-fidelis-ort="${key}"]`
          );

        if (existing) {
          existing.addEventListener(
            "load",
            () => {
              state.loadedScripts[key] = true;
              resolve();
            },
            { once: true }
          );

          existing.addEventListener(
            "error",
            () => {
              reject(
                new Error(
                  `Gagal memuat ONNX Runtime ${key}.`
                )
              );
            },
            { once: true }
          );

          return;
        }

        const script =
          document.createElement(
            "script"
          );

        script.src = src;
        script.async = true;
        script.dataset.fidelisOrt = key;

        script.onload = () => {
          state.loadedScripts[key] = true;

          if (!window.ort) {
            reject(
              new Error(
                "ONNX Runtime berhasil dimuat tetapi window.ort tidak ditemukan."
              )
            );
            return;
          }

          resolve();
        };

        script.onerror = () => {
          reject(
            new Error(
              `Gagal memuat ONNX Runtime backend: ${key}`
            )
          );
        };

        document.head.appendChild(script);
      }
    );
  }

  async function loadBackend(backend) {
    if (
      !BACKEND_URLS[backend]
    ) {
      throw new Error(
        `Backend tidak dikenal: ${backend}`
      );
    }

    /*
     * Jangan load ulang kalau ORT sudah
     * tersedia.
     */
    if (!window.ort) {
      await loadScript(
        BACKEND_URLS[backend],
        backend
      );
    } else {
      state.loadedScripts[backend] =
        true;
    }

    if (!window.ort) {
      throw new Error(
        "ONNX Runtime Web tidak tersedia."
      );
    }

    return window.ort;
  }

  function getSessionOptions(
    backend,
    extra = {}
  ) {
    const options = {
      executionProviders: [backend],

      graphOptimizationLevel:
        "all",

      enableMemPattern: true,

      enableCpuMemArena: true,

      ...extra
    };

    /*
     * WASM settings.
     */
    if (backend === "wasm") {
      options.executionProviders = [
        {
          name: "wasm",
          ...(
            extra.wasm ||
            {}
          )
        }
      ];
    }

    return options;
  }

  async function init(
    options = {}
  ) {
    if (state.ready && state.ort) {
      return state.ort;
    }

    if (state.initializing) {
      /*
       * Wait until current initialization
       * finishes.
       */
      while (state.initializing) {
        await new Promise(resolve =>
          setTimeout(resolve, 50)
        );
      }

      if (
        state.ready &&
        state.ort
      ) {
        return state.ort;
      }
    }

    state.initializing = true;
    state.error = null;

    try {
      const preferred =
        options.backend || null;

      let candidates;

      if (preferred) {
        candidates = [
          preferred,
          ...getAvailableBackends()
            .filter(
              item =>
                item !== preferred
            )
        ];
      } else {
        candidates =
          getAvailableBackends();
      }

      /*
       * Prefer:
       * WebGPU → WebGL → WASM
       */
      const priority = [
        "webgpu",
        "webgl",
        "wasm"
      ];

      candidates =
        candidates
          .filter(
            (value, index, array) =>
              array.indexOf(value) ===
              index
          )
          .sort(
            (a, b) =>
              priority.indexOf(a) -
              priority.indexOf(b)
          );

      if (!candidates.length) {
        throw new Error(
          "Browser tidak menyediakan backend AI yang didukung."
        );
      }

      let lastError = null;

      for (const backend of candidates) {
        try {
          console.log(
            `[FIDELIS] Loading ONNX Runtime: ${backend}`
          );

          const ort =
            await loadBackend(
              backend
            );

          if (!ort) {
            throw new Error(
              "window.ort tidak tersedia."
            );
          }

          /*
           * Configure WASM paths when needed.
           */
          if (
            backend === "wasm" &&
            ort.env &&
            ort.env.wasm
          ) {
            ort.env.wasm.wasmPaths =
              CDN_BASE;
          }

          /*
           * Basic API validation.
           */
          if (
            !ort.InferenceSession ||
            typeof ort.InferenceSession.create !==
              "function"
          ) {
            throw new Error(
              "ONNX Runtime InferenceSession API tidak tersedia."
            );
          }

          state.ort = ort;
          state.backend = backend;
          state.ready = true;

          console.log(
            `🔥 FIDELIS AI Runtime ready: ${backend}`
          );

          return ort;
        } catch (error) {
          lastError = error;

          console.warn(
            `[FIDELIS] Backend ${backend} gagal:`,
            error
          );
        }
      }

      throw (
        lastError ||
        new Error(
          "Semua AI backend gagal dimuat."
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

  async function createSession(
    modelData,
    options = {}
  ) {
    if (!modelData) {
      throw new Error(
        "Model data tidak tersedia."
      );
    }

    if (
      !state.ready ||
      !state.ort
    ) {
      await init(options);
    }

    const ort = state.ort;

    /*
     * ArrayBuffer / Uint8Array support.
     */
    let model = modelData;

    if (
      modelData instanceof Uint8Array
    ) {
      model = modelData;
    } else if (
      modelData instanceof ArrayBuffer
    ) {
      model = modelData;
    } else if (
      ArrayBuffer.isView(modelData)
    ) {
      model = modelData;
    } else {
      throw new Error(
        "Format model ONNX tidak valid."
      );
    }

    let backend =
      options.backend ||
      state.backend;

    let sessionOptions =
      getSessionOptions(
        backend,
        options.sessionOptions ||
          {}
      );

    try {
      console.log(
        `[FIDELIS] Creating ONNX session (${backend})...`
      );

      const session =
        await ort.InferenceSession.create(
          model,
          sessionOptions
        );

      return session;
    } catch (error) {
      /*
       * If selected backend fails during
       * session creation, try other backends.
       */
      console.warn(
        `[FIDELIS] Session creation failed on ${backend}:`,
        error
      );

      const alternatives =
        getAvailableBackends()
          .filter(
            item =>
              item !== backend
          );

      for (const alternative of alternatives) {
        try {
          console.log(
            `[FIDELIS] Trying fallback backend: ${alternative}`
          );

          await loadBackend(
            alternative
          );

          if (
            alternative === "wasm" &&
            state.ort.env &&
            state.ort.env.wasm
          ) {
            state.ort.env.wasm.wasmPaths =
              CDN_BASE;
          }

          const alternativeOptions =
            getSessionOptions(
              alternative,
              options.sessionOptions ||
                {}
            );

          const session =
            await state.ort.InferenceSession.create(
              model,
              alternativeOptions
            );

          state.backend =
            alternative;

          return session;
        } catch (fallbackError) {
          console.warn(
            `[FIDELIS] Fallback ${alternative} failed:`,
            fallbackError
          );
        }
      }

      throw error;
    }
  }

  function getBackend() {
    return state.backend;
  }

  function getORT() {
    return state.ort;
  }

  function isReady() {
    return (
      state.ready &&
      !!state.ort
    );
  }

  function getStatus() {
    return {
      ready: state.ready,

      initializing:
        state.initializing,

      backend:
        state.backend,

      availableBackends:
        getAvailableBackends(),

      ortLoaded:
        !!state.ort,

      ortVersion:
        ORT_VERSION,

      error:
        state.error
          ? state.error.message
          : null
    };
  }

  function dispose() {
    state.ready = false;
    state.initializing = false;
    state.backend = null;
    state.ort = null;
    state.error = null;
  }

  window.FidelisRuntime = {
    init,
    createSession,
    loadBackend,
    loadScript,
    getAvailableBackends,
    getSessionOptions,
    getBackend,
    getORT,
    isReady,
    getStatus,
    dispose,

    ORT_VERSION,
    CDN_BASE
  };

  console.log(
    "🔥 FIDELIS AI Runtime module loaded"
  );
})();
