(function () {
  "use strict";

  const FidelisTileEngine = {
    version: "1.0.0",

    defaultTileSize: 512,
    defaultOverlap: 32,

    calculateGrid(width, height, tileSize, overlap) {
      const step = Math.max(
        1,
        tileSize - overlap * 2
      );

      const columns =
        Math.ceil((width - overlap) / step);

      const rows =
        Math.ceil((height - overlap) / step);

      return {
        columns,
        rows,
        total: columns * rows
      };
    },

    createTiles(
      canvas,
      options = {}
    ) {
      const tileSize =
        options.tileSize ||
        this.defaultTileSize;

      const overlap =
        options.overlap ??
        this.defaultOverlap;

      const width = canvas.width;
      const height = canvas.height;

      const tiles = [];

      let index = 0;

      for (
        let y = 0;
        y < height;
        y += tileSize - overlap * 2
      ) {
        for (
          let x = 0;
          x < width;
          x += tileSize - overlap * 2
        ) {
          const left = Math.max(
            0,
            x - overlap
          );

          const top = Math.max(
            0,
            y - overlap
          );

          const right = Math.min(
            width,
            x + tileSize + overlap
          );

          const bottom = Math.min(
            height,
            y + tileSize + overlap
          );

          const tileWidth =
            right - left;

          const tileHeight =
            bottom - top;

          const tileCanvas =
            document.createElement("canvas");

          tileCanvas.width = tileWidth;
          tileCanvas.height = tileHeight;

          const ctx =
            tileCanvas.getContext("2d", {
              willReadFrequently: true
            });

          ctx.drawImage(
            canvas,
            left,
            top,
            tileWidth,
            tileHeight,
            0,
            0,
            tileWidth,
            tileHeight
          );

          tiles.push({
            index,

            x: left,
            y: top,

            width: tileWidth,
            height: tileHeight,

            canvas: tileCanvas
          });

          index++;
        }
      }

      return tiles;
    },

    async process(
      canvas,
      processor,
      options = {}
    ) {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error(
          "TileEngine membutuhkan HTMLCanvasElement."
        );
      }

      if (typeof processor !== "function") {
        throw new Error(
          "TileEngine membutuhkan processor function."
        );
      }

      const tileSize =
        options.tileSize ||
        this.defaultTileSize;

      const overlap =
        options.overlap ??
        this.defaultOverlap;

      const scale =
        options.scale || 1;

      const tiles =
        this.createTiles(
          canvas,
          {
            tileSize,
            overlap
          }
        );

      const outputWidth =
        Math.round(canvas.width * scale);

      const outputHeight =
        Math.round(canvas.height * scale);

      const output =
        document.createElement("canvas");

      output.width = outputWidth;
      output.height = outputHeight;

      const outputCtx =
        output.getContext("2d");

      if (!outputCtx) {
        throw new Error(
          "Tidak bisa membuat output canvas."
        );
      }

      const total = tiles.length;

      for (let i = 0; i < total; i++) {
        const tile = tiles[i];

        const processed =
          await processor(
            tile.canvas,
            tile,
            i,
            total
          );

        if (!(processed instanceof HTMLCanvasElement)) {
          throw new Error(
            "Processor tile harus mengembalikan canvas."
          );
        }

        /*
         * Posisi tile mengikuti koordinat gambar asli.
         */
        const drawX =
          Math.round(tile.x * scale);

        const drawY =
          Math.round(tile.y * scale);

        const drawWidth =
          Math.round(tile.width * scale);

        const drawHeight =
          Math.round(tile.height * scale);

        outputCtx.drawImage(
          processed,
          0,
          0,
          processed.width,
          processed.height,
          drawX,
          drawY,
          drawWidth,
          drawHeight
        );

        if (typeof options.onProgress === "function") {
          options.onProgress({
            current: i + 1,
            total,
            percent:
              Math.round(
                ((i + 1) / total) * 100
              )
          });
        }

        /*
         * Kasih kesempatan browser bernapas
         * supaya UI tidak freeze total.
         */
        await new Promise(resolve => {
          setTimeout(resolve, 0);
        });
      }

      return {
        canvas: output,

        width: output.width,
        height: output.height,

        tilesProcessed: total,

        tileSize,
        overlap,

        scale
      };
    },

    chooseTileSize(
      width,
      height,
      deviceMemory
    ) {
      const memory =
        Number(deviceMemory) || 4;

      const pixels =
        width * height;

      /*
       * Device RAM rendah:
       * gunakan tile kecil.
       */
      if (
        memory <= 2 ||
        pixels > 12000000
      ) {
        return 256;
      }

      if (
        memory <= 4 ||
        pixels > 8000000
      ) {
        return 384;
      }

      if (
        memory <= 6 ||
        pixels > 5000000
      ) {
        return 512;
      }

      return 768;
    },

    getRecommendedSettings(
      width,
      height
    ) {
      const memory =
        navigator.deviceMemory || 4;

      const tileSize =
        this.chooseTileSize(
          width,
          height,
          memory
        );

      return {
        tileSize,

        overlap:
          tileSize <= 256
            ? 16
            : 32,

        deviceMemory: memory
      };
    }
  };

  window.FidelisTileEngine =
    FidelisTileEngine;

})();
