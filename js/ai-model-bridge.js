/* =========================================================
   FIDELIS AI MODEL BRIDGE
   Connects:
   Model Registry
        ↓
   Model Loader V2
        ↓
   ONNX Runtime
        ↓
   Model Adapter
        ↓
   Image Pipeline
   ========================================================= */

(function () {

  "use strict";


  const Bridge = {

    sessions: new Map(),

    initialized: false,


    /* =====================================================
       NORMALIZE QUALITY
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
       GET MODEL
       ===================================================== */

    getModel(quality) {

      const q = this.normalizeQuality(quality);

      if (
        window.FidelisModelRegistry &&
        typeof window.FidelisModelRegistry.get === "function"
      ) {
        return window.FidelisModelRegistry.get(q);
      }


      if (
        window.FidelisAIModelConfig &&
        typeof window.FidelisAIModelConfig.get === "function"
      ) {
        return window.FidelisAIModelConfig.get(q);
      }


      return null;
    },


    /* =====================================================
       CHECK VVIP
       ===================================================== */

    checkTier(model) {

      if (!model) {
        throw new Error("FIDELIS: Model not found.");
      }


      const tier =
        String(model.tier || "free").toLowerCase();


      if (
        tier === "vvip" ||
        tier === "premium"
      ) {

        if (
          window.FidelisTier &&
          typeof window.FidelisTier.isVVIP === "function"
        ) {

          if (!window.FidelisTier.isVVIP()) {

            throw new Error(
              "This AI model requires FIDELIS VVIP."
            );

          }

        }

      }

    },


    /* =====================================================
       GET MODEL URL
       ===================================================== */

    getModelURL(quality) {

      const q = this.normalizeQuality(quality);


      if (
        window.FidelisModelRegistry &&
        typeof window.FidelisModelRegistry.getURL === "function"
      ) {

        const url =
          window.FidelisModelRegistry.getURL(q);

        if (url) return url;

      }


      if (
        window.FidelisModelURL &&
        typeof window.FidelisModelURL.get === "function"
      ) {

        const url =
          window.FidelisModelURL.get(q);

        if (url) return url;

      }


      if (
        window.FidelisAIModelConfig &&
        typeof window.FidelisAIModelConfig.getURL === "function"
      ) {

        return window.FidelisAIModelConfig.getURL(q);

      }


      return null;
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
        typeof window.FidelisRuntime.init !== "function"
      ) {

        throw new Error(
          "FIDELIS: ONNX Runtime is unavailable."
        );

      }


      await window.FidelisRuntime.init();


      this.initialized = true;

      return true;
    },


    /* =====================================================
       LOAD MODEL BINARY
       ===================================================== */

    async loadModel(quality, options = {}) {

      const q = this.normalizeQuality(quality);


      let loader = null;


      /*
       Prefer V2 loader.
      */

      if (
        window.FidelisModelLoaderV2 &&
        typeof window.FidelisModelLoaderV2.load === "function"
      ) {

        loader = window.FidelisModelLoaderV2;

      }


      /*
       Legacy loader fallback.
       */

      else if (
        window.FidelisModelLoader &&
        typeof window.FidelisModelLoader.load === "function"
      ) {

        loader = window.FidelisModelLoader;

      }


      if (!loader) {

        throw new Error(
          "FIDELIS: Model loader unavailable."
        );

      }


      const result =
        await loader.load(q, {

          ...options,

          onProgress: options.onProgress || function () {}

        });


      /*
       V2 loader may return an object.
       */

      if (
        result &&
        result.buffer instanceof ArrayBuffer
      ) {

        return result.buffer;

      }


      /*
       Some loaders directly return ArrayBuffer.
       */

      if (result instanceof ArrayBuffer) {
        return result;
      }


      /*
       Uint8Array support.
       */

      if (
        result &&
        result.buffer instanceof ArrayBuffer
      ) {

        return result.buffer;

      }


      throw new Error(
        "FIDELIS: Model binary could not be loaded."
      );

    },


    /* =====================================================
       CREATE SESSION
       ===================================================== */

    async createSession(quality, options = {}) {

      const q = this.normalizeQuality(quality);


      if (this.sessions.has(q)) {
        return this.sessions.get(q);
      }


      await this.initRuntime();


      const model =
        this.getModel(q);


      this.checkTier(model);


      const binary =
        await this.loadModel(q, options);


      if (
        !window.FidelisRuntime ||
        typeof window.FidelisRuntime.createSession !== "function"
      ) {

        throw new Error(
          "FIDELIS: Runtime session creator unavailable."
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


      this.sessions.set(q, session);


      return session;

    },


    /* =====================================================
       CREATE INPUT TENSOR
       ===================================================== */

    createInputTensor(imageData, model) {

      if (
        !window.FidelisAIModelAdapter
      ) {

        throw new Error(
          "FIDELIS: Model adapter unavailable."
        );

      }


      if (
        typeof window.FidelisAIModelAdapter.createInputTensor ===
        "function"
      ) {

        return window.FidelisAIModelAdapter.createInputTensor(
          imageData,
          model
        );

      }


      if (
        typeof window.FidelisAIInference?.imageToTensor ===
        "function"
      ) {

        return window.FidelisAIInference.imageToTensor(
          imageData
        );

      }


      throw new Error(
        "FIDELIS: Input tensor converter unavailable."
      );

    },


    /* =====================================================
       RUN INFERENCE
       ===================================================== */

    async run(imageData, quality, options = {}) {

      const q =
        this.normalizeQuality(quality);


      const model =
        this.getModel(q);


      if (!model) {

        throw new Error(
          "FIDELIS: AI model configuration missing."
        );

      }


      this.checkTier(model);


      /*
       Get session.
      */

      const session =
        await this.createSession(
          q,
          options
        );


      if (!session) {

        throw new Error(
          "FIDELIS: Could not create inference session."
        );

      }


      /*
       Create tensor.
      */

      const tensor =
        this.createInputTensor(
          imageData,
          model
        );


      if (!tensor) {

        throw new Error(
          "FIDELIS: Input tensor creation failed."
        );

      }


      /*
       Prefer AIInference runner.
       */

      if (
        window.FidelisAIInference &&
        typeof window.FidelisAIInference.runSession ===
        "function"
      ) {

        const output =
          await window.FidelisAIInference.runSession(
            session,
            tensor
          );


        return {
          output,
          model,
          quality: q,
          scale: Number(model.scale || 1),
          aiProcessed: true,
          fallback: false
        };

      }


      /*
       Direct ONNX Runtime session.
       */

      const inputNames =
        session.inputNames || [];


      const outputNames =
        session.outputNames || [];


      if (!inputNames.length) {

        throw new Error(
          "FIDELIS: Model has no input nodes."
        );

      }


      const feeds = {};

      feeds[inputNames[0]] =
        tensor;


      const results =
        await session.run(feeds);


      let output =
        outputNames.length
          ? results[outputNames[0]]
          : Object.values(results)[0];


      if (!output) {

        throw new Error(
          "FIDELIS: Model returned no output."
        );

      }


      return {

        output,

        model,

        quality: q,

        scale:
          Number(model.scale || 1),

        aiProcessed: true,

        fallback: false

      };

    },


    /* =====================================================
       OUTPUT TO CANVAS
       ===================================================== */

    outputToCanvas(output, model) {

      if (
        window.FidelisAIModelAdapter &&
        typeof window.FidelisAIModelAdapter.outputToCanvas ===
        "function"
      ) {

        return window.FidelisAIModelAdapter.outputToCanvas(
          output,
          model
        );

      }


      if (
        window.FidelisAIInference &&
        typeof window.FidelisAIInference.outputToImage ===
        "function"
      ) {

        return window.FidelisAIInference.outputToImage(
          output
        );

      }


      throw new Error(
        "FIDELIS: Output converter unavailable."
      );

    },


    /* =====================================================
       DISPOSE SESSION
       ===================================================== */

    async dispose(quality) {

      const q =
        this.normalizeQuality(quality);


      const session =
        this.sessions.get(q);


      if (!session) {
        return;
      }


      try {

        if (
          typeof session.release === "function"
        ) {

          await session.release();

        }

        else if (
          typeof session.dispose === "function"
        ) {

          await session.dispose();

        }

      } catch (error) {

        console.warn(
          "FIDELIS: Session dispose warning",
          error
        );

      }


      this.sessions.delete(q);

    },


    /* =====================================================
       DISPOSE ALL
       ===================================================== */

    async disposeAll() {

      const qualities =
        Array.from(
          this.sessions.keys()
        );


      for (const q of qualities) {

        await this.dispose(q);

      }

    },


    /* =====================================================
       STATUS
       ===================================================== */

    getStatus() {

      const models =
        window.FidelisModelRegistry
          ? window.FidelisModelRegistry.getAll()
          : null;


      return {

        initialized:
          this.initialized,

        sessions:
          Array.from(
            this.sessions.keys()
          ),

        models

      };

    }

  };


  window.FidelisAIModelBridge = Bridge;


})();
