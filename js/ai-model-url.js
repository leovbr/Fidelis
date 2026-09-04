(function () {
  "use strict";

  const FidelisModelURL = {

    version: "1.0.0",

    /*
     * ==================================================
     * MODEL URL
     * ==================================================
     *
     * Isi setelah kita menentukan model ONNX final.
     *
     * Contoh:
     *
     * standard:
     * "https://domain.com/model.onnx"
     *
     * Jangan masukkan URL palsu.
     */

    urls: {

      standard: null,

      high: null,

      ultra: null

    },


    set(quality, url) {

      const key =
        String(quality || "")
          .toLowerCase();

      if (
        !Object.prototype.hasOwnProperty.call(
          this.urls,
          key
        )
      ) {
        throw new Error(
          "Quality tidak dikenal: " + quality
        );
      }

      if (
        url !== null &&
        (
          typeof url !== "string" ||
          !/^https?:\/\//i.test(url)
        )
      ) {
        throw new Error(
          "URL model harus HTTP/HTTPS."
        );
      }

      this.urls[key] = url;

      /*
       * Sinkronkan ke seluruh sistem.
       */

      if (
        typeof FidelisModelBootstrap !==
        "undefined" &&
        url
      ) {
        FidelisModelBootstrap.configure(
          key,
          url
        );
      }

      return true;
    },


    get(quality) {

      const key =
        String(quality || "standard")
          .toLowerCase();

      return this.urls[key] || null;
    },


    isConfigured(quality) {

      return Boolean(
        this.get(quality)
      );

    },


    getAll() {

      return {
        standard: this.urls.standard,
        high: this.urls.high,
        ultra: this.urls.ultra
      };

    },


    getConfiguredModels() {

      return Object.keys(this.urls)
        .filter(
          quality =>
            Boolean(
              this.urls[quality]
            )
        );

    },


    status() {

      return {
        standard:
          Boolean(this.urls.standard),

        high:
          Boolean(this.urls.high),

        ultra:
          Boolean(this.urls.ultra),

        configuredCount:
          this.getConfiguredModels().length
      };

    }

  };


  window.FidelisModelURL =
    FidelisModelURL;


  /*
   * Auto-register configured models.
   */

  setTimeout(() => {

    Object.keys(
      FidelisModelURL.urls
    ).forEach(quality => {

      const url =
        FidelisModelURL.urls[quality];

      if (!url) return;

      try {

        FidelisModelURL.set(
          quality,
          url
        );

      } catch (error) {

        console.warn(
          "[FIDELIS] Model URL registration failed:",
          error
        );

      }

    });

  }, 0);

})();
