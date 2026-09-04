(function () {
  "use strict";

  const FidelisModelRegistry = {

    version: "1.0.0",

    models: {

      standard: {
        id: "fidelis-basic",
        name: "FIDELIS Basic",
        provider: "Real-ESRGAN",
        scale: 2,
        tier: "free",
        format: "onnx",
        url: null
      },

      high: {
        id: "fidelis-high",
        name: "FIDELIS High",
        provider: "Real-ESRGAN",
        scale: 2,
        tier: "free",
        format: "onnx",
        url: null
      },

      ultra: {
        id: "fidelis-ultra",
        name: "FIDELIS Ultra",
        provider: "Real-ESRGAN",
        scale: 4,
        tier: "vvip",
        format: "onnx",
        url: null
      }

    },


    normalizeQuality(
      quality
    ) {

      const value =
        String(
          quality || "standard"
        ).toLowerCase();

      if (
        value === "ultra" ||
        value === "4k"
      ) {
        return "ultra";
      }

      if (
        value === "high" ||
        value === "hd+"
      ) {
        return "high";
      }

      return "standard";
    },


    get(
      quality
    ) {

      const key =
        this.normalizeQuality(
          quality
        );

      return (
        this.models[key] ||
        null
      );
    },


    getById(
      id
    ) {

      if (!id) {
        return null;
      }

      return (
        Object.values(
          this.models
        ).find(
          model =>
            model.id === id
        ) ||
        null
      );
    },


    setURL(
      quality,
      url
    ) {

      const key =
        this.normalizeQuality(
          quality
        );

      const model =
        this.models[key];

      if (!model) {
        return false;
      }

      if (
        url !== null &&
        (
          typeof url !== "string" ||
          !/^https?:\/\//i.test(url)
        )
      ) {
        throw new Error(
          "Model URL tidak valid."
        );
      }

      model.url = url;

      /*
       * Sinkronkan registry lama
       * agar sistem existing tetap kompatibel.
       */

      if (
        typeof FidelisAIModels !==
        "undefined"
      ) {

        try {

          FidelisAIModels.setURL(
            key,
            url
          );

        } catch (_) {}

      }


      if (
        typeof FidelisAIModelConfig !==
        "undefined"
      ) {

        try {

          FidelisAIModelConfig.setURL(
            key,
            url
          );

        } catch (_) {}

      }


      if (
        typeof FidelisModelLoader !==
        "undefined"
      ) {

        try {

          FidelisModelLoader.setModelURL(
            key,
            url
          );

        } catch (_) {}

      }

      return true;
    },


    getURL(
      quality
    ) {

      const model =
        this.get(
          quality
        );

      return model
        ? model.url
        : null;
    },


    isConfigured(
      quality
    ) {

      return Boolean(
        this.getURL(
          quality
        )
      );
    },


    getAll() {

      return Object.values(
        this.models
      ).map(
        model => ({
          ...model
        })
      );

    },


    getConfigured() {

      return this.getAll()
        .filter(
          model =>
            Boolean(
              model.url
            )
        );

    },


    getStatus() {

      return {

        total:
          Object.keys(
            this.models
          ).length,

        configured:
          this.getConfigured().length,

        models:
          this.getAll().map(
            model => ({
              id: model.id,
              name: model.name,
              quality:
                this.normalizeQuality(
                  model.id
                ),
              scale: model.scale,
              tier: model.tier,
              format: model.format,
              configured:
                Boolean(
                  model.url
                )
            })
          )

      };

    }

  };


  window.FidelisModelRegistry =
    FidelisModelRegistry;

})();
