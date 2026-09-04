/* =========================================================
   FIDELIS AI MODEL BRIDGE
   Real-ESRGAN ONNX Bridge
   ========================================================= */

(function () {

  "use strict";


  const Bridge = {

    sessions: new Map(),

    initialized: false,


    /* =====================================================
       QUALITY
       ===================================================== */

    normalizeQuality(quality) {

      if (
        quality === "ultra" ||
        quality === "vvip"
      ) {

        return "ultra";

      }


      if (
        quality === "high" ||
        quality === "hq"
      ) {

        return "high";

      }


      return "standard";

    },


    /* =====================================================
       MODEL
       ===================================================== */

    getModel(quality) {

      const q =
        this.normalizeQuality(quality);


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


      if (
        window.FidelisAIModelConfig &&
        typeof window.FidelisAIModelConfig.get ===
        "function"
      ) {

        return window.FidelisAIModelConfig.get(q);

      }


      return null;

    },


    /* =====================================================
       MODEL URL
       ===================================================== */

    getModelURL(quality) {

      const q =
        this.normalizeQuality(quality);


      /*
       Real-ESRGAN config gets first priority.
       */

      if (
        window.FidelisRealESRGAN &&
        typeof window.FidelisRealESRGAN.getURL ===
        "function"
      ) {

        const url =
          window.FidelisRealESRGAN.getURL(q);

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
          window.FidelisModelRegistry.getURL(q);

        if (url) {
          return url;
        }

      }


      if (
        window.FidelisModelURL &&
        typeof window.FidelisModelURL.get ===
        "function"
      ) {

        const url =
          window.FidelisModelURL.get(q);

        if (url) {
          return url;
        }

      }


      return null;

    },


    /* =====================================================
       TIER
       ===================================================== */

    checkTier(model) {

      if (!model) {

        throw new Error(
          "FIDELIS: AI model not found."
        );

      }


      const tier =
        String(
          model.tier || "free"
        ).toLowerCase();


      if (
        tier !== "vvip" &&
        tier !== "premium"
      ) {

        return true;

      }


      if (
        window.FidelisTier &&
        typeof window.FidelisTier.isVVIP ===
        "function"
      ) {

        if (
          !window.FidelisTier.isVVIP()
        ) {

          throw new Error(
            "FIDELIS Ultra requires VVIP."
          );

        }

      }


      return true;

    },


    /* =====================================================
       INITIALIZE RUNTIME
       ===================================================== */

    async initRuntime() {

      if (this.initialized) {

        return true;

      }


      if (
        !window.FidelisRuntime ||
        typeof window.FidelisRuntime.init !==
        "function"
      ) {

        throw new Error(
          "FIDELIS: ONNX Runtime unavailable."
        );

      }


      await window.FidelisRuntime.init();


      this.initialized = true;


      return true;

    },


    /* =====================================================
       LOAD MODEL
       ===================================================== */

    async loadModel(
      quality,
      options = {}
    ) {

      const q =
        this.normalizeQuality(quality);


      /*
       V2 loader first.
       */

      if (
        window.FidelisModelLoaderV2 &&
        typeof window.FidelisModelLoaderV2.load ===
        "function"
      ) {

        const result =
          await window.FidelisModelLoaderV2.load(
            q,
            options
          );


        if (
          result &&
          result.buffer instanceof ArrayBuffer
        ) {

          return result.buffer;

        }


        if (
          result instanceof ArrayBuffer
        ) {

          return result;

        }

      }


      /*
       Legacy loader.
       */

      if (
        window.FidelisModelLoader &&
        typeof window.FidelisModelLoader.load ===
        "function"
      ) {

        const result =
          await window.FidelisModelLoader.load(
            q,
            options
          );


        if (
          result &&
          result.buffer instanceof ArrayBuffer
        ) {

          return result.buffer;

        }


        if (
          result instanceof ArrayBuffer
        ) {

          return result;

        }

      }


      throw new Error(
        "FIDELIS: Unable to load ONNX model."
      );

    },


    /* =====================================================
       SESSION
       ===================================================== */

    async createSession(
      quality,
      options = {}
    ) {

      const q =
        this.normalizeQuality(quality);


      if (
        this.sessions.has(q)
      ) {

        return this.sessions.get(q);

      }


      await this.initRuntime();


      const model =
        this.getModel(q);


      this.checkTier(model);


      const url =
        this.getModelURL(q);


      if (!url) {

        throw new Error(
          "FIDELIS: Real-ESRGAN model URL missing."
        );

      }


      const binary =
        await this.loadModel(
          q,
          {

            ...options,

            onProgress:
              options.onProgress ||
              function () {}

          }
        );


      if (
        !binary ||
        !(binary instanceof ArrayBuffer)
      ) {

        throw new Error(
          "FIDELIS: Invalid ONNX model binary."
        );

      }


      const session =
        await window.FidelisRuntime.createSession(
          binary,
          {

            executionProviders:
              options.executionProviders

          }
        );


      this.sessions.set(
        q,
        session
      );


      return session;

    },


    /* =====================================================
       RUN
       ===================================================== */

    async run(
      imageData,
      quality = "standard",
      options = {}
    ) {

      const q =
        this.normalizeQuality(
          quality
        );


      const model =
        this.getModel(q);


      this.checkTier(model);


      const session =
        await this.createSession(
          q,
          options
        );


      if (
        !window.FidelisAIModelAdapter
      ) {

        throw new Error(
          "FIDELIS: Model adapter unavailable."
        );

      }


      /*
       Convert image to tensor.
       */

      let tensor;


      if (
        typeof window.FidelisAIModelAdapter.createInputTensor ===
        "function"
      ) {

        tensor =
          window.FidelisAIModelAdapter.createInputTensor(
            imageData,
            model
          );

      }

      else {

        throw new Error(
          "FIDELIS: Cannot create input tensor."
        );

      }


      /*
       Input node.
       */

      const inputNames =
        session.inputNames || [];


      if (!inputNames.length) {

        throw new Error(
          "FIDELIS: ONNX model has no input."
        );

      }


      const feeds = {};


      feeds[
        inputNames[0]
      ] = tensor;


      /*
       Run model.
       */

      const results =
        await session.run(
          feeds
        );


      const outputNames =
        session.outputNames || [];


      let output;


      if (
        outputNames.length
      ) {

        output =
          results[
            outputNames[0]
          ];

      }


      if (!output) {

        output =
          Object.values(
            results
          )[0];

      }


      if (!output) {

        throw new Error(
          "FIDELIS: Real-ESRGAN returned no output."
        );

      }


      /*
       Convert output.
       */

      let canvas;


      if (
        typeof window.FidelisAIModelAdapter.outputToCanvas ===
        "function"
      ) {

        canvas =
          window.FidelisAIModelAdapter.outputToCanvas(
            output,
            model
          );

      }

      else {

        throw new Error(
          "FIDELIS: Output adapter unavailable."
        );

      }


      return {

        canvas,

        output,

        model,

        quality: q,

        scale:
          Number(
            model.scale || 1
          ),

        aiProcessed:
          true,

        fallback:
          false,

        engine:
          "Real-ESRGAN",

        backend:
          "ONNX Runtime Web"

      };

    },


    /* =====================================================
       DISPOSE
       ===================================================== */

    async dispose(
      quality
    ) {

      const q =
        this.normalizeQuality(
          quality
        );


      const session =
        this.sessions.get(q);


      if (!session) {
        return;
      }


      try {

        if (
          typeof session.release ===
          "function"
        ) {

          await session.release();

        }

        else if (
          typeof session.dispose ===
          "function"
        ) {

          await session.dispose();

        }

      }

      catch (error) {

        console.warn(
          "FIDELIS session dispose:",
          error
        );

      }


      this.sessions.delete(q);

    },


    /* =====================================================
       DISPOSE ALL
       ===================================================== */

    async disposeAll() {

      const keys =
        Array.from(
          this.sessions.keys()
        );


      for (
        const quality of keys
      ) {

        await this.dispose(
          quality
        );

      }

    },


    /* =====================================================
       STATUS
       ===================================================== */

    getStatus() {

      return {

        runtime:
          this.initialized,

        sessions:
          Array.from(
            this.sessions.keys()
          ),

        standard:
          Boolean(
            this.getModelURL(
              "standard"
            )
          ),

        high:
          Boolean(
            this.getModelURL(
              "high"
            )
          ),

        ultra:
          Boolean(
            this.getModelURL(
              "ultra"
            )
          )

      };

    }

  };


  window.FidelisAIModelBridge =
    Bridge;


})();
