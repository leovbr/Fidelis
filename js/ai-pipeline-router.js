(function () {
  "use strict";

  /*
   * FIDELIS PIPELINE ROUTER
   *
   * Semua pemrosesan gambar AI
   * diarahkan ke:
   *
   * FidelisAIImagePipeline
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

    const value =
      String(
        quality || "standard"
      ).toLowerCase();

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

  function getPipeline() {
    if (
      !window.FidelisAIImagePipeline
    ) {
      throw new Error(
        "FidelisAIImagePipeline belum tersedia."
      );
    }

    return window.FidelisAIImagePipeline;
  }

  async function processImage(
    source,
    quality,
    options
  ) {
    const pipeline =
      getPipeline();

    const q =
      normalizeQuality(
        quality
      );

    console.log(
      "[FIDELIS ROUTER] Processing:",
      q
    );

    const result =
      await pipeline.processImage(
        source,
        q,
        options || {}
      );

    /*
     * Hard validation.
     *
     * Tidak boleh lolos kalau ternyata
     * cuma sharpen/filter biasa.
     */
    if (
      !result ||
      result.aiProcessed !== true
    ) {
      throw new Error(
        "FIDELIS: AI processing tidak terkonfirmasi."
      );
    }

    if (
      result.fallback === true
    ) {
      throw new Error(
        "FIDELIS: fallback processing ditolak."
      );
    }

    if (!result.canvas) {
      throw new Error(
        "FIDELIS: canvas hasil tidak tersedia."
      );
    }

    return result;
  }

  async function process(
    source,
    quality,
    options
  ) {
    return processImage(
      source,
      quality,
      options
    );
  }

  async function enhance(
    source,
    quality,
    options
  ) {
    return processImage(
      source,
      quality,
      options
    );
  }

  async function ensureReady(
    quality,
    options
  ) {
    const pipeline =
      getPipeline();

    return pipeline.ensureReady(
      normalizeQuality(
        quality
      ),
      options || {}
    );
  }

  async function preload(
    quality
  ) {
    const pipeline =
      getPipeline();

    return pipeline.preload(
      normalizeQuality(
        quality
      )
    );
  }

  function getStatus() {
    try {
      const pipeline =
        getPipeline();

      return pipeline.getStatus();
    } catch (error) {
      return {
        ready: false,
        error:
          error.message
      };
    }
  }

  async function dispose(
    quality
  ) {
    const pipeline =
      getPipeline();

    return pipeline.dispose(
      normalizeQuality(
        quality
      )
    );
  }

  async function disposeAll() {
    const pipeline =
      getPipeline();

    return pipeline.disposeAll();
  }

  window.FidelisPipelineRouter = {
    processImage,

    process,

    enhance,

    ensureReady,

    preload,

    getStatus,

    dispose,

    disposeAll,

    normalizeQuality
  };

  console.log(
    "%cFIDELIS Pipeline Router loaded.",
    "color:#a78bfa;font-weight:bold;"
  );
})();
