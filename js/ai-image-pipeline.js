(function () {
  "use strict";

  const FidelisImagePipeline = {

    version: "1.0.0",

    async enhance(
      source,
      quality = "standard",
      options = {}
    ) {

      if (!source) {
        throw new Error(
          "Source image tidak ditemukan."
        );
      }

      /*
       * Convert source ke canvas.
       */
      const sourceCanvas =
        await this.toCanvas(source);

      const width =
        sourceCanvas.width;

      const height =
        sourceCanvas.height;

      if (!width || !height) {
        throw new Error(
          "Ukuran gambar tidak valid."
        );
      }

      /*
       * Cari model.
       */
      if (
        typeof FidelisAIModelConfig ===
        "undefined"
      ) {
        throw new Error(
          "AI Model Config belum tersedia."
        );
      }

      const normalizedQuality =
        FidelisAIModelConfig
          .normalizeQuality(quality);

      const model =
        FidelisAIModelConfig
          .get(normalizedQuality);

      if (!model) {
        throw new Error(
          "Model tidak ditemukan."
        );
      }

      /*
       * Scale model.
       */
      const scale =
        Number(model.scale) || 2;

      /*
       * Tentukan tile size berdasarkan device.
       */
      let tileSettings = {
        tileSize: 512,
        overlap: 32
      };

      if (
        typeof FidelisTileEngine !==
        "undefined"
      ) {
        tileSettings =
          FidelisTileEngine
            .getRecommendedSettings(
              width,
              height
            );
      }

      if (options.tileSize) {
        tileSettings.tileSize =
          options.tileSize;
      }

      if (options.overlap !== undefined) {
        tileSettings.overlap =
          options.overlap;
      }

      /*
       * Processor AI.
       */
      const processTile =
        async (
          tileCanvas,
          tile,
          index,
          total
        ) => {

          if (
            typeof FidelisAIModelBridge ===
            "undefined"
          ) {
            throw new Error(
              "AI Model Bridge belum tersedia."
            );
          }

          /*
           * Progress.
           */
          if (
            typeof options.onProgress ===
            "function"
          ) {
            options.onProgress({
              stage: "ai",
              current: index,
              total,
              percent:
                Math.round(
                  (index / total) * 100
                )
            });
          }

          /*
           * Jalankan ONNX.
           */
          const result =
            await FidelisAIModelBridge.run(
              tileCanvas,
              normalizedQuality
            );

          if (
            !result ||
            !result.canvas
          ) {
            throw new Error(
              "AI tidak menghasilkan output."
            );
          }

          /*
           * Pastikan output sesuai scale.
           */
          const expectedWidth =
            Math.round(
              tile.width * scale
            );

          const expectedHeight =
            Math.round(
              tile.height * scale
            );

          /*
           * Bila model menghasilkan ukuran
           * berbeda, normalisasi ke ukuran target.
           */
          if (
            result.canvas.width !==
              expectedWidth ||
            result.canvas.height !==
              expectedHeight
          ) {

            const normalized =
              document.createElement(
                "canvas"
              );

            normalized.width =
              expectedWidth;

            normalized.height =
              expectedHeight;

            const ctx =
              normalized.getContext(
                "2d"
              );

            ctx.drawImage(
              result.canvas,
              0,
              0,
              expectedWidth,
              expectedHeight
            );

            return normalized;
          }

          return result.canvas;
        };

      /*
       * Kalau TileEngine tersedia,
       * gunakan tiled inference.
       */
      if (
        typeof FidelisTileEngine !==
        "undefined"
      ) {

        const result =
          await FidelisTileEngine.process(
            sourceCanvas,
            processTile,
            {
              tileSize:
                tileSettings.tileSize,

              overlap:
                tileSettings.overlap,

              scale,

              onProgress:
                options.onProgress
            }
          );

        return {
          canvas: result.canvas,

          width: result.width,
          height: result.height,

          quality:
            normalizedQuality,

          scale,

          tilesProcessed:
            result.tilesProcessed,

          tileSize:
            result.tileSize,

          aiProcessed: true,

          fallback: false,

          engine: "FIDELIS AI",

          backend:
            typeof FidelisRuntime !==
            "undefined"
              ? FidelisRuntime
                  .getStatus()
                  .backend || "unknown"
              : "unknown"
        };
      }

      /*
       * Fallback jika TileEngine belum tersedia.
       */
      const result =
        await FidelisAIModelBridge.run(
          sourceCanvas,
          normalizedQuality
        );

      return {
        canvas: result.canvas,

        width: result.canvas.width,
        height: result.canvas.height,

        quality:
          normalizedQuality,

        scale,

        tilesProcessed: 1,

        tileSize:
          sourceCanvas.width,

        aiProcessed: true,

        fallback: false,

        engine: "FIDELIS AI",

        backend:
          result.backend || "unknown"
      };
    },


    async toCanvas(source) {

      if (
        source instanceof HTMLCanvasElement
      ) {
        return source;
      }

      if (
        typeof source === "string"
      ) {

        const image =
          await this.loadImage(source);

        return this.imageToCanvas(
          image
        );
      }

      if (
        source instanceof HTMLImageElement
      ) {
        return this.imageToCanvas(
          source
        );
      }

      if (
        typeof ImageBitmap !==
        "undefined" &&
        source instanceof ImageBitmap
      ) {
        return this.imageToCanvas(
          source
        );
      }

      if (
        source instanceof Blob ||
        source instanceof File
      ) {

        const url =
          URL.createObjectURL(source);

        try {

          const image =
            await this.loadImage(url);

          return this.imageToCanvas(
            image
          );

        } finally {

          URL.revokeObjectURL(url);

        }
      }

      throw new Error(
        "Format source gambar tidak didukung."
      );
    },


    loadImage(url) {

      return new Promise(
        (resolve, reject) => {

          const image =
            new Image();

          image.onload = () => {
            resolve(image);
          };

          image.onerror = () => {
            reject(
              new Error(
                "Gagal membaca gambar."
              )
            );
          };

          image.src = url;

        }
      );
    },


    imageToCanvas(image) {

      const canvas =
        document.createElement("canvas");

      canvas.width =
        image.naturalWidth ||
        image.width;

      canvas.height =
        image.naturalHeight ||
        image.height;

      const ctx =
        canvas.getContext("2d", {
          willReadFrequently: true
        });

      if (!ctx) {
        throw new Error(
          "Canvas context tidak tersedia."
        );
      }

      ctx.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      return canvas;
    }
  };

  window.FidelisImagePipeline =
    FidelisImagePipeline;

})();
