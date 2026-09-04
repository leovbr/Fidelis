(function () {

  "use strict";

  const Pipeline = {


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


    async enhance(
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
        "Preparing image..."
      );

      /*
       Convert source to canvas.
      */

      const inputCanvas =
        await this.toCanvas(
          source
        );

      if (
        !inputCanvas ||
        !inputCanvas.width ||
        !inputCanvas.height
      ) {

        throw new Error(
          "FIDELIS: Invalid input canvas."
        );

      }

      /*
       Protect browser memory.
      */

      const maxInput =
        Number(
          options.maxInputDimension ||
          4096
        );

      let workingCanvas =
        inputCanvas;

      if (
        Math.max(
          inputCanvas.width,
          inputCanvas.height
        ) > maxInput
      ) {

        workingCanvas =
          this.resizeCanvas(
            inputCanvas,
            maxInput
          );

      }

      this.report(
        onProgress,
        8,
        "Selecting AI model..."
      );

      /*
       Get model.
      */

      let model = null;

      if (
        window.FidelisRealESRGAN &&
        typeof window.FidelisRealESRGAN.get ===
        "function"
      ) {

        model =
          window.FidelisRealESRGAN.get(
            q
          );

      }

      if (
        !model &&
        window.FidelisModelRegistry
      ) {

        model =
          window.FidelisModelRegistry.get(
            q
          );

      }

      if (!model) {

        throw new Error(
          "FIDELIS: AI model not found."
        );

      }

      const scale =
        Number(
          model.scale || 1
        );

      /*
       Processor for each tile.
      */

      const processTile =
        async (
          tileCanvas,
          tileInfo
        ) => {

          const imageData =
            this.getImageData(
              tileCanvas
            );

          this.report(
            onProgress,
            10 +
            (
              tileInfo.index /
              Math.max(
                1,
                tileInfo.total
              )
            ) * 75,
            `Running ${model.name || "AI"}...`
          );

          if (
            !window.FidelisAIModelBridge ||
            typeof window.FidelisAIModelBridge.run !==
            "function"
          ) {

            throw new Error(
              "FIDELIS: AI model bridge unavailable."
            );

          }

          const result =
            await window.FidelisAIModelBridge.run(
              imageData,
              q,
              {

                onProgress:
                  options.onModelProgress

              }
            );

          if (
            !result ||
            !result.canvas
          ) {

            throw new Error(
              "FIDELIS: AI model returned no canvas."
            );

          }

          return result;

        };


      /*
       Decide whether tiling is necessary.
      */

      const settings =
        window.FidelisTileEngine &&
        typeof window.FidelisTileEngine.getRecommendedSettings ===
        "function"
          ? window.FidelisTileEngine.getRecommendedSettings(
              workingCanvas.width,
              workingCanvas.height
            )
          : {
              tileSize: 384,
              overlap: 32
            };


      const shouldTile =
        workingCanvas.width >
          settings.tileSize ||
        workingCanvas.height >
          settings.tileSize;


      let result;


      /*
       DIRECT INFERENCE
       */

      if (!shouldTile) {

        result =
          await processTile(
            workingCanvas,
            {
              x: 0,
              y: 0,
              width:
                workingCanvas.width,
              height:
                workingCanvas.height,
              index: 0,
              total: 1
            }
          );

      }


      /*
       TILE INFERENCE
       */

      else {

        if (
          !window.FidelisTileEngine ||
          typeof window.FidelisTileEngine.process !==
          "function"
        ) {

          throw new Error(
            "FIDELIS: Tile engine unavailable."
          );

        }

        result =
          await window.FidelisTileEngine.process(
            workingCanvas,
            processTile,
            {

              tileSize:
                settings.tileSize,

              overlap:
                settings.overlap,

              onProgress:
                onProgress

            }
          );

      }


      if (
        !result
      ) {

        throw new Error(
          "FIDELIS: Enhancement failed."
        );

      }


      const outputCanvas =
        result.canvas ||
        result;


      if (
        !outputCanvas ||
        !outputCanvas.width ||
        !outputCanvas.height
      ) {

        throw new Error(
          "FIDELIS: Invalid AI output."
        );

      }


      /*
       Safety output limit.
      */

      const maxOutput =
        Number(
          options.maxOutputDimension ||
          8192
        );


      let finalCanvas =
        outputCanvas;


      if (
        Math.max(
          outputCanvas.width,
          outputCanvas.height
        ) > maxOutput
      ) {

        finalCanvas =
          this.resizeCanvas(
            outputCanvas,
            maxOutput
          );

      }


      this.report(
        onProgress,
        96,
        "Finalizing AI result..."
      );


      /*
       Give browser a moment before encoding.
      */

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            0
          )
      );


      this.report(
        onProgress,
        100,
        "AI enhancement complete."
      );


      return {

        canvas:
          finalCanvas,

        width:
          finalCanvas.width,

        height:
          finalCanvas.height,

        scale,

        model,

        quality:
          q,

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


    /*
     ======================================================
     SOURCE → CANVAS
     ======================================================
    */

    async toCanvas(
      source
    ) {

      if (
        source instanceof HTMLCanvasElement
      ) {

        return source;

      }


      if (
        source instanceof HTMLImageElement
      ) {

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width =
          source.naturalWidth ||
          source.width;

        canvas.height =
          source.naturalHeight ||
          source.height;

        const ctx =
          canvas.getContext(
            "2d"
          );

        ctx.drawImage(
          source,
          0,
          0,
          canvas.width,
          canvas.height
        );

        return canvas;

      }


      if (
        source instanceof ImageBitmap
      ) {

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width =
          source.width;

        canvas.height =
          source.height;

        const ctx =
          canvas.getContext(
            "2d"
          );

        ctx.drawImage(
          source,
          0,
          0
        );

        return canvas;

      }


      if (
        source instanceof Blob ||
        source instanceof File
      ) {

        const bitmap =
          await createImageBitmap(
            source
          );

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width =
          bitmap.width;

        canvas.height =
          bitmap.height;

        const ctx =
          canvas.getContext(
            "2d"
          );

        ctx.drawImage(
          bitmap,
          0,
          0
        );

        if (
          typeof bitmap.close ===
          "function"
        ) {

          bitmap.close();

        }

        return canvas;

      }


      if (
        typeof source === "string"
      ) {

        const image =
          await this.loadImage(
            source
          );

        return this.toCanvas(
          image
        );

      }


      throw new Error(
        "FIDELIS: Unsupported image source."
      );

    },


    /*
     ======================================================
     LOAD IMAGE
     ======================================================
    */

    loadImage(
      source
    ) {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          const image =
            new Image();

          image.onload =
            () => resolve(
              image
            );

          image.onerror =
            () => reject(
              new Error(
                "Failed to load image."
              )
            );

          image.src =
            source;

        }
      );

    },


    /*
     ======================================================
     GET IMAGE DATA
     ======================================================
    */

    getImageData(
      canvas
    ) {

      const ctx =
        canvas.getContext(
          "2d",
          {
            willReadFrequently: true
          }
        );

      return ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    },


    /*
     ======================================================
     RESIZE
     ======================================================
    */

    resizeCanvas(
      canvas,
      maxDimension
    ) {

      const largest =
        Math.max(
          canvas.width,
          canvas.height
        );

      if (
        largest <=
        maxDimension
      ) {

        return canvas;

      }

      const ratio =
        maxDimension /
        largest;

      const width =
        Math.max(
          1,
          Math.round(
            canvas.width *
            ratio
          )
        );

      const height =
        Math.max(
          1,
          Math.round(
            canvas.height *
            ratio
          )
        );

      const result =
        document.createElement(
          "canvas"
        );

      result.width =
        width;

      result.height =
        height;

      const ctx =
        result.getContext(
          "2d"
        );

      ctx.imageSmoothingEnabled =
        true;

      ctx.imageSmoothingQuality =
        "high";

      ctx.drawImage(
        canvas,
        0,
        0,
        width,
        height
      );

      return result;

    },


    /*
     ======================================================
     PROGRESS
     ======================================================
    */

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

        text || ""

      );

    },


    /*
     ======================================================
     STATUS
     ======================================================
    */

    getStatus() {

      return {

        ready:
          Boolean(
            window.FidelisAIModelBridge
          ),

        tileEngine:
          Boolean(
            window.FidelisTileEngine
          ),

        model:
          Boolean(
            window.FidelisModelRegistry
          )

      };

    }

  };


  window.FidelisImagePipeline =
    Pipeline;

})();
