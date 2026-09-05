(function () {
  "use strict";

  function result(
    name,
    passed,
    detail = ""
  ) {
    return {
      name,
      passed: !!passed,
      detail
    };
  }

  function testModule(
    name,
    objectName
  ) {
    const available =
      !!window[objectName];

    return result(
      name,
      available,
      available
        ? "Module tersedia."
        : "Module tidak ditemukan."
    );
  }

  async function testRuntime() {
    if (
      !window.FidelisRuntime ||
      typeof window.FidelisRuntime.init !==
        "function"
    ) {
      return result(
        "ONNX Runtime",
        false,
        "FidelisRuntime tidak tersedia."
      );
    }

    try {
      const status =
        await window.FidelisRuntime.init();

      return result(
        "ONNX Runtime",
        !!status.ready,
        status
      );
    } catch (error) {
      return result(
        "ONNX Runtime",
        false,
        error.message ||
          String(error)
      );
    }
  }

  async function testModel(
    quality = "standard"
  ) {
    if (
      !window.FidelisModelHealth
    ) {
      return result(
        "Model Health",
        false,
        "Model Health tidak tersedia."
      );
    }

    try {
      const status =
        await window.FidelisModelHealth.check(
          quality,
          {
            force: true
          }
        );

      return result(
        `Model ${quality}`,
        !!(
          status.configured &&
          status.ready
        ),
        status
      );
    } catch (error) {
      return result(
        `Model ${quality}`,
        false,
        error.message ||
          String(error)
      );
    }
  }

  function testTileEngine() {
    if (
      !window.FidelisTileEngine
    ) {
      return result(
        "Tile Engine",
        false,
        "Tile Engine tidak tersedia."
      );
    }

    try {
      const settings =
        window.FidelisTileEngine.getRecommendedSettings(
          1920,
          1080
        );

      const valid =
        settings &&
        settings.tileSize > 0 &&
        settings.overlap >= 0;

      return result(
        "Tile Engine",
        valid,
        settings
      );
    } catch (error) {
      return result(
        "Tile Engine",
        false,
        error.message ||
          String(error)
      );
    }
  }

  function testTensorAPI() {
    const available =
      !!(
        window.ort &&
        typeof window.ort.Tensor ===
          "function"
      );

    return result(
      "ORT Tensor API",
      available,
      available
        ? "ort.Tensor tersedia."
        : "ort.Tensor belum tersedia."
    );
  }

  function createTestImage(
    width = 64,
    height = 64
  ) {
    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      width;

    canvas.height =
      height;

    const ctx =
      canvas.getContext(
        "2d",
        {
          willReadFrequently: true
        }
      );

    const image =
      ctx.createImageData(
        width,
        height
      );

    /*
     * Pattern sederhana supaya tensor
     * benar-benar berisi data.
     */
    for (
      let y = 0;
      y < height;
      y++
    ) {
      for (
        let x = 0;
        x < width;
        x++
      ) {
        const i =
          (y * width + x) * 4;

        image.data[i] =
          x % 256;

        image.data[i + 1] =
          y % 256;

        image.data[i + 2] =
          (x + y) % 256;

        image.data[i + 3] =
          255;
      }
    }

    ctx.putImageData(
      image,
      0,
      0
    );

    return {
      canvas,
      imageData: image
    };
  }

  function testTensorCreation() {
    if (
      !window.FidelisAIInference ||
      typeof window.FidelisAIInference.imageToTensor !==
        "function"
    ) {
      return result(
        "Tensor Creation",
        false,
        "AI Inference tidak tersedia."
      );
    }

    if (
      !window.ort ||
      typeof window.ort.Tensor !==
        "function"
    ) {
      return result(
        "Tensor Creation",
        false,
        "ORT Tensor API belum tersedia."
      );
    }

    try {
      const test =
        createTestImage();

      const tensor =
        window.FidelisAIInference.imageToTensor(
          test.imageData,
          {
            inputLayout: "NCHW",
            inputColor: "RGB",
            inputRange: "0..1"
          }
        );

      const valid =
        !!(
          tensor &&
          tensor.dims &&
          tensor.data
        );

      return result(
        "Tensor Creation",
        valid,
        valid
          ? {
              dims:
                Array.from(
                  tensor.dims
                ),
              type:
                tensor.type,
              size:
                tensor.data.length
            }
          : "Tensor invalid."
      );
    } catch (error) {
      return result(
        "Tensor Creation",
        false,
        error.message ||
          String(error)
      );
    }
  }

  function testOutputConversion() {
    if (
      !window.FidelisAIInference
    ) {
      return result(
        "Output Conversion",
        false,
        "AI Inference tidak tersedia."
      );
    }

    if (
      !window.ort ||
      typeof window.ort.Tensor !==
        "function"
    ) {
      return result(
        "Output Conversion",
        false,
        "ORT Tensor API belum tersedia."
      );
    }

    try {
      const width = 8;
      const height = 8;
      const pixels =
        width * height;

      const data =
        new Float32Array(
          pixels * 3
        );

      /*
       * RGB test output.
       */
      for (
        let i = 0;
        i < pixels;
        i++
      ) {
        data[i] = 1;
        data[pixels + i] = 0.5;
        data[pixels * 2 + i] = 0;
      }

      const tensor =
        new window.ort.Tensor(
          "float32",
          data,
          [
            1,
            3,
            height,
            width
          ]
        );

      const imageData =
        window.FidelisAIInference.outputToImageData(
          tensor,
          {
            model: {
              outputLayout: "NCHW",
              outputColor: "RGB",
              outputRange: "0..1"
            }
          }
        );

      const valid =
        !!(
          imageData &&
          imageData.width === width &&
          imageData.height === height &&
          imageData.data &&
          imageData.data.length ===
            pixels * 4
        );

      return result(
        "Output Conversion",
        valid,
        valid
          ? {
              width:
                imageData.width,
              height:
                imageData.height
            }
          : "ImageData invalid."
      );
    } catch (error) {
      return result(
        "Output Conversion",
        false,
        error.message ||
          String(error)
      );
    }
  }

  async function run(options = {}) {
    const quality =
      options.quality ||
      "standard";

    const tests = [];

    /*
     * Basic module checks.
     */
    tests.push(
      testModule(
        "Model Registry",
        "FidelisModelRegistry"
      )
    );

    tests.push(
      testModule(
        "Model Loader",
        "FidelisModelLoaderV2"
      )
    );

    tests.push(
      testModule(
        "Model Bridge",
        "FidelisAIModelBridge"
      )
    );

    tests.push(
      testModule(
        "AI Inference",
        "FidelisAIInference"
      )
    );

    tests.push(
      testModule(
        "Image Pipeline",
        "FidelisImagePipeline"
      )
    );

    tests.push(
      testModule(
        "Tile Engine",
        "FidelisTileEngine"
      )
    );

    /*
     * Runtime.
     */
    tests.push(
      await testRuntime()
    );

    /*
     * Tensor API.
     */
    tests.push(
      testTensorAPI()
    );

    /*
     * Tensor creation.
     */
    tests.push(
      testTensorCreation()
    );

    /*
     * Output conversion.
     */
    tests.push(
      testOutputConversion()
    );

    /*
     * Tile.
     */
    tests.push(
      testTileEngine()
    );

    /*
     * Model URL.
     */
    tests.push(
      await testModel(
        quality
      )
    );

    const passed =
      tests.filter(
        test => test.passed
      ).length;

    const failed =
      tests.length - passed;

    const report = {
      timestamp:
        new Date().toISOString(),

      quality,

      total:
        tests.length,

      passed,

      failed,

      success:
        failed === 0,

      tests
    };

    return report;
  }

  function print(report) {
    if (!report) {
      console.warn(
        "[FIDELIS] Test report kosong."
      );
      return;
    }

    console.group(
      "%c[FIDELIS] Pipeline Test",
      "font-weight:bold;font-size:14px;"
    );

    console.log(
      `Result: ${report.passed}/${report.total} passed`
    );

    report.tests.forEach(
      test => {
        if (test.passed) {
          console.log(
            "✅",
            test.name,
            test.detail
          );
        } else {
          console.error(
            "❌",
            test.name,
            test.detail
          );
        }
      }
    );

    console.groupEnd();

    return report;
  }

  async function runAndPrint(
    options = {}
  ) {
    const report =
      await run(options);

    print(report);

    return report;
  }

  window.FidelisPipelineTest = {
    run,
    print,
    runAndPrint,
    createTestImage
  };

  /*
   * Alias supaya kode lama tetap kompatibel.
   */
  window.FidelisAITest =
    window.FidelisPipelineTest;

  console.log(
    "[FIDELIS] Pipeline Test module loaded."
  );
})();
