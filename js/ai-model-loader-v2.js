(function () {
  "use strict";

  const FidelisModelLoaderV2 = {

    version: "1.0.0",

    cache: new Map(),

    controllers: new Map(),


    normalizeQuality(
      quality
    ) {

      if (
        typeof FidelisModelRegistry !==
        "undefined"
      ) {

        return FidelisModelRegistry
          .normalizeQuality(
            quality
          );

      }

      return String(
        quality || "standard"
      ).toLowerCase();

    },


    getURL(
      quality
    ) {

      const key =
        this.normalizeQuality(
          quality
        );


      if (
        typeof FidelisModelRegistry !==
        "undefined"
      ) {

        return FidelisModelRegistry
          .getURL(
            key
          );

      }


      if (
        typeof FidelisModelURL !==
        "undefined"
      ) {

        return FidelisModelURL.get(
          key
        );

      }


      return null;
    },


    async load(
      quality,
      options = {}
    ) {

      const key =
        this.normalizeQuality(
          quality
        );


      /*
       * Cache.
       */

      if (
        this.cache.has(key) &&
        !options.forceReload
      ) {

        return {
          success: true,
          quality: key,
          data:
            this.cache.get(key),
          cached: true
        };

      }


      const url =
        this.getURL(
          key
        );


      if (!url) {

        return {
          success: false,
          quality: key,
          error:
            "Model URL belum dikonfigurasi."
        };

      }


      /*
       * VVIP protection.
       */

      if (
        key === "ultra" &&
        typeof FidelisTier !==
        "undefined"
      ) {

        if (
          !FidelisTier.canUse(
            "ultra"
          )
        ) {

          return {
            success: false,
            quality: key,
            error:
              "Ultra membutuhkan VVIP."
          };

        }

      }


      /*
       * Abort controller.
       */

      const controller =
        new AbortController();

      this.controllers.set(
        key,
        controller
      );


      try {

        if (
          typeof options.onProgress ===
          "function"
        ) {

          options.onProgress({
            stage: "download",
            percent: 0,
            loaded: 0,
            total: 0
          });

        }


        const response =
          await fetch(
            url,
            {
              method: "GET",
              cache: "force-cache",
              signal:
                controller.signal
            }
          );


        if (!response.ok) {

          throw new Error(
            "HTTP " +
            response.status
          );

        }


        const total =
          Number(
            response.headers.get(
              "content-length"
            )
          ) || 0;


        /*
         * Streaming download jika tersedia.
         */

        let data;


        if (
          response.body &&
          response.body.getReader
        ) {

          const reader =
            response.body.getReader();

          const chunks = [];

          let loaded = 0;

          while (true) {

            const {
              done,
              value
            } =
              await reader.read();

            if (done) break;

            chunks.push(
              value
            );

            loaded +=
              value.byteLength;


            if (
              typeof options.onProgress ===
              "function"
            ) {

              const percent =
                total
                  ? Math.round(
                      (
                        loaded /
                        total
                      ) * 100
                    )
                  : 0;

              options.onProgress({
                stage: "download",
                percent,
                loaded,
                total
              });

            }

          }


          const merged =
            new Uint8Array(
              loaded
            );

          let offset = 0;

          for (
            const chunk of chunks
          ) {

            merged.set(
              chunk,
              offset
            );

            offset +=
              chunk.length;

          }

          data =
            merged.buffer;

        } else {

          data =
            await response.arrayBuffer();

        }


        if (
          !data ||
          data.byteLength === 0
        ) {

          throw new Error(
            "Model binary kosong."
          );

        }


        /*
         * Cache.
         */

        this.cache.set(
          key,
          data
        );


        if (
          typeof options.onProgress ===
          "function"
        ) {

          options.onProgress({
            stage: "download",
            percent: 100,
            loaded:
              data.byteLength,
            total:
              total ||
              data.byteLength
          });

        }


        return {

          success: true,

          quality: key,

          data,

          byteLength:
            data.byteLength,

          cached: false,

          url

        };

      } catch (error) {

        if (
          error.name ===
          "AbortError"
        ) {

          return {
            success: false,
            quality: key,
            cancelled: true,
            error:
              "Model loading dibatalkan."
          };

        }


        return {
          success: false,
          quality: key,
          error:
            error.message ||
            "Gagal memuat model."
        };

      } finally {

        this.controllers.delete(
          key
        );

      }

    },


    cancel(
      quality
    ) {

      const key =
        this.normalizeQuality(
          quality
        );

      const controller =
        this.controllers.get(
          key
        );

      if (!controller) {
        return false;
      }

      controller.abort();

      return true;
    },


    clear(
      quality
    ) {

      const key =
        this.normalizeQuality(
          quality
        );

      this.cache.delete(
        key
      );

      return true;
    },


    clearAll() {

      this.cache.clear();

      return true;

    },


    isLoaded(
      quality
    ) {

      const key =
        this.normalizeQuality(
          quality
        );

      return this.cache.has(
        key
      );

    },


    getLoadedSize(
      quality
    ) {

      const key =
        this.normalizeQuality(
          quality
        );

      const data =
        this.cache.get(
          key
        );

      return data
        ? data.byteLength
        : 0;

    },


    getStatus() {

      const loaded = {};

      this.cache.forEach(
        (data, key) => {

          loaded[key] =
            data.byteLength;

        }
      );

      return {
        loaded,
        loading:
          Array.from(
            this.controllers.keys()
          )
      };

    }

  };


  window.FidelisModelLoaderV2 =
    FidelisModelLoaderV2;

})();
