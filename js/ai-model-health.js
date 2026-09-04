(function () {
  "use strict";

  const FidelisModelHealth = {

    version: "1.0.0",


    async check(
      quality = "standard"
    ) {

      const result = {

        success: false,

        quality,

        configured: false,

        reachable: false,

        contentType: null,

        size: null,

        error: null

      };


      /*
       * Ambil URL dari registry utama.
       */

      let url = null;

      if (
        typeof FidelisModelURL !==
        "undefined"
      ) {

        url =
          FidelisModelURL.get(
            quality
          );

      }


      if (!url) {

        if (
          typeof FidelisModelSync !==
          "undefined"
        ) {

          url =
            FidelisModelSync.getURL(
              quality
            );

        }

      }


      if (!url) {

        result.error =
          "Model URL belum dikonfigurasi.";

        return result;

      }


      result.configured = true;


      /*
       * Gunakan installer kalau tersedia.
       */

      if (
        typeof FidelisModelInstaller !==
        "undefined"
      ) {

        try {

          const check =
            await FidelisModelInstaller
              .checkURL(url);

          result.reachable =
            Boolean(
              check.reachable
            );

          result.contentType =
            check.contentType ||
            null;

          result.size =
            check.size ||
            null;

          result.success =
            result.reachable;

          if (!result.reachable) {

            result.error =
              check.error ||
              "Model tidak dapat diakses.";

          }

          return result;

        } catch (error) {

          result.error =
            error.message;

        }

      }


      /*
       * Fallback HEAD request.
       */

      try {

        const response =
          await fetch(
            url,
            {
              method: "HEAD",
              cache: "no-store"
            }
          );

        result.reachable =
          response.ok;

        result.contentType =
          response.headers.get(
            "content-type"
          );

        const length =
          response.headers.get(
            "content-length"
          );

        result.size =
          length
            ? Number(length)
            : null;

        result.success =
          response.ok;

        if (!response.ok) {

          result.error =
            "HTTP " +
            response.status;

        }

      } catch (error) {

        result.error =
          error.message;

      }


      return result;

    },


    async checkAll() {

      const qualities = [
        "standard",
        "high",
        "ultra"
      ];

      const results = {};

      for (
        const quality of qualities
      ) {

        results[quality] =
          await this.check(
            quality
          );

      }

      return results;

    },


    async canUse(
      quality = "standard"
    ) {

      const result =
        await this.check(
          quality
        );

      return Boolean(
        result.success
      );

    },


    summary(
      result
    ) {

      if (!result) {
        return "Unknown";
      }

      if (
        result.success
      ) {
        return (
          "READY — " +
          result.quality
        );
      }

      if (
        !result.configured
      ) {
        return "MODEL NOT CONFIGURED";
      }

      return (
        "MODEL ERROR — " +
        (
          result.error ||
          "Unknown error"
        )
      );

    }

  };


  window.FidelisModelHealth =
    FidelisModelHealth;

})();
