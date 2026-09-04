/* =========================================================
   FIDELIS AI PIPELINE ROUTER
   ========================================================= */

(function () {

  "use strict";


  const Router = {


    /* =====================================================
       QUALITY
       ===================================================== */

    normalizeQuality(
      quality
    ) {

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
       PROCESS IMAGE
       ===================================================== */

    async processImage(
      source,
      quality = "standard",
      options = {}
    ) {

      const q =
        this.normalizeQuality(
          quality
        );


      const onProgress =
        options.onProgress;


      this.report(
        onProgress,
        0,
        "Checking AI model..."
      );


      /*
       Health check.
       */

      if (
        window.FidelisModelHealth &&
        typeof window.FidelisModelHealth.check ===
        "function"
      ) {

        const health =
          await window.FidelisModelHealth.check(
            q
          );


        if (
          !health ||
          health.ready === false
        ) {

          const reason =
            health?.reason ||
            health?.error ||
            "AI model unavailable.";


          throw new Error(
            "FIDELIS AI: " +
            reason
          );

        }

      }


      this.report(
        onProgress,
        8,
        "AI model ready."
      );


      /*
       Pipeline must exist.
       */

      if (
        !window.FidelisImagePipeline ||
        typeof window.FidelisImagePipeline.enhance !==
        "function"
      ) {

        throw new Error(
          "FIDELIS: Image pipeline unavailable."
        );

      }


      this.report(
        onProgress,
        12,
        "Preparing image..."
      );


      /*
       Run actual image pipeline.
       */

      const result =
        await window.FidelisImagePipeline.enhance(
          source,
          q,
          {

            ...options,

            onProgress:
              function (
                value,
                text
              ) {

                const numeric =
                  Number(
                    value || 0
                  );


                /*
                 Pipeline = 12 → 94
                 */

                const mapped =
                  12 +
                  numeric *
                  0.82;


                this.report(
                  onProgress,
                  mapped,
                  text ||
                  "Running AI enhancement..."
                );

              }.bind(this)

          }
        );


      if (
        !result ||
        !result.canvas
      ) {

        throw new Error(
          "FIDELIS: AI pipeline returned no canvas."
        );

      }


      this.report(
        onProgress,
        96,
        "Validating AI result..."
      );


      /*
       Validate dimensions.
       */

      if (
        result.canvas.width <= 0 ||
        result.canvas.height <= 0
      ) {

        throw new Error(
          "FIDELIS: Invalid AI output dimensions."
        );

      }


      this.report(
        onProgress,
        100,
        "AI enhancement complete."
      );


      return {

        canvas:
          result.canvas,

        width:
          result.canvas.width,

        height:
          result.canvas.height,

        quality:
          q,

        scale:
          result.scale ||
          1,

        model:
          result.model ||
          null,

        aiProcessed:
          result.aiProcessed === true,

        fallback:
          result.fallback === true,

        engine:
          result.engine ||
          "Real-ESRGAN",

        backend:
          result.backend ||
          "ONNX Runtime Web"

      };

    },


    /* =====================================================
       REPORT
       ===================================================== */

    report(
      callback,
      value,
      text
    ) {

      if (
        typeof callback !==
        "function"
      ) {

        return;

      }


      callback(

        Math.max(
          0,
          Math.min(
            100,
            Number(value) || 0
          )
        ),

        text ||
        ""

      );

    },


    /* =====================================================
       READY CHECK
       ===================================================== */

    async isReady(
      quality = "standard"
    ) {

      const q =
        this.normalizeQuality(
          quality
        );


      /*
       Model health.
       */

      if (
        window.FidelisModelHealth &&
        typeof window.FidelisModelHealth.canUse ===
        "function"
      ) {

        try {

          return Boolean(
            await window.FidelisModelHealth.canUse(
              q
            )
          );

        }

        catch (
          error
        ) {

          console.warn(
            "FIDELIS readiness:",
            error
          );

          return false;

        }

      }


      /*
       Registry fallback.
       */

      if (
        window.FidelisModelRegistry &&
        typeof window.FidelisModelRegistry.isConfigured ===
        "function"
      ) {

        return Boolean(
          window.FidelisModelRegistry.isConfigured(
            q
          )
        );

      }


      return false;

    },


    /* =====================================================
       MODEL ERROR
       ===================================================== */

    getModelError(
      quality = "standard"
    ) {

      const q =
        this.normalizeQuality(
          quality
        );


      if (
        window.FidelisModelRegistry
      ) {

        const model =
          window.FidelisModelRegistry.get(
            q
          );


        if (!model) {

          return {
            code:
              "MODEL_NOT_FOUND",

            message:
              "AI model configuration not found."
          };

        }


        if (!model.url) {

          return {
            code:
              "MODEL_NOT_CONFIGURED",

            message:
              "AI model URL is not configured."
          };

        }

      }


      return null;

    },


    /* =====================================================
       STATUS
       ===================================================== */

    getStatus(
      quality = "standard"
    ) {

      const q =
        this.normalizeQuality(
          quality
        );


      const model =
        window.FidelisModelRegistry
          ? window.FidelisModelRegistry.get(q)
          : null;


      return {

        quality:
          q,

        model:
          model,

        modelConfigured:
          Boolean(
            model &&
            model.url
          ),

        health:
          window.FidelisModelHealth
            ? window.FidelisModelHealth.getStatus?.(q) || null
            : null,

        pipeline:
          Boolean(
            window.FidelisImagePipeline
          ),

        bridge:
          Boolean(
            window.FidelisAIModelBridge
          ),

        runtime:
          Boolean(
            window.FidelisRuntime
          )

      };

    }

  };


  window.FidelisPipelineRouter =
    Router;


})();
