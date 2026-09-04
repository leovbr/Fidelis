(function () {

  "use strict";

  const TileEngine = {

    getRecommendedSettings(width, height) {

      const pixels = width * height;
      const memory = Number(navigator.deviceMemory || 4);

      let tileSize = 512;
      let overlap = 32;

      if (memory <= 2) {
        tileSize = 256;
        overlap = 24;
      } else if (memory <= 4) {
        tileSize = 384;
        overlap = 32;
      } else if (pixels > 20_000_000) {
        tileSize = 384;
        overlap = 32;
      }

      return {
        tileSize,
        overlap
      };

    },


    async process(canvas, processor, options = {}) {

      if (!canvas) {
        throw new Error("FIDELIS: Tile source missing.");
      }

      if (typeof processor !== "function") {
        throw new Error("FIDELIS: Tile processor missing.");
      }

      const tileSize =
        Number(
          options.tileSize ||
          this.getRecommendedSettings(
            canvas.width,
            canvas.height
          ).tileSize
        );

      const overlap =
        Number(
          options.overlap ||
          this.getRecommendedSettings(
            canvas.width,
            canvas.height
          ).overlap
        );

      const width = canvas.width;
      const height = canvas.height;

      /*
       Small image:
       process directly.
      */

      if (
        width <= tileSize &&
        height <= tileSize
      ) {

        return processor(
          canvas,
          {
            x: 0,
            y: 0,
            width,
            height,
            index: 0,
            total: 1
          }
        );

      }

      /*
       Determine grid.
      */

      const step =
        Math.max(
          1,
          tileSize - overlap * 2
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

          const left =
            Math.max(
              0,
              x - overlap
            );

          const top =
            Math.max(
              0,
              y - overlap
            );

          const right =
            Math.min(
              width,
              x + tileSize
            );

          const bottom =
            Math.min(
              height,
              y + tileSize
            );

          tiles.push({
            x: left,
            y: top,
            width: right - left,
            height: bottom - top
          });

        }

      }

      /*
       Avoid processing duplicate/contained tiles
       at the extreme edges.
      */

      const uniqueTiles = [];

      const seen = new Set();

      for (const tile of tiles) {

        const key =
          [
            tile.x,
            tile.y,
            tile.width,
            tile.height
          ].join(":");

        if (!seen.has(key)) {

          seen.add(key);
          uniqueTiles.push(tile);

        }

      }

      const total =
        uniqueTiles.length;

      /*
       First processed tile determines scale.
      */

      let outputCanvas = null;
      let scaleX = 1;
      let scaleY = 1;

      const processedTiles = [];

      for (
        let i = 0;
        i < total;
        i++
      ) {

        const tile =
          uniqueTiles[i];

        const tileCanvas =
          document.createElement(
            "canvas"
          );

        tileCanvas.width =
          tile.width;

        tileCanvas.height =
          tile.height;

        const tileContext =
          tileCanvas.getContext(
            "2d"
          );

        tileContext.drawImage(
          canvas,
          tile.x,
          tile.y,
          tile.width,
          tile.height,
          0,
          0,
          tile.width,
          tile.height
        );

        /*
         Progress before inference.
        */

        if (
          typeof options.onProgress ===
          "function"
        ) {

          options.onProgress(
            (i / total) * 90,
            `AI tile ${i + 1}/${total}...`
          );

        }

        const result =
          await processor(
            tileCanvas,
            {
              ...tile,
              index: i,
              total
            }
          );

        if (!result) {
          throw new Error(
            `FIDELIS: Tile ${i + 1} returned no result.`
          );
        }

        const resultCanvas =
          result.canvas ||
          result;

        if (
          !resultCanvas ||
          !resultCanvas.width ||
          !resultCanvas.height
        ) {

          throw new Error(
            `FIDELIS: Invalid output tile ${i + 1}.`
          );

        }

        if (!outputCanvas) {

          scaleX =
            resultCanvas.width /
            tile.width;

          scaleY =
            resultCanvas.height /
            tile.height;

          outputCanvas =
            document.createElement(
              "canvas"
            );

          outputCanvas.width =
            Math.round(
              width * scaleX
            );

          outputCanvas.height =
            Math.round(
              height * scaleY
            );

        }

        processedTiles.push({
          source: resultCanvas,
          tile,
          scaleX,
          scaleY
        });

        /*
         Release temporary tile references
         where possible.
        */

        if (
          typeof options.onProgress ===
          "function"
        ) {

          options.onProgress(
            ((i + 1) / total) * 90,
            `Processed tile ${i + 1}/${total}`
          );

        }

        /*
         Yield to browser.
        */

        await new Promise(
          resolve =>
            setTimeout(resolve, 0)
        );

      }

      /*
       Composite with overlap cropping.
       */

      const context =
        outputCanvas.getContext(
          "2d"
        );

      context.imageSmoothingEnabled =
        false;

      for (
        const item of processedTiles
      ) {

        const tile =
          item.tile;

        const source =
          item.source;

        const sx =
          tile.x > 0
            ? overlap * item.scaleX
            : 0;

        const sy =
          tile.y > 0
            ? overlap * item.scaleY
            : 0;

        const rightEdge =
          tile.x + tile.width >= width;

        const bottomEdge =
          tile.y + tile.height >= height;

        const sourceWidth =
          source.width -
          sx -
          (
            rightEdge
              ? 0
              : overlap * item.scaleX
          );

        const sourceHeight =
          source.height -
          sy -
          (
            bottomEdge
              ? 0
              : overlap * item.scaleY
          );

        const destinationX =
          Math.round(
            tile.x * item.scaleX +
            (
              tile.x > 0
                ? overlap * item.scaleX
                : 0
            )
          );

        const destinationY =
          Math.round(
            tile.y * item.scaleY +
            (
              tile.y > 0
                ? overlap * item.scaleY
                : 0
            )
          );

        const destinationWidth =
          Math.round(
            sourceWidth
          );

        const destinationHeight =
          Math.round(
            sourceHeight
          );

        if (
          sourceWidth > 0 &&
          sourceHeight > 0
        ) {

          context.drawImage(
            source,
            sx,
            sy,
            sourceWidth,
            sourceHeight,
            destinationX,
            destinationY,
            destinationWidth,
            destinationHeight
          );

        }

      }

      if (
        typeof options.onProgress ===
        "function"
      ) {

        options.onProgress(
          100,
          "Tiles combined."
        );

      }

      return {

        canvas: outputCanvas,

        scaleX,

        scaleY,

        tiles: total

      };

    }

  };

  window.FidelisTileEngine =
    TileEngine;

  /*
   Backwards compatibility.
  */

  window.FidelisAITileEngine =
    TileEngine;

})();
