(function () {
  "use strict";

  const FidelisPipelineTest = {

    version: "1.0.0",


    async run(
      quality = "standard"
    ) {

      const report = {

        success: false,

        quality,

        steps: [],

        error: null

      };


      try {

        /*
         * STEP 1
         */
        report.steps.push({
          name: "Pipeline Router",
          ready:
            typeof FidelisPipelineRouter !==
            "undefined"
        });


        if (
          typeof FidelisPipelineRouter ===
          "undefined"
        ) {

          throw new Error(
            "Pipeline Router tidak ditemukan."
          );

        }


        /*
         * STEP 2
         */
        report.steps.push({
          name: "Image Pipeline",
          ready:
            typeof FidelisImagePipeline !==
            "undefined"
        });


        /*
         * STEP 3
         */
        report.steps.push({
          name: "Tile Engine",
          ready:
            typeof FidelisTileEngine !==
            "undefined"
        });


        /*
         * STEP 4
         */
        report.steps.push({
          name: "ONNX Runtime",
          ready:
            typeof FidelisRuntime !==
            "undefined"
        });


        /*
         * STEP 5
         */
        report.steps.push({
          name: "AI Inference",
          ready:
            typeof FidelisAIInference !==
            "undefined"
        });


        /*
         * STEP 6
         */
        report.steps.push({
          name: "Model Bridge",
          ready:
            typeof FidelisAIModelBridge !==
            "undefined"
        });


        /*
         * Model check.
         */
        if (
          typeof FidelisModelHealth !==
          "undefined"
        ) {

          const health =
            await FidelisModelHealth.check(
              quality
            );

          report.model =
            health;

        }


        report.success =
          report.steps.every(
            step => step.ready
          );


        return report;

      } catch (error) {

        report.error =
          error.message;

        return report;

      }

    },


    print(
      report
    ) {

      console.group(
        "[FIDELIS] AI Pipeline Test"
      );


      console.log(
        "Success:",
        report.success
      );


      console.log(
        "Quality:",
        report.quality
      );


      if (
        Array.isArray(
          report.steps
        )
      ) {

        report.steps.forEach(
          step => {

            console.log(
              step.ready
                ? "✓"
                : "✗",
              step.name
            );

          }
        );

      }


      if (report.model) {

        console.log(
          "Model:",
          report.model
        );

      }


      if (report.error) {

        console.error(
          "Error:",
          report.error
        );

      }


      console.groupEnd();

      return report;

    }

  };


  window.FidelisPipelineTest =
    FidelisPipelineTest;

})();
