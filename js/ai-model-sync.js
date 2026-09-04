(function () {
  "use strict";

  const FidelisModelSync = {
    version: "1.0.0",

    syncAll() {
      if (
        typeof FidelisAIModels === "undefined" ||
        typeof FidelisAIModelConfig === "undefined"
      ) {
        return {
          success: false,
          reason: "model-registry-missing"
        };
      }

      const models = FidelisAIModels.getAll();

      if (!Array.isArray(models)) {
        return {
          success: false,
          reason: "invalid-model-registry"
        };
      }

      let synced = 0;

      models.forEach(model => {
        if (!model || !model.id) return;

        const config = FidelisAIModelConfig.get(model.id);

        if (!config) return;

        /*
         * Model URL dari registry utama menjadi sumber utama.
         */
        if (model.url) {
          FidelisAIModelConfig.setURL(model.id, model.url);

          if (typeof FidelisModelLoader !== "undefined") {
            FidelisModelLoader.setModelURL(
              model.id,
              model.url
            );
          }

          synced++;
        }
      });

      return {
        success: true,
        synced,
        total: models.length
      };
    },

    syncQuality(quality) {
      if (
        typeof FidelisAIModels === "undefined" ||
        typeof FidelisAIModelConfig === "undefined"
      ) {
        return {
          success: false,
          reason: "registry-missing"
        };
      }

      const normalized =
        FidelisAIModelConfig.normalizeQuality(quality);

      const model = FidelisAIModels.get(normalized);

      if (!model) {
        return {
          success: false,
          reason: "model-not-found"
        };
      }

      const config =
        FidelisAIModelConfig.get(normalized);

      if (!config) {
        return {
          success: false,
          reason: "config-not-found"
        };
      }

      if (model.url) {
        FidelisAIModelConfig.setURL(
          normalized,
          model.url
        );

        if (typeof FidelisModelLoader !== "undefined") {
          FidelisModelLoader.setModelURL(
            normalized,
            model.url
          );
        }
      }

      return {
        success: true,
        quality: normalized,
        modelId: model.id,
        url: model.url || null,
        configured: Boolean(model.url)
      };
    },

    setURL(quality, url) {
      if (
        typeof FidelisAIModels === "undefined" ||
        typeof FidelisAIModelConfig === "undefined"
      ) {
        return false;
      }

      const normalized =
        FidelisAIModelConfig.normalizeQuality(quality);

      const updated =
        FidelisAIModels.setURL(
          normalized,
          url
        );

      if (!updated) return false;

      FidelisAIModelConfig.setURL(
        normalized,
        url
      );

      if (typeof FidelisModelLoader !== "undefined") {
        FidelisModelLoader.setModelURL(
          normalized,
          url
        );
      }

      return true;
    },

    getURL(quality) {
      if (
        typeof FidelisAIModelConfig === "undefined"
      ) {
        return null;
      }

      return FidelisAIModelConfig.getURL(
        quality
      );
    },

    status() {
      const result = {
        ready: false,
        models: []
      };

      if (
        typeof FidelisAIModels === "undefined" ||
        typeof FidelisAIModelConfig === "undefined"
      ) {
        return result;
      }

      const models = FidelisAIModels.getAll();

      models.forEach(model => {
        if (!model) return;

        const config =
          FidelisAIModelConfig.get(model.id);

        result.models.push({
          id: model.id,
          quality: model.quality || model.id,
          url: model.url || null,
          configured: Boolean(model.url),
          configExists: Boolean(config)
        });
      });

      result.ready = result.models.some(
        model => model.configured
      );

      return result;
    }
  };

  window.FidelisModelSync = FidelisModelSync;

  /*
   * Sync otomatis setelah semua registry tersedia.
   */
  setTimeout(() => {
    try {
      FidelisModelSync.syncAll();
    } catch (error) {
      console.warn(
        "[FIDELIS] Model sync failed:",
        error
      );
    }
  }, 0);

})();
