(function () {
  "use strict";

  const TEST_SIZE = 64;

  function log(...args) {
    console.log(
      "%c[FIDELIS LIVE TEST]",
      "font-weight:bold;",
      ...args
    );
  }

  function error(...args) {
    console.error(
      "%c[FIDELIS LIVE TEST]",
      "font-weight:bold;",
      ...args
    );
  }

  function createTestImage(size = TEST_SIZE) {
    const canvas = document.createElement("canvas");

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d", {
      willReadFrequently: true
    });

    const image = ctx.createImageData(size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;

        /*
         * Test pattern:
         * gradient + checker + diagonal detail.
         */
        const checker =
          ((Math.floor(x / 8) +
            Math.floor(y / 8)) %
            2) *
          70;

        image.data[i] =
          Math.min(255, x * 3 + checker);

        image.data[i + 1] =
          Math.min(255, y * 3);

        image.data[i + 2] =
          Math.min(255, (x + y) * 1.5);

        image.data[i + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);

    return canvas;
  }

  async function loadImageData(canvas) {
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true
    });

    return ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  function inspectSession() {
    if (
      !window.FidelisAIInference ||
      typeof window.FidelisAIInference.getStatus !==
        "function"
    ) {
      return null;
    }

    return window.FidelisAIInference.getStatus();
  }

  async function run(options = {}) {
    const quality =
      options.quality || "standard";

    const report = {
      success: false,
      quality,
      startedAt: new Date().toISOString(),
      backend: null,
      model: null,
      input: null,
      output: null,
      session: null,
      error: null
    };

    try {
      log("=================================");
      log("REAL-ESRGAN LIVE INFERENCE TEST");
      log("=================================");

      /*
       * 1. Check modules.
       */
      if (!window.FidelisRuntime) {
        throw new Error(
          "FidelisRuntime tidak ditemukan."
        );
      }

      if (!window.FidelisAIModelBridge) {
        throw new Error(
          "FidelisAIModelBridge tidak ditemukan."
        );
      }

      if (!window.FidelisAIInference) {
        throw new Error(
          "FidelisAIInference tidak ditemukan."
        );
      }

      /*
       * 2. Initialize ONNX Runtime.
       */
      log("Initializing ONNX Runtime...");

      const runtime =
        await window.FidelisRuntime.init({
          preferredBackend:
            options.backend || null
        });

      if (!runtime || !runtime.ready) {
        throw new Error(
          "ONNX Runtime gagal diinisialisasi."
        );
      }

      report.backend =
        runtime.backend || null;

      log(
        "Backend:",
        runtime.backend
      );

      /*
       * 3. Get model configuration.
       */
      let model = null;

      if (
        window.FidelisRealESRGAN &&
        typeof window.FidelisRealESRGAN.get ===
          "function"
      ) {
        model =
          window.FidelisRealESRGAN.get(
            quality
          );
      }

      if (
        !model &&
        window.FidelisModelRegistry &&
        typeof window.FidelisModelRegistry.get ===
          "function"
      ) {
        model =
          window.FidelisModelRegistry.get(
            quality
          );
      }

      if (!model) {
        throw new Error(
          `Model ${quality} tidak ditemukan.`
        );
      }

      report.model = model;

      log(
        "Model:",
        model.name || model.id
      );

      log(
        "Scale:",
        model.scale
      );

      log(
        "URL:",
        model.url
      );

      /*
       * 4. Create test image.
       */
      log(
        `Creating ${TEST_SIZE}×${TEST_SIZE} test image...`
      );

      const testCanvas =
        createTestImage(
          TEST_SIZE
        );

      const imageData =
        await loadImageData(
          testCanvas
        );

      report.input = {
        width:
          imageData.width,

        height:
          imageData.height,

        pixels:
          imageData.width *
          imageData.height
      };

      /*
       * 5. Load/create model session.
       */
      log(
        "Loading Real-ESRGAN model..."
      );

      const session =
        await window.FidelisAIModelBridge.createSession(
          quality,
          {
            onProgress:
              progress => {
                const percent =
                  Math.round(
                    (progress || 0) *
                      100
                  );

                log(
                  `Model loading: ${percent}%`
                );
              }
          }
        );

      if (!session) {
        throw new Error(
          "Model session gagal dibuat."
        );
      }

      /*
       * 6. Inspect metadata.
       */
      const inferenceStatus =
        inspectSession();

      report.session =
        inferenceStatus;

      log(
        "Session created successfully."
      );

      if (
        inferenceStatus
      ) {
        log(
          "Input names:",
          inferenceStatus.inputNames
        );

        log(
          "Output names:",
          inferenceStatus.outputNames
        );

        log(
          "Input metadata:",
          inferenceStatus.inputMetadata
        );

        log(
          "Output metadata:",
          inferenceStatus.outputMetadata
        );
      }

      /*
       * 7. Run actual inference.
       */
      log(
        "Running REAL inference..."
      );

      const started =
        performance.now();

      const result =
        await window.FidelisAIModelBridge.run(
          imageData,
          quality,
          {
            onProgress:
              progress => {
                log(
                  "Inference:",
                  Math.round(
                    (progress || 0) *
                      100
                  ) + "%"
                );
              }
          }
        );

      const elapsed =
        performance.now() -
        started;

      if (
        !result ||
        !result.canvas
      ) {
        throw new Error(
          "Inference tidak menghasilkan canvas."
        );
      }

      /*
       * 8. Validate output.
       */
      const outputCanvas =
        result.canvas;

      report.output = {
        width:
          outputCanvas.width,

        height:
          outputCanvas.height,

        pixels:
          outputCanvas.width *
          outputCanvas.height,

        elapsedMs:
          Math.round(elapsed),

        scale:
          result.scale ||
          model.scale ||
          null,

        aiProcessed:
          result.aiProcessed,

        fallback:
          result.fallback,

        engine:
          result.engine,

        backend:
          result.backend,

        inputShape:
          result.inputShape,

        outputShape:
          result.outputShape
      };

      log(
        "Output:",
        report.output
      );

      /*
       * 9. Check expected scale.
       */
      const expectedScale =
        Number(
          model.scale || 2
        );

      const expectedWidth =
        imageData.width *
        expectedScale;

      const expectedHeight =
        imageData.height *
        expectedScale;

      const dimensionsCorrect =
        outputCanvas.width ===
          expectedWidth &&
        outputCanvas.height ===
          expectedHeight;

      /*
       * 10. Final validation.
       */
      if (
        result.fallback === true
      ) {
        throw new Error(
          "Pipeline menggunakan fallback. Real AI inference belum terbukti."
        );
      }

      if (
        result.aiProcessed !== true
      ) {
        throw new Error(
          "Result tidak ditandai sebagai AI processed."
        );
      }

      if (
        !dimensionsCorrect
      ) {
        throw new Error(
          `Ukuran output salah. Expected ${expectedWidth}×${expectedHeight}, got ${outputCanvas.width}×${outputCanvas.height}.`
        );
      }

      report.success = true;

      log(
        "================================="
      );

      log(
        "🔥 REAL-ESRGAN INFERENCE SUCCESS"
      );

      log(
        `Input : ${imageData.width}×${imageData.height}`
      );

      log(
        `Output: ${outputCanvas.width}×${outputCanvas.height}`
      );

      log(
        `Scale : ${expectedScale}×`
      );

      log(
        `Time  : ${Math.round(elapsed)} ms`
      );

      log(
        `Backend: ${result.backend || report.backend}`
      );

      log(
        "================================="
      );

      /*
       * Optional preview.
       */
      if (
        options.showPreview !== false
      ) {
        showPreview(
          testCanvas,
          outputCanvas
        );
      }

      return report;
    } catch (err) {
      report.success = false;

      report.error = {
        message:
          err.message ||
          String(err),

        stack:
          err.stack || null
      };

      error(
        "❌ LIVE TEST FAILED"
      );

      error(
        report.error.message
      );

      if (err.stack) {
        console.error(
          err.stack
        );
      }

      return report;
    }
  }

  function showPreview(
    inputCanvas,
    outputCanvas
  ) {
    try {
      let box =
        document.getElementById(
          "fidelisLiveTestPreview"
        );

      if (!box) {
        box =
          document.createElement(
            "div"
          );

        box.id =
          "fidelisLiveTestPreview";

        box.style.position =
          "fixed";

        box.style.right =
          "12px";

        box.style.bottom =
          "12px";

        box.style.zIndex =
          "99999";

        box.style.background =
          "#111";

        box.style.padding =
          "12px";

        box.style.borderRadius =
          "12px";

        box.style.maxWidth =
          "320px";

        box.style.color =
          "white";

        box.style.fontFamily =
          "sans-serif";

        document.body.appendChild(
          box
        );
      }

      box.innerHTML = "";

      const title =
        document.createElement(
          "div"
        );

      title.textContent =
        "FIDELIS AI TEST";

      title.style.fontWeight =
        "bold";

      title.style.marginBottom =
        "8px";

      box.appendChild(
        title
      );

      const wrapper =
        document.createElement(
          "div"
        );

      wrapper.style.display =
        "flex";

      wrapper.style.gap =
        "8px";

      const before =
        document.createElement(
          "canvas"
        );

      before.width =
        128;

      before.height =
        128;

      before
        .getContext("2d")
        .drawImage(
          inputCanvas,
          0,
          0,
          128,
          128
        );

      const after =
        document.createElement(
          "canvas"
        );

      after.width =
        128;

      after.height =
        128;

      after
        .getContext("2d")
        .drawImage(
          outputCanvas,
          0,
          0,
          128,
          128
        );

      wrapper.appendChild(
        before
      );

      wrapper.appendChild(
        after
      );

      box.appendChild(
        wrapper
      );
    } catch (error) {
      console.warn(
        "[FIDELIS] Preview gagal:",
        error
      );
    }
  }

  function closePreview() {
    const box =
      document.getElementById(
        "fidelisLiveTestPreview"
      );

    if (box) {
      box.remove();
    }
  }

  window.FidelisLiveTest = {
    run,
    createTestImage,
    closePreview
  };

  console.log(
    "[FIDELIS] Live model test loaded."
  );
})();
