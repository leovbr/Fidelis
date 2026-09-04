/* =========================================================
   FIDELIS IMAGE AI
   Main image enhancement controller
   ========================================================= */

(function () {

  "use strict";


  const ImageAI = {


    /* =====================================================
       VALIDATE
       ===================================================== */

    validateFile(file) {

      if (!file) {

        throw new Error(
          "No image selected."
        );

      }


      if (
        !file.type ||
        !file.type.startsWith("image/")
      ) {

        throw new Error(
          "Please select a valid image."
        );

      }


      const maxSize =
        20 * 1024 * 1024;


      if (file.size > maxSize) {

        throw new Error(
          "Image is too large. Maximum size is 20MB."
        );

      }


      return true;

    },


    /* =====================================================
       LOAD IMAGE
       ===================================================== */

    loadImage(source) {

      return new Promise(
        (resolve, reject) => {

          const image =
            new Image();


          image.onload = function () {

            resolve(image);

          };


          image.onerror = function () {

            reject(
              new Error(
                "Failed to decode image."
              )
            );

          };


          if (
            source instanceof Blob ||
            source instanceof File
          ) {

            image.src =
              URL.createObjectURL(source);

          }

          else if (
            typeof source === "string"
          ) {

            image.src =
              source;

          }

          else {

            reject(
              new Error(
                "Unsupported image source."
              )
            );

          }

        }
      );

    },


    /* =====================================================
       PROGRESS
       ===================================================== */

    progress(callback, value, text) {

      if (
        typeof callback === "function"
      ) {

        callback(
          Math.max(
            0,
            Math.min(
              100,
              value
            )
          ),
          text || ""
        );

      }

    },


    /* =====================================================
       ENHANCE
       ===================================================== */

    async enhance(source, quality = "standard", options = {}) {

      const q =
        this.normalizeQuality(quality);


      const onProgress =
        options.onProgress;


      this.progress(
        onProgress,
        2,
        "Checking image..."
      );


      /*
       File validation.
       */

      if (
        source instanceof File ||
        source instanceof Blob
      ) {

        this.validateFile(source);

      }


      this.progress(
        onProgress,
        8,
        "Loading image..."
      );


      /*
       Load image if necessary.
       */

      let image =
        source;


      if (
        source instanceof File ||
        source instanceof Blob
      ) {

        image =
          await this.loadImage(source);

      }


      if (
        !image ||
        !image.width ||
        !image.height
      ) {

        throw new Error(
          "Invalid image source."
        );

      }


      this.progress(
        onProgress,
        15,
        "Preparing identity protection..."
      );


      /*
       Face Guard.
       */

      let guard = null;


      if (
        window.FidelisFaceGuard
      ) {

        try {

          guard =
            await window.FidelisFaceGuard.prepare(
              image,
              {
                quality: q
              }
            );

        } catch (error) {

          console.warn(
            "FIDELIS FaceGuard:",
            error
          );

        }

      }


      this.progress(
        onProgress,
        22,
        "Checking AI model..."
      );


      /*
       Make sure router exists.
       */

      if (
        !window.FidelisPipelineRouter ||
        typeof window.FidelisPipelineRouter.processImage !==
        "function"
      ) {

        throw new Error(
          "FIDELIS AI Pipeline is unavailable."
        );

      }


      this.progress(
        onProgress,
        28,
        "Preparing AI engine..."
      );


      /*
       Real AI pipeline.
       */

      const result =
        await window.FidelisPipelineRouter.processImage(
          image,
          q,
          {

            ...options,

            onProgress: function (value, text) {

              /*
               Pipeline usually reports 0-100.
               Map it into 28-92.
               */

              const mapped =
                28 +
                (
                  Number(value || 0) *
                  0.64
                );


              this.progress(
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
          "AI enhancement returned no image."
        );

      }


      this.progress(
        onProgress,
        94,
        "Finalizing result..."
      );


      /*
       Identity protection finalization.
       */

      if (
        guard &&
        window.FidelisFaceGuard &&
        typeof window.FidelisFaceGuard.finalize ===
        "function"
      ) {

        try {

          await window.FidelisFaceGuard.finalize(
            result.canvas,
            guard
          );

        } catch (error) {

          console.warn(
            "FIDELIS FaceGuard finalize:",
            error
          );

        }

      }


      this.progress(
        onProgress,
        98,
        "Encoding result..."
      );


      /*
       Convert canvas to Blob.
       */

      const blob =
        await this.canvasToBlob(
          result.canvas,
          options.mimeType ||
          "image/jpeg",
          options.quality ||
          0.96
        );


      this.progress(
        onProgress,
        100,
        "Complete."
      );


      return {

        blob,

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

        aiProcessed:
          result.aiProcessed === true,

        fallback:
          result.fallback === true,

        engine:
          result.engine ||
          "FIDELIS AI",

        backend:
          result.backend ||
          "ONNX",

        model:
          result.model ||
          null

      };

    },


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
       CANVAS TO BLOB
       ===================================================== */

    canvasToBlob(
      canvas,
      type = "image/jpeg",
      quality = 0.96
    ) {

      return new Promise(
        (resolve, reject) => {

          canvas.toBlob(
            function (blob) {

              if (!blob) {

                reject(
                  new Error(
                    "Failed to encode enhanced image."
                  )
                );

                return;

              }


              resolve(blob);

            },
            type,
            quality
          );

        }
      );

    },


    /* =====================================================
       ENHANCE FILE
       ===================================================== */

    async enhanceFile(
      file,
      quality = "standard",
      options = {}
    ) {

      return this.enhance(
        file,
        quality,
        options
      );

    },


    /* =====================================================
       CHECK AI READY
       ===================================================== */

    async isReady(
      quality = "standard"
    ) {

      const q =
        this.normalizeQuality(quality);


      if (
        window.FidelisPipelineRouter &&
        typeof window.FidelisPipelineRouter.isReady ===
        "function"
      ) {

        return (
          await window.FidelisPipelineRouter.isReady(q)
        );

      }


      return false;

    },


    /* =====================================================
       STATUS
       ===================================================== */

    getStatus(
      quality = "standard"
    ) {

      const q =
        this.normalizeQuality(quality);


      if (
        window.FidelisPipelineRouter &&
        typeof window.FidelisPipelineRouter.getStatus ===
        "function"
      ) {

        return (
          window.FidelisPipelineRouter.getStatus(q)
        );

      }


      return {

        quality: q,

        ready: false,

        reason:
          "Pipeline unavailable."

      };

    }

  };


  window.FidelisImageAI = ImageAI;


})();
