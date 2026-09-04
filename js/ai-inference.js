(function () {
  "use strict";

  const state = {
    initialized: false,
    session: null,
    model: null,
    inputName: null,
    outputName: null,
    inputMeta: null,
    outputMeta: null,
    error: null
  };

  function normalizeModel(model) {
    if (!model) {
      throw new Error("Model AI tidak ditemukan.");
    }

    return {
      ...model,
      scale: Number(model.scale) || 2,
      inputLayout: model.inputLayout || "NCHW",
      outputLayout: model.outputLayout || "NCHW",
      inputColor: model.inputColor || "RGB",
      outputColor: model.outputColor || "RGB",
      inputRange: model.inputRange || "0..1",
      outputRange: model.outputRange || "0..1"
    };
  }

  async function init() {
    if (state.initialized) {
      return getStatus();
    }

    if (
      !window.FidelisRuntime ||
      typeof window.FidelisRuntime.init !== "function"
    ) {
      throw new Error(
        "FIDELIS Runtime belum tersedia."
      );
    }

    try {
      await window.FidelisRuntime.init();

      state.initialized = true;
      state.error = null;

      return getStatus();
    } catch (error) {
      state.error = error;
      throw error;
    }
  }

  function getTensorShape(tensor) {
    if (!tensor || !tensor.dims) {
      return null;
    }

    return Array.from(tensor.dims);
  }

  function getMetadataValue(metadata, key) {
    if (!metadata) {
      return null;
    }

    if (metadata[key]) {
      return metadata[key];
    }

    return null;
  }

  function inspectSession(session) {
    if (!session) {
      throw new Error("ONNX session kosong.");
    }

    const inputNames =
      Array.isArray(session.inputNames)
        ? session.inputNames
        : [];

    const outputNames =
      Array.isArray(session.outputNames)
        ? session.outputNames
        : [];

    state.inputName =
      inputNames[0] || null;

    state.outputName =
      outputNames[0] || null;

    state.inputMeta = null;
    state.outputMeta = null;

    try {
      if (
        session.inputMetadata &&
        state.inputName
      ) {
        state.inputMeta =
          session.inputMetadata[
            state.inputName
          ];
      }
    } catch (error) {
      console.warn(
        "[FIDELIS] Input metadata unavailable.",
        error
      );
    }

    try {
      if (
        session.outputMetadata &&
        state.outputName
      ) {
        state.outputMeta =
          session.outputMetadata[
            state.outputName
          ];
      }
    } catch (error) {
      console.warn(
        "[FIDELIS] Output metadata unavailable.",
        error
      );
    }

    console.log(
      "[FIDELIS] ONNX input:",
      state.inputName,
      state.inputMeta
    );

    console.log(
      "[FIDELIS] ONNX output:",
      state.outputName,
      state.outputMeta
    );

    return {
      inputName: state.inputName,
      outputName: state.outputName,
      inputMeta: state.inputMeta,
      outputMeta: state.outputMeta
    };
  }

  async function loadModel(modelData, model) {
    if (!modelData) {
      throw new Error(
        "Binary model ONNX tidak tersedia."
      );
    }

    const normalizedModel =
      normalizeModel(model);

    await init();

    try {
      if (
        !window.FidelisRuntime ||
        typeof window.FidelisRuntime.createSession !==
          "function"
      ) {
        throw new Error(
          "FidelisRuntime.createSession tidak tersedia."
        );
      }

      const session =
        await window.FidelisRuntime.createSession(
          modelData,
          {
            allowFallback: true
          }
        );

      state.session = session;
      state.model = normalizedModel;

      inspectSession(session);

      if (!state.inputName) {
        throw new Error(
          "Model ONNX tidak mempunyai input tensor."
        );
      }

      if (!state.outputName) {
        throw new Error(
          "Model ONNX tidak mempunyai output tensor."
        );
      }

      return session;
    } catch (error) {
      state.error = error;

      console.error(
        "[FIDELIS] Gagal load model:",
        error
      );

      throw error;
    }
  }

  function imageToTensor(imageData, model) {
    if (
      !imageData ||
      !imageData.data ||
      !imageData.width ||
      !imageData.height
    ) {
      throw new Error(
        "ImageData tidak valid."
      );
    }

    if (
      !window.ort ||
      !window.ort.Tensor
    ) {
      throw new Error(
        "ONNX Runtime Tensor API belum tersedia."
      );
    }

    const normalizedModel =
      normalizeModel(model);

    const width = imageData.width;
    const height = imageData.height;

    const inputLayout =
      String(
        normalizedModel.inputLayout
      ).toUpperCase();

    const color =
      String(
        normalizedModel.inputColor
      ).toUpperCase();

    const range =
      String(
        normalizedModel.inputRange
      ).toLowerCase();

    const pixelCount =
      width * height;

    const data =
      imageData.data;

    let tensorData;

    if (inputLayout === "NHWC") {
      tensorData =
        new Float32Array(
          pixelCount * 3
        );

      for (
        let i = 0, p = 0;
        i < data.length;
        i += 4, p += 3
      ) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        if (color === "BGR") {
          const temp = r;
          r = b;
          b = temp;
        }

        if (
          range === "-1..1" ||
          range === "-1,1"
        ) {
          r = r / 127.5 - 1;
          g = g / 127.5 - 1;
          b = b / 127.5 - 1;
        } else {
          r /= 255;
          g /= 255;
          b /= 255;
        }

        tensorData[p] = r;
        tensorData[p + 1] = g;
        tensorData[p + 2] = b;
      }

      return new window.ort.Tensor(
        "float32",
        tensorData,
        [
          1,
          height,
          width,
          3
        ]
      );
    }

    /*
     * Default: NCHW
     */

    tensorData =
      new Float32Array(
        pixelCount * 3
      );

    const planeSize =
      pixelCount;

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
        const pixelIndex =
          y * width + x;

        const sourceIndex =
          pixelIndex * 4;

        let r =
          data[sourceIndex];

        let g =
          data[sourceIndex + 1];

        let b =
          data[sourceIndex + 2];

        if (color === "BGR") {
          const temp = r;
          r = b;
          b = temp;
        }

        if (
          range === "-1..1" ||
          range === "-1,1"
        ) {
          r = r / 127.5 - 1;
          g = g / 127.5 - 1;
          b = b / 127.5 - 1;
        } else {
          r /= 255;
          g /= 255;
          b /= 255;
        }

        tensorData[
          pixelIndex
        ] = r;

        tensorData[
          planeSize + pixelIndex
        ] = g;

        tensorData[
          planeSize * 2 + pixelIndex
        ] = b;
      }
    }

    return new window.ort.Tensor(
      "float32",
      tensorData,
      [
        1,
        3,
        height,
        width
      ]
    );
  }

  function validateInputTensor(
    tensor,
    imageData
  ) {
    if (!tensor) {
      throw new Error(
        "Input tensor kosong."
      );
    }

    const dims =
      getTensorShape(tensor);

    if (!dims || dims.length !== 4) {
      throw new Error(
        `Input tensor harus 4D. Shape: ${dims}`
      );
    }

    const expectedPixels =
      imageData.width *
      imageData.height;

    const channels =
      dims[1] === 3
        ? dims[1]
        : dims[3] === 3
          ? dims[3]
          : null;

    if (channels !== 3) {
      throw new Error(
        `Model membutuhkan 3 channel RGB/BGR. Shape: ${dims}`
      );
    }

    if (
      !Number.isFinite(expectedPixels) ||
      expectedPixels <= 0
    ) {
      throw new Error(
        "Ukuran image tidak valid."
      );
    }

    return true;
  }

  async function run(imageData, options = {}) {
    if (!state.session) {
      throw new Error(
        "Model ONNX belum di-load."
      );
    }

    if (!state.model) {
      throw new Error(
        "Konfigurasi model belum tersedia."
      );
    }

    const tensor =
      imageToTensor(
        imageData,
        state.model
      );

    validateInputTensor(
      tensor,
      imageData
    );

    const feeds = {};

    feeds[state.inputName] =
      tensor;

    try {
      const outputs =
        await state.session.run(
          feeds
        );

      if (!outputs) {
        throw new Error(
          "ONNX tidak mengembalikan output."
        );
      }

      let outputTensor =
        outputs[state.outputName];

      if (!outputTensor) {
        const keys =
          Object.keys(outputs);

        if (keys.length > 0) {
          outputTensor =
            outputs[keys[0]];
        }
      }

      if (!outputTensor) {
        throw new Error(
          "Output tensor ONNX tidak ditemukan."
        );
      }

      return {
        tensor: outputTensor,
        shape:
          getTensorShape(
            outputTensor
          ),
        outputName:
          state.outputName,
        model: state.model
      };
    } catch (error) {
      state.error = error;

      console.error(
        "[FIDELIS] ONNX inference error:",
        error
      );

      throw new Error(
        `Inference Real-ESRGAN gagal: ${
          error.message || error
        }`
      );
    }
  }

  function outputToImageData(
    tensor,
    options = {}
  ) {
    if (!tensor || !tensor.data) {
      throw new Error(
        "Output tensor tidak valid."
      );
    }

    const dims =
      getTensorShape(tensor);

    if (!dims || dims.length !== 4) {
      throw new Error(
        `Output tensor harus 4D. Shape: ${dims}`
      );
    }

    const model =
      normalizeModel(
        options.model ||
        state.model
      );

    const layout =
      String(
        model.outputLayout
      ).toUpperCase();

    const color =
      String(
        model.outputColor
      ).toUpperCase();

    const range =
      String(
        model.outputRange
      ).toLowerCase();

    let channels;
    let width;
    let height;

    if (layout === "NHWC") {
      height = dims[1];
      width = dims[2];
      channels = dims[3];
    } else {
      channels = dims[1];
      height = dims[2];
      width = dims[3];
    }

    if (
      channels !== 3 &&
      channels !== 4
    ) {
      throw new Error(
        `Output channel tidak didukung: ${channels}`
      );
    }

    const output =
      new ImageData(
        width,
        height
      );

    const source =
      tensor.data;

    const planeSize =
      width * height;

    function convert(value) {
      if (
        range === "-1..1" ||
        range === "-1,1"
      ) {
        return Math.max(
          0,
          Math.min(
            255,
            Math.round(
              (value + 1) *
              127.5
            )
          )
        );
      }

      if (
        range === "0..255" ||
        range === "0,255"
      ) {
        return Math.max(
          0,
          Math.min(
            255,
            Math.round(value)
          )
        );
      }

      return Math.max(
        0,
        Math.min(
          255,
          Math.round(
            value * 255
          )
        )
      );
    }

    for (
      let i = 0;
      i < planeSize;
      i++
    ) {
      let r;
      let g;
      let b;
      let a = 255;

      if (layout === "NHWC") {
        const index =
          i * channels;

        r = source[index];
        g = source[index + 1];
        b = source[index + 2];

        if (channels === 4) {
          a =
            convert(
              source[index + 3]
            );
        }
      } else {
        r = source[i];

        g =
          source[
            planeSize + i
          ];

        b =
          source[
            planeSize * 2 + i
          ];

        if (channels === 4) {
          a =
            convert(
              source[
                planeSize * 3 + i
              ]
            );
        }
      }

      if (color === "BGR") {
        const temp = r;
        r = b;
        b = temp;
      }

      const outIndex =
        i * 4;

      output.data[outIndex] =
        convert(r);

      output.data[outIndex + 1] =
        convert(g);

      output.data[outIndex + 2] =
        convert(b);

      output.data[outIndex + 3] =
        a;
    }

    return output;
  }

  function tensorToCanvas(
    tensor,
    options = {}
  ) {
    const imageData =
      outputToImageData(
        tensor,
        options
      );

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      imageData.width;

    canvas.height =
      imageData.height;

    const ctx =
      canvas.getContext(
        "2d",
        {
          alpha: true
        }
      );

    ctx.putImageData(
      imageData,
      0,
      0
    );

    return canvas;
  }

  function getStatus() {
    return {
      ready: !!(
        state.initialized &&
        state.session
      ),
      initialized:
        state.initialized,
      session:
        !!state.session,
      model:
        state.model
          ? {
              id:
                state.model.id ||
                null,
              scale:
                state.model.scale
            }
          : null,
      inputName:
        state.inputName,
      outputName:
        state.outputName,
      inputMeta:
        state.inputMeta,
      outputMeta:
        state.outputMeta,
      backend:
        window.FidelisRuntime &&
        typeof window.FidelisRuntime.getBackend ===
          "function"
          ? window.FidelisRuntime.getBackend()
          : null,
      error:
        state.error
          ? state.error.message ||
            String(state.error)
          : null
    };
  }

  function disposeSession() {
    if (
      state.session &&
      typeof state.session.release ===
        "function"
    ) {
      try {
        state.session.release();
      } catch (error) {
        console.warn(
          "[FIDELIS] Session release error:",
          error
        );
      }
    }

    state.session = null;
    state.model = null;
    state.inputName = null;
    state.outputName = null;
    state.inputMeta = null;
    state.outputMeta = null;
  }

  window.FidelisAIInference = {
    init,
    loadModel,
    imageToTensor,
    validateInputTensor,
    run,
    outputToImageData,
    tensorToCanvas,
    inspectSession,
    getStatus,
    disposeSession
  };

  console.log(
    "[FIDELIS] AI Inference module loaded."
  );
})();
