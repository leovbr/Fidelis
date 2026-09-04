(function () {
  "use strict";

  const FidelisPipelineRouter = {

    version: "1.0.0",

    async processImage(
      source,
      quality = "standard",
      options = {}
    ) {

      if (!source) {
        throw new Error(
          "Image source tidak ditemukan."
        );
      }


      const selectedQuality =
        this.normalizeQuality(
          quality
        );


      /*
       * Pastikan model tersedia.
       */
      if (
        typeof FidelisModelHealth !==
        "undefined"
      ) {

        const health =
          await FidelisModelHealth.check(
            selectedQuality
          );

        if (!health.success) {

          throw new Error(
            this.getModelError(
              health
            )
          );

        }

      }


      /*
       * Gunakan pipeline AI.
       */
      if (
        typeof FidelisImagePipeline ===
        "undefined"
      ) {

        throw new Error(
          "FIDELIS Image Pipeline belum tersedia."
        );

      }


      return FidelisImagePipeline.enhance(
        source,
        selectedQuality,
        {

          tileSize:
            options.tileSize,

          overlap:
            options.overlap,

          onProgress:
            options.onProgress

        }
      );

    },


    normalizeQuality(
      quality
    ) {

      const value =
        String(
          quality || "standard"
        ).toLowerCase();


      if (
        value === "ultra" ||
        value === "4k"
      ) {
        return "ultra";
      }


      if (
        value === "high" ||
        value === "hd+"
      ) {
        return "high";
      }


      return "standard";

    },


    getModelError(
      health
    ) {

      if (
        !health.configured
      ) {

        return (
          "Model AI belum dikonfigurasi. " +
          "FIDELIS belum bisa menjalankan " +
          "AI enhancement."
        );

      }


      if (
        !health.reachable
      ) {

        return (
          "Model AI tidak dapat diakses. " +
          "Periksa URL model atau koneksi internet."
        );

      }


      return (
        health.error ||
        "AI model tidak siap digunakan."
      );

    },


    async isReady(
      quality = "standard"
    ) {

      const selectedQuality =
        this.normalizeQuality(
          quality
        );


      if (
        typeof FidelisModelHealth ===
        "undefined"
      ) {
        return false;
      }


      return FidelisModelHealth.canUse(
        selectedQuality
      );

    },


    getStatus() {

      return {

        pipeline:
          typeof FidelisImagePipeline !==
          "undefined",

        tileEngine:
          typeof FidelisTileEngine !==
          "undefined",

        modelHealth:
          typeof FidelisModelHealth !==
          "undefined",

        modelBootstrap:
          typeof FidelisModelBootstrap !==
          "undefined",

        runtime:
          typeof FidelisRuntime !==
          "undefined",

        inference:
          typeof FidelisAIInference !==
          "undefined",

        bridge:
          typeof FidelisAIModelBridge !==
          "undefined"

      };

    }

  };


  window.FidelisPipelineRouter =
    FidelisPipelineRouter;

})();
