(function () {
  "use strict";

  const FidelisModelBootstrap = {
    version: "1.0.0",

    /*
     * Default model.
     *
     * Untuk sekarang URL sengaja bisa diganti lewat
     * FidelisModelBootstrap.configure().
     */
    models: {
      standard: {
        quality: "standard",
        id: "fidelis-basic",
        scale: 2,
        url: null
      },

      high: {
        quality: "high",
        id: "fidelis-high",
        scale: 2,
        url: null
      },

      ultra: {
        quality: "ultra",
        id: "fidelis-ultra",
        scale: 4,
        url: null
      }
    },

    configure(quality, url) {
      if (!quality) {
        throw new Error(
          "Quality model wajib diisi."
        );
      }

      if (!url) {
        throw new Error(
          "Model URL wajib diisi."
        );
      }

      if (
        typeof url !== "string" ||
        !/^https?:\/\//i.test(url)
      ) {
        throw new Error(
          "Model URL harus HTTP/HTTPS."
        );
      }

      const key =
        String(quality).toLowerCase();

      if (!this.models[key]) {
        throw new Error(
          "Quality model tidak dikenal: " + quality
        );
      }

      this.models[key].url = url;

      /*
       * Sinkronkan semua registry.
       */
      if (
        typeof FidelisModelSync !== "undefined"
      ) {
        FidelisModelSync.setURL(
          key,
          url
        );
      } else {

        if (
          typeof FidelisAIModels !== "undefined"
        ) {
          FidelisAIModels.setURL(
            key,
            url
          );
        }

        if (
          typeof FidelisAIModelConfig !== "undefined"
        ) {
          FidelisAIModelConfig.setURL(
            key,
            url
          );
        }

        if (
          typeof FidelisModelLoader !== "undefined"
        ) {
          FidelisModelLoader.setModelURL(
            key,
            url
          );
        }
      }

      return {
        success: true,
        quality: key,
        url
      };
    },

    configureAll(models) {
      if (!models || typeof models !== "object") {
        throw new Error(
          "Model configuration tidak valid."
        );
      }

      const results = [];

      Object.keys(models).forEach(
        quality => {

          const url = models[quality];

          if (!url) return;

          try {
            results.push(
              this.configure(
                quality,
                url
              )
            );
          } catch (error) {
            results.push({
              success: false,
              quality,
              error: error.message
            });
          }
        }
      );

      return results;
    },

    get(quality) {
      const key =
        String(quality || "standard")
          .toLowerCase();

      return this.models[key] || null;
    },

    getURL(quality) {
      const model =
        this.get(quality);

      return model
        ? model.url
        : null;
    },

    isConfigured(quality) {
      return Boolean(
        this.getURL(quality)
      );
    },

    getStatus() {
      const status = {};

      Object.keys(this.models)
        .forEach(quality => {

          const model =
            this.models[quality];

          status[quality] = {
            id: model.id,
            scale: model.scale,
            configured: Boolean(model.url),
            url: model.url
          };
        });

      return status;
    },

    async test(quality) {
      const model =
        this.get(quality);

      if (!model) {
        return {
          success: false,
          reason: "model-not-found"
        };
      }

      if (!model.url) {
        return {
          success: false,
          reason: "model-url-missing"
        };
      }

      if (
        typeof FidelisModelInstaller ===
        "undefined"
      ) {
        return {
          success: false,
          reason: "installer-missing"
        };
      }

      return FidelisModelInstaller
        .checkURL(model.url);
    }
  };

  window.FidelisModelBootstrap =
    FidelisModelBootstrap;

})();
