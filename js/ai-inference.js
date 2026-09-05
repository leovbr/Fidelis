(function () {
  "use strict";

  const state = {
    session: null,
    model: null,
    inputName: null,
    outputName: null,
    inputMetadata: null,
    outputMetadata: null,
    backend: null
  };


  function normalizeModel(model) {
    if (!model) {
      return {};
    }

    return {
      ...model,

      scale:
        Number(model.scale || 2),

      inputLayout:
        model.inputLayout || "NCHW",

      inputColor:
        model.inputColor || "RGB",

      inputRange:
        model.inputRange || "0..1",

      outputLayout:
        model.outputLayout || "NCHW",

      outputColor:
        model.outputColor || "RGB",

      outputRange:
        model.outputRange || "0..1"
    };
  }


  function inspectSession(session) {
    if (!session) {
      return null;
    }

    const info = {
      inputNames:
        Array.from(
          session.inputNames || []
        ),

      outputNames:
        Array.from(
          session.outputNames || []
        ),

      inputMetadata:
        session.inputMetadata || null,

      outputMetadata:
        session.outputMetadata || null
    };

    return info;
  }


  async function init() {
    if (
      window.FidelisRuntime &&
      typeof window.FidelisRuntime.init ===
        "function"
    ) {
      const runtime =
        await window.FidelisRuntime.init();

      state.backend =
        runtime.backend || null;

      return runtime;
    }

    throw new Error(
      "FidelisRuntime belum tersedia."
    );
  }


  async function loadModel(
    modelData,
    model
  ) {
    if (!modelData) {
      throw new Error(
        "Model data kosong."
      );
    }

    if (
      !window.FidelisRuntime ||
      typeof window.FidelisRuntime.createSession !==
        "function"
    ) {
      throw new Error(
        "FidelisRuntime belum siap."
      );
    }

    await init();

    const normalized =
      normalizeModel(model);

    const session =
      await window.FidelisRuntime.createSession(
        modelData,
        {
          model:
            normalized
        }
      );

    if (!session) {
      throw new Error(
        "ONNX session gagal dibuat."
      );
    }

    state.session =
      session;

    state.model =
      normalized;

    const info =
      inspectSession(
        session
      );

    state.inputName =
      info &&
      info.inputNames &&
      info.inputNames.length
        ? info.inputNames[0]
        : null;

    state.outputName =
      info &&
      info.outputNames &&
      info.outputNames.length
        ? info.outputNames[0]
        : null;

    state.inputMetadata =
      info
        ? info.inputMetadata
        : null;

    state.outputMetadata =
      info
        ? info.outputMetadata
        : null;

    console.log(
      "[FIDELIS] ONNX session loaded."
    );

    console.log(
      "[FIDELIS] Input:",
      state.inputName
    );

    console.log(
      "[FIDELIS] Output:",
      state.outputName
    );

    console.log(
      "[FIDELIS] Input metadata:",
      state.inputMetadata
    );

    console.log(
      "[FIDELIS] Output metadata:",
      state.outputMetadata
    );

    return session;
  }


  function imageToTensor(
    imageData,
    model = {}
  ) {
    if (!imageData) {
      throw new Error(
        "ImageData kosong."
      );
    }

    if (
      !window.ort ||
      typeof window.ort.Tensor !==
        "function"
    ) {
      throw new Error(
        "ONNX Runtime Tensor API belum tersedia."
      );
    }

    const config =
      normalizeModel(
        model
      );

    const width =
      imageData.width;

    const height =
      imageData.height;

    const pixels =
      imageData.data;

    const layout =
      String(
        config.inputLayout
      ).toUpperCase();

    const color =
      String(
        config.inputColor
      ).toUpperCase();

    const range =
      String(
        config.inputRange
      );

    const channels = 3;

    const total =
      width *
      height *
      channels;

    const tensorData =
      new Float32Array(
        total
      );


    function convert(
      value
    ) {
      if (
        range === "-1..1"
      ) {
        return (
          value / 127.5
        ) - 1;
      }

      return value / 255;
    }


    /*
     * NCHW
     */
    if (
      layout === "NCHW"
    ) {
      const plane =
        width *
        height;

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
          const src =
            (y * width + x) *
            4;

          const r =
            convert(
              pixels[src]
            );

          const g =
            convert(
              pixels[src + 1]
            );

          const b =
            convert(
              pixels[src + 2]
            );

          const p =
            y * width + x;


          if (
            color === "BGR"
          ) {
            tensorData[p] =
              b;

            tensorData[
              plane + p
            ] = g;

            tensorData[
              plane * 2 + p
            ] = r;
          } else {
            tensorData[p] =
              r;

            tensorData[
              plane + p
            ] = g;

            tensorData[
              plane * 2 + p
            ] = b;
          }
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


    /*
     * NHWC
     */
    if (
      layout === "NHWC"
    ) {
      let offset = 0;

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
          const src =
            (y * width + x) *
            4;

          const r =
            convert(
              pixels[src]
            );

          const g =
            convert(
              pixels[src + 1]
            );

          const b =
            convert(
              pixels[src + 2]
            );

          if (
            color === "BGR"
          ) {
            tensorData[
              offset++
            ] = b;

            tensorData[
              offset++
            ] = g;

            tensorData[
              offset++
            ] = r;
          } else {
            tensorData[
              offset++
            ] = r;

            tensorData[
              offset++
            ] = g;

            tensorData[
              offset++
            ] = b;
          }
        }
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


    throw new Error(
      `Unsupported input layout: ${layout}`
    );
  }


  function validateInputTensor(
    tensor
  ) {
    if (!tensor) {
      throw new Error(
        "Input tensor kosong."
      );
    }

    if (
      !tensor.dims ||
      !tensor.data
    ) {
      throw new Error(
        "Input tensor tidak valid."
      );
    }

    return true;
  }


  async function run(
    imageData,
    options = {}
  ) {
    if (
      !state.session
    ) {
      throw new Error(
        "ONNX session belum dimuat."
      );
    }

    if (!state.inputName) {
      throw new Error(
        "Input name model tidak ditemukan."
      );
    }

    if (!state.outputName) {
      throw new Error(
        "Output name model tidak ditemukan."
      );
    }

    const model =
      normalizeModel(
        options.model ||
        state.model
      );


    const tensor =
      imageToTensor(
        imageData,
        model
      );

    validateInputTensor(
      tensor
    );


    const feeds = {};

    feeds[
      state.inputName
    ] = tensor;


    console.log(
      "[FIDELIS] Running inference..."
    );

    console.log(
      "[FIDELIS] Input shape:",
      tensor.dims
    );


    const outputs =
      await state.session.run(
        feeds
      );


    const output =
      outputs[
        state.outputName
      ];


    if (!output) {
      throw new Error(
        "Model tidak menghasilkan output."
      );
    }


    console.log(
      "[FIDELIS] Output shape:",
      output.dims
    );


    return {
      tensor: output,

      outputName:
        state.outputName,

      inputName:
        state.inputName,

      inputShape:
        Array.from(
          tensor.dims
        ),

      outputShape:
        Array.from(
          output.dims
        ),

      model,

      backend:
        state.backend,

      aiProcessed:
        true,

      fallback:
        false
    };
  }


  function outputToImageData(
    tensor,
    options = {}
  ) {
    if (!tensor) {
      throw new Error(
        "Output tensor kosong."
      );
    }

    const model =
      normalizeModel(
        options.model ||
        options
      );

    const dims =
      Array.from(
        tensor.dims || []
      );

    const data =
      tensor.data;


    if (
      dims.length !== 4
    ) {
      throw new Error(
        `Unsupported output dimensions: ${dims.join("x")}`
      );
    }


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
      );


    let width;
    let height;
    let channels;


    if (
      layout === "NCHW"
    ) {
      channels =
        dims[1];

      height =
        dims[2];

      width =
        dims[3];
    } else if (
      layout === "NHWC"
    ) {
      height =
        dims[1];

      width =
        dims[2];

      channels =
        dims[3];
    } else {
      throw new Error(
        `Unsupported output layout: ${layout}`
      );
    }


    if (
      channels !== 3 &&
      channels !== 4
    ) {
      throw new Error(
        `Unsupported channel count: ${channels}`
      );
    }


    const imageData =
      new ImageData(
        width,
        height
      );


    function convert(
      value
    ) {
      let normalized =
        value;

      if (
        range === "-1..1"
      ) {
        normalized =
          (value + 1) /
          2;
      }

      return Math.max(
        0,
        Math.min(
          255,
          Math.round(
            normalized *
              255
          )
        )
      );
    }


    function getChannel(
      x,
      y,
      channel
    ) {
      if (
        layout === "NCHW"
      ) {
        const plane =
          width *
          height;

        const index =
          channel *
            plane +
          y * width +
          x;

        return data[index];
      }

      const index =
        (y * width + x) *
          channels +
        channel;

      return data[index];
    }


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
        let r;
        let g;
        let b;


        if (
          color === "BGR"
        ) {
          b =
            getChannel(
              x,
              y,
              0
            );

          g =
            getChannel(
              x,
              y,
              1
            );

          r =
            getChannel(
              x,
              y,
              2
            );
        } else {
          r =
            getChannel(
              x,
              y,
              0
            );

          g =
            getChannel(
              x,
              y,
              1
            );

          b =
            getChannel(
              x,
              y,
              2
            );
        }


        const index =
          (y * width + x) *
          4;


        imageData.data[
          index
        ] =
          convert(r);

        imageData.data[
          index + 1
        ] =
          convert(g);

        imageData.data[
          index + 2
        ] =
          convert(b);

        imageData.data[
          index + 3
        ] =
          channels === 4
            ? convert(
                getChannel(
                  x,
                  y,
                  3
                )
              )
            : 255;
      }
    }


    return imageData;
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
        "2d"
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
      ready:
        !!state.session,

      session:
        !!state.session,

      inputName:
        state.inputName,

      outputName:
        state.outputName,

      inputNames:
        state.session
          ? Array.from(
              state.session.inputNames ||
                []
            )
          : [],

      outputNames:
        state.session
          ? Array.from(
              state.session.outputNames ||
                []
            )
          : [],

      inputMetadata:
        state.inputMetadata,

      outputMetadata:
        state.outputMetadata,

      model:
        state.model,

      backend:
        state.backend
    };
  }


  function disposeSession() {
    try {
      if (
        state.session &&
        typeof state.session.release ===
          "function"
      ) {
        state.session.release();
      }
    } catch (error) {
      console.warn(
        "[FIDELIS] Session release warning:",
        error
      );
    }


    state.session =
      null;

    state.model =
      null;

    state.inputName =
      null;

    state.outputName =
      null;

    state.inputMetadata =
      null;

    state.outputMetadata =
      null;
  }


  window.FidelisAIInference = {
    init,
    loadModel,
    imageToTensor,
    validateInputTensor,
    run,
    outputToImageData,
    tensorToCanvas,
    getStatus,
    disposeSession
  };


  console.log(
    "[FIDELIS] AI Inference V2 loaded."
  );
})();
