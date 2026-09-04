/* =========================================================
   FIDELIS REAL-ESRGAN CONFIG
   Real ONNX model configuration
   ========================================================= */

(function () {

  "use strict";


  const BASE =
    "https://huggingface.co/SceneWorks/real-esrgan-onnx/resolve/main/";


  const Models = {

    standard: {

      id: "fidelis-basic",

      name: "FIDELIS Basic",

      provider: "Real-ESRGAN",

      scale: 2,

      tier: "free",

      format: "onnx",

      url:
        BASE +
        "real_esrgan_x2.onnx?download=true"

    },


    high: {

      id: "fidelis-high",

      name: "FIDELIS High",

      provider: "Real-ESRGAN",

      scale: 2,

      tier: "free",

      format: "onnx",

      url:
        BASE +
        "real_esrgan_x2.onnx?download=true"

    },


    ultra: {

      id: "fidelis-ultra",

      name: "FIDELIS Ultra",

      provider: "Real-ESRGAN",

      scale: 4,

      tier: "vvip",

      format: "onnx",

      url:
        BASE +
        "real_esrgan_x4.onnx?download=true"

    }

  };


  const Config = {

    get(quality) {

      if (
        quality === "ultra" ||
        quality === "vvip"
      ) {

        return Models.ultra;

      }


      if (
        quality === "high" ||
        quality === "hq"
      ) {

        return Models.high;

      }


      return Models.standard;

    },


    getURL(quality) {

      const model =
        this.get(quality);

      return model
        ? model.url
        : null;

    },


    getAll() {

      return {
        ...Models
      };

    },


    isConfigured(quality) {

      return Boolean(
        this.getURL(quality)
      );

    },


    install() {

      if (
        window.FidelisModelRegistry &&
        typeof window.FidelisModelRegistry.setURL ===
        "function"
      ) {

        Object.keys(Models).forEach(
          quality => {

            window.FidelisModelRegistry.setURL(
              quality,
              Models[quality].url
            );

          }
        );

      }


      if (
        window.FidelisAIModelConfig &&
        typeof window.FidelisAIModelConfig.setURL ===
        "function"
      ) {

        Object.keys(Models).forEach(
          quality => {

            window.FidelisAIModelConfig.setURL(
              quality,
              Models[quality].url
            );

          }
        );

      }


      if (
        window.FidelisModelURL &&
        typeof window.FidelisModelURL.set ===
        "function"
      ) {

        Object.keys(Models).forEach(
          quality => {

            window.FidelisModelURL.set(
              quality,
              Models[quality].url
            );

          }
        );

      }


      return true;

    }

  };


  window.FidelisRealESRGAN =
    Config;


  /*
   Auto-register model URLs.
   */

  setTimeout(
    function () {

      try {

        Config.install();

        console.log(
          "%cFIDELIS Real-ESRGAN models configured.",
          "color:#a78bfa;font-weight:bold;"
        );

      } catch (error) {

        console.warn(
          "FIDELIS model configuration warning:",
          error
        );

      }

    },
    100
  );


})();
