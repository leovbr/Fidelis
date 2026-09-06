(function () {
  "use strict";

  /*
   * FIDELIS AI PIPELINE ROUTER
   *
   * This file is intentionally thin.
   *
   * Router:
   *   ↓
   * Image Pipeline:
   *   ↓
   * Model Bridge:
   *   ↓
   * ONNX Runtime:
   *   ↓
   * Real-ESRGAN
   */


  function normalizeQuality(
    quality
  ) {
    if (
      window.FidelisAIImagePipeline &&
      typeof window.FidelisAIImagePipeline.normalizeQuality ===
        "function"
    ) {
      return window.FidelisAIImagePipeline.normalizeQuality(
        quality
      );
    }

    const q =
      String(
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
      q === "high" ||
      q === "ultra"
    ) {
      return q;
    }

    return "standard";
  }


  function getPipeline() {
    if (
      !window.FidelisAIImagePipeline
    ) {
      throw new Error(
        "FidelisAIImagePipeline belum tersedia."
      );
    }

    if (
      typeof window.FidelisAIImagePipeline.processImage !==
      "function"
    ) {
      throw new Error(
        "FidelisAIImagePipeline.processImage tidak tersedia."
      );
    }

    return window.FidelisAIImagePipeline;
  }


  async function processImage(
    source,
    quality = "standard",
    options = {}
  ) {
    const pipeline =
      getPipeline();

    const q =
      normalizeQuality(
        quality
      );

    console.log(
      `[FIDELIS] Router → ${q}`
    );

    /*
     * Forward progress callback.
     */
    const pipelineOptions = {
      ...options,

      onProgress:
        typeof options.onProgress ===
        "function"
          ? options.onProgress
          : undefined
    };

    const result =
      await pipeline.processImage(
        source,
        q,
        pipelineOptions
      );

    if (
      !result
    ) {
      throw new Error(
        "AI Router tidak menerima hasil dari Image Pipeline."
      );
    }

    if (
      result.fallback
    ) {
      throw new Error(
        "AI Router mendeteksi fallback."
      );
    }

    if (
      result.aiProcessed !==
      true
    ) {
      throw new Error(
        "AI Router: hasil bukan AI processing."
      );
    }

    return {
      ...result,

      quality:
        q,

      aiProcessed:
        true,

      fallback:
        false
    };
  }


  async function ensureReady(
    quality = "standard",
    options = {}
  ) {
    const pipeline =
      getPipeline();

    if (
      typeof pipeline.ensureReady !==
      "function"
    ) {
      throw new Error(
        "FidelisAIImagePipeline.ensureReady tidak tersedia."
      );
    }

    return await pipeline.ensureReady(
      normalizeQuality(
        quality
      ),
      options
    );
  }


  async function preload(
    quality = "standard",
    options = {}
  ) {
    return await ensureReady(
      quality,
      options
    );
  }


  function getStatus() {
    try {
      const pipeline =
        getPipeline();

      if (
        typeof pipeline.getStatus ===
        "function"
      ) {
        return pipeline.getStatus();
      }

    } catch (error) {
      return {
        ready:
          false,

        error:
          error.message
      };
    }

    return {
      ready:
        false
    };
  }


  async function dispose(
    quality
  ) {
    const pipeline =
      getPipeline();

    if (
      typeof pipeline.dispose !==
      "function"
    ) {
      return false;
    }

    return await pipeline.dispose(
      normalizeQuality(
        quality
      )
    );
  }


  async function disposeAll() {
    const pipeline =
      getPipeline();

    if (
      typeof pipeline.disposeAll !==
      "function"
    ) {
      return false;
    }

    return await pipeline.disposeAll();
  }


  /*
   * Public API.
   *
   * This is the object that
   * image-ai.js should call.
   */
  window.FidelisPipelineRouter = {
    processImage,
    process: processImage,
    enhance: processImage,
    ensureReady,
    preload,
    getStatus,
    dispose,
    disposeAll,
    normalizeQuality
  };


  console.log(
    "[FIDELIS] AI Pipeline Router V3 loaded."
  );
})();
