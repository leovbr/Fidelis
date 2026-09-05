(function () {
  "use strict";

  function getMemoryGB() {
    if (
      typeof navigator !== "undefined" &&
      Number.isFinite(navigator.deviceMemory)
    ) {
      return navigator.deviceMemory;
    }

    return 4;
  }

  function getRecommendedSettings(
    width,
    height,
    options = {}
  ) {
    const memory =
      getMemoryGB();

    const pixels =
      width * height;

    /*
     * User bisa override manual.
     */
    if (
      options.tileSize ||
      options.overlap
    ) {
      return {
        tileSize:
          Number(options.tileSize) || 512,

        overlap:
          Number(options.overlap) || 32
      };
    }

    /*
     * Chromebook / device RAM kecil.
     */
    if (memory <= 2) {
      return {
        tileSize: 256,
        overlap: 24
      };
    }

    if (memory <= 4) {
      return {
        tileSize: 384,
        overlap: 32
      };
    }

    /*
     * Gambar besar.
     */
    if (pixels > 20_000_000) {
      return {
        tileSize: 384,
        overlap: 32
      };
    }

    if (pixels > 8_000_000) {
      return {
        tileSize: 448,
        overlap: 32
      };
    }

    return {
      tileSize: 512,
      overlap: 32
    };
  }

  function createCanvas(
    width,
    height
  ) {
    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      Math.max(
        1,
        Math.round(width)
      );

    canvas.height =
      Math.max(
        1,
        Math.round(height)
      );

    return canvas;
  }

  function extractTile(
    source,
    x,
    y,
    width,
    height
  ) {
    const canvas =
      createCanvas(
        width,
        height
      );

    const ctx =
      canvas.getContext(
        "2d",
        {
          alpha: false,
          willReadFrequently: true
        }
      );

    ctx.drawImage(
      source,
      x,
      y,
      width,
      height,
      0,
      0,
      width,
      height
    );

    return canvas;
  }

  function createGrid(
    width,
    height,
    tileSize,
    overlap
  ) {
    /*
     * Step harus lebih kecil dari tileSize
     * supaya tile overlap.
     */
    const step =
      Math.max(
        1,
        tileSize -
          overlap * 2
      );

    const tiles = [];

    for (
      let y = 0;
      y < height;
      y += step
    ) {
      for (
        let x = 0;
        x < width;
        x += step
      ) {
        const x0 =
          Math.max(
            0,
            x - overlap
          );

        const y0 =
          Math.max(
            0,
            y - overlap
          );

        const x1 =
          Math.min(
            width,
            x + tileSize - overlap
          );

        const y1 =
          Math.min(
            height,
            y + tileSize - overlap
          );

        const tileWidth =
          x1 - x0;

        const tileHeight =
          y1 - y0;

        if (
          tileWidth <= 0 ||
          tileHeight <= 0
        ) {
          continue;
        }

        tiles.push({
          index:
            tiles.length,

          x: x0,
          y: y0,

          width:
            tileWidth,

          height:
            tileHeight,

          coreX:
            Math.max(
              x,
              0
            ),

          coreY:
            Math.max(
              y,
              0
            ),

          coreWidth:
            Math.min(
              tileSize,
              width - Math.max(x, 0)
            ),

          coreHeight:
            Math.min(
              tileSize,
              height - Math.max(y, 0)
            )
        });
      }
    }

    return tiles;
  }

  function yieldToBrowser() {
    return new Promise(resolve => {
      if (
        typeof requestAnimationFrame ===
        "function"
      ) {
        requestAnimationFrame(
          () => resolve()
        );
      } else {
        setTimeout(
          resolve,
          0
        );
      }
    });
  }

  function compositeTile(
    output,
    tileCanvas,
    tile,
    scale
  ) {
    const ctx =
      output.getContext(
        "2d"
      );

    /*
     * Area dari source tile yang dipakai
     * untuk core region.
     */
    const sourceX =
      Math.max(
        0,
        tile.coreX - tile.x
      );

    const sourceY =
      Math.max(
        0,
        tile.coreY - tile.y
      );

    const sourceWidth =
      Math.min(
        tile.coreWidth,
        tile.width - sourceX
      );

    const sourceHeight =
      Math.min(
        tile.coreHeight,
        tile.height - sourceY
      );

    if (
      sourceWidth <= 0 ||
      sourceHeight <= 0
    ) {
      return;
    }

    const destX =
      Math.round(
        tile.coreX * scale
      );

    const destY =
      Math.round(
        tile.coreY * scale
      );

    const destWidth =
      Math.round(
        sourceWidth * scale
      );

    const destHeight =
      Math.round(
        sourceHeight * scale
      );

    ctx.drawImage(
      tileCanvas,

      Math.round(
        sourceX * scale
      ),

      Math.round(
        sourceY * scale
      ),

      destWidth,
      destHeight,

      destX,
      destY,

      destWidth,
      destHeight
    );
  }

  async function process(
    sourceCanvas,
    processor,
    options = {}
  ) {
    if (
      !sourceCanvas ||
      !sourceCanvas.width ||
      !sourceCanvas.height
    ) {
      throw new Error(
        "Source canvas tidak valid."
      );
    }

    if (
      typeof processor !==
      "function"
    ) {
      throw new Error(
        "Tile processor tidak tersedia."
      );
    }

    const settings =
      getRecommendedSettings(
        sourceCanvas.width,
        sourceCanvas.height,
        options
      );

    const tileSize =
      Math.max(
        64,
        Math.floor(
          settings.tileSize
        )
      );

    const overlap =
      Math.max(
        0,
        Math.min(
          Math.floor(
            settings.overlap
          ),
          Math.floor(
            tileSize / 3
          )
        )
      );

    /*
     * Kalau gambar kecil, tidak perlu tile.
     */
    if (
      sourceCanvas.width <= tileSize &&
      sourceCanvas.height <= tileSize &&
      options.forceTiles !== true
    ) {
      const result =
        await processor(
          sourceCanvas,
          {
            index: 0,
            total: 1,
            progress: 0
          }
        );

      if (
        !result ||
        !result.canvas
      ) {
        throw new Error(
          "Processor tidak menghasilkan canvas."
        );
      }

      return result;
    }

    const tiles =
      createGrid(
        sourceCanvas.width,
        sourceCanvas.height,
        tileSize,
        overlap
      );

    if (!tiles.length) {
      throw new Error(
        "Tidak ada tile yang dapat diproses."
      );
    }

    let outputScale =
      Number(options.scale) || 0;

    let outputCanvas = null;

    for (
      let i = 0;
      i < tiles.length;
      i++
    ) {
      const tile =
        tiles[i];

      const progressBefore =
        (i / tiles.length) * 100;

      if (
        typeof options.onProgress ===
        "function"
      ) {
        options.onProgress({
          progress:
            progressBefore,

          percent:
            progressBefore,

          current:
            i + 1,

          total:
            tiles.length,

          tile
        });
      }

      const tileCanvas =
        extractTile(
          sourceCanvas,
          tile.x,
          tile.y,
          tile.width,
          tile.height
        );

      const result =
        await processor(
          tileCanvas,
          {
            index: i,
            total: tiles.length,

            progress:
              progressBefore,

            tile
          }
        );

      if (
        !result ||
        !result.canvas
      ) {
        throw new Error(
          `Tile ${i + 1} tidak menghasilkan output.`
        );
      }

      const processed =
        result.canvas;

      /*
       * Cari scale dari output aktual.
       */
      if (
        !outputScale ||
        !Number.isFinite(
          outputScale
        )
      ) {
        outputScale =
          processed.width /
          tile.width;
      }

      if (
        !outputScale ||
        outputScale <= 0
      ) {
        throw new Error(
          "Scale output AI tidak valid."
        );
      }

      if (!outputCanvas) {
        outputCanvas =
          createCanvas(
            Math.round(
              sourceCanvas.width *
              outputScale
            ),
            Math.round(
              sourceCanvas.height *
              outputScale
            )
          );

        const ctx =
          outputCanvas.getContext(
            "2d"
          );

        ctx.imageSmoothingEnabled =
          true;

        ctx.imageSmoothingQuality =
          "high";
      }

      compositeTile(
        outputCanvas,
        processed,
        tile,
        outputScale
      );

      /*
       * Buang referensi tile sebelum lanjut.
       * Ini membantu GC pada browser dengan RAM kecil.
       */
      tileCanvas.width = 1;
      tileCanvas.height = 1;

      processed.width = 1;
      processed.height = 1;

      if (
        typeof options.onProgress ===
        "function"
      ) {
        const progress =
          ((i + 1) /
            tiles.length) *
          100;

        options.onProgress({
          progress,
          percent: progress,

          current:
            i + 1,

          total:
            tiles.length,

          tile
        });
      }

      await yieldToBrowser();
    }

    if (!outputCanvas) {
      throw new Error(
        "Output canvas tidak terbentuk."
      );
    }

    return {
      canvas:
        outputCanvas,

      width:
        outputCanvas.width,

      height:
        outputCanvas.height,

      scale:
        outputScale,

      tiles:
        tiles.length,

      aiProcessed:
        true,

      fallback:
        false
    };
  }

  window.FidelisTileEngine = {
    getRecommendedSettings,
    createGrid,
    extractTile,
    process
  };

  window.FidelisAITileEngine =
    window.FidelisTileEngine;

  console.log(
    "[FIDELIS] Tile Engine loaded."
  );
})();
