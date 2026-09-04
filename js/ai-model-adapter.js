/* =========================================================
   FIDELIS AI MODEL ADAPTER
   Image <-> ONNX Tensor Converter
   ========================================================= */

(function () {

  "use strict";


  const Adapter = {


    /* =====================================================
       NORMALIZE MODEL
       ===================================================== */

    normalizeModel(model) {

      const source =
        model || {};


      return {

        inputLayout:
          String(
            source.inputLayout ||
            source.input_layout ||
            "NCHW"
          ).toUpperCase(),


        outputLayout:
          String(
            source.outputLayout ||
            source.output_layout ||
            "NCHW"
          ).toUpperCase(),


        inputChannels:
          Number(
            source.inputChannels ||
            source.input_channels ||
            3
          ),


        outputChannels:
          Number(
            source.outputChannels ||
            source.output_channels ||
            3
          ),


        inputRange:
          source.inputRange ||
          source.input_range ||
          "0..1",


        outputRange:
          source.outputRange ||
          source.output_range ||
          "0..1",


        inputColor:
          String(
            source.inputColor ||
            source.input_color ||
            "RGB"
          ).toUpperCase(),


        outputColor:
          String(
            source.outputColor ||
            source.output_color ||
            "RGB"
          ).toUpperCase()

      };

    },


    /* =====================================================
       IMAGE DATA → TENSOR
       ===================================================== */

    createInputTensor(
      imageData,
      model
    ) {

      if (!imageData) {

        throw new Error(
          "FIDELIS: Missing image data."
        );

      }


      if (
        typeof ort === "undefined" ||
        !ort.Tensor
      ) {

        throw new Error(
          "FIDELIS: ONNX Runtime Tensor unavailable."
        );

      }


      const config =
        this.normalizeModel(
          model
        );


      const width =
        Number(
          imageData.width
        );


      const height =
        Number(
          imageData.height
        );


      if (
        !width ||
        !height
      ) {

        throw new Error(
          "FIDELIS: Invalid image dimensions."
        );

      }


      const pixels =
        imageData.data;


      if (
        !pixels ||
        pixels.length <
        width * height * 4
      ) {

        throw new Error(
          "FIDELIS: Invalid RGBA image data."
        );

      }


      if (
        config.inputChannels !== 3
      ) {

        throw new Error(
          "FIDELIS: Only 3-channel RGB models are supported."
        );

      }


      /*
       NCHW:
       [R channel]
       [G channel]
       [B channel]
       */

      const channelSize =
        width * height;


      const tensorData =
        new Float32Array(
          channelSize * 3
        );


      const rOffset =
        0;


      const gOffset =
        channelSize;


      const bOffset =
        channelSize * 2;


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
            (
              y * width +
              x
            ) * 4;


          let r =
            pixels[pixelIndex];


          let g =
            pixels[pixelIndex + 1];


          let b =
            pixels[pixelIndex + 2];


          /*
           RGB → BGR if required.
           */

          if (
            config.inputColor ===
            "BGR"
          ) {

            const temp =
              r;

            r = b;
            b = temp;

          }


          /*
           0..255 → 0..1
           */

          if (
            config.inputRange ===
            "0..1"
          ) {

            r /= 255;
            g /= 255;
            b /= 255;

          }


          /*
           -1..1
           */

          else if (
            config.inputRange ===
            "-1..1"
          ) {

            r =
              (
                r / 255
              ) * 2 - 1;


            g =
              (
                g / 255
              ) * 2 - 1;


            b =
              (
                b / 255
              ) * 2 - 1;

          }


          const index =
            y * width + x;


          tensorData[
            rOffset + index
          ] = r;


          tensorData[
            gOffset + index
          ] = g;


          tensorData[
            bOffset + index
          ] = b;

        }

      }


      /*
       Currently Real-ESRGAN uses NCHW.
       */

      if (
        config.inputLayout !==
        "NCHW"
      ) {

        throw new Error(
          "FIDELIS: This adapter currently expects NCHW input."
        );

      }


      return new ort.Tensor(
        "float32",
        tensorData,
        [
          1,
          3,
          height,
          width
        ]
      );

    },


    /* =====================================================
       CANVAS → INPUT IMAGE DATA
       ===================================================== */

    canvasToImageData(canvas) {

      if (!canvas) {

        throw new Error(
          "FIDELIS: Canvas missing."
        );

      }


      const ctx =
        canvas.getContext(
          "2d",
          {
            willReadFrequently: true
          }
        );


      if (!ctx) {

        throw new Error(
          "FIDELIS: Canvas context unavailable."
        );

      }


      return ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    },


    /* =====================================================
       TENSOR → CANVAS
       ===================================================== */

    outputToCanvas(
      tensor,
      model
    ) {

      if (!tensor) {

        throw new Error(
          "FIDELIS: Missing model output."
        );

      }


      const config =
        this.normalizeModel(
          model
        );


      const dims =
        Array.from(
          tensor.dims || []
        );


      if (
        dims.length !== 4
      ) {

        throw new Error(
          "FIDELIS: Unsupported output tensor dimensions."
        );

      }


      let channels;
      let height;
      let width;


      /*
       NCHW:
       [1,C,H,W]
       */

      if (
        config.outputLayout ===
        "NCHW"
      ) {

        channels =
          dims[1];

        height =
          dims[2];

        width =
          dims[3];

      }


      /*
       NHWC:
       [1,H,W,C]
       */

      else if (
        config.outputLayout ===
        "NHWC"
      ) {

        height =
          dims[1];

        width =
          dims[2];

        channels =
          dims[3];

      }


      else {

        throw new Error(
          "FIDELIS: Unsupported output layout."
        );

      }


      if (
        channels < 3
      ) {

        throw new Error(
          "FIDELIS: Model output has fewer than 3 channels."
        );

      }


      const output =
        tensor.data;


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
          "2d"
        );


      const imageData =
        ctx.createImageData(
          width,
          height
        );


      const pixels =
        imageData.data;


      const planeSize =
        width * height;


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

          const pixel =
            y * width + x;


          let r;
          let g;
          let b;


          if (
            config.outputLayout ===
            "NCHW"
          ) {

            r =
              output[
                pixel
              ];


            g =
              output[
                planeSize + pixel
              ];


            b =
              output[
                planeSize * 2 + pixel
              ];

          }


          else {

            const index =
              (
                pixel *
                channels
              );


            r =
              output[index];


            g =
              output[index + 1];


            b =
              output[index + 2];

          }


          /*
           Convert output range.
           */

          if (
            config.outputRange ===
            "0..1"
          ) {

            r *= 255;
            g *= 255;
            b *= 255;

          }


          else if (
            config.outputRange ===
            "-1..1"
          ) {

            r =
              (
                r + 1
              ) * 127.5;


            g =
              (
                g + 1
              ) * 127.5;


            b =
              (
                b + 1
              ) * 127.5;

          }


          /*
           BGR → RGB.
           */

          if (
            config.outputColor ===
            "BGR"
          ) {

            const temp =
              r;

            r = b;
            b = temp;

          }


          const index =
            pixel * 4;


          pixels[index] =
            this.clampByte(r);


          pixels[index + 1] =
            this.clampByte(g);


          pixels[index + 2] =
            this.clampByte(b);


          pixels[index + 3] =
            255;

        }

      }


      ctx.putImageData(
        imageData,
        0,
        0
      );


      return canvas;

    },


    /* =====================================================
       CLAMP
       ===================================================== */

    clampByte(value) {

      if (!Number.isFinite(value)) {
        return 0;
      }


      return Math.max(
        0,
        Math.min(
          255,
          Math.round(value)
        )
      );

    },


    /* =====================================================
       VALIDATE TENSOR
       ===================================================== */

    validateTensor(
      tensor
    ) {

      if (!tensor) {

        return {
          valid: false,
          reason: "Tensor missing."
        };

      }


      if (
        !tensor.dims ||
        !tensor.data
      ) {

        return {
          valid: false,
          reason: "Tensor data missing."
        };

      }


      return {

        valid: true,

        dims:
          Array.from(
            tensor.dims
          ),

        type:
          tensor.type,

        size:
          tensor.data.length

      };

    },


    /* =====================================================
       MODEL PRESET
       ===================================================== */

    createPreset(
      scale = 4
    ) {

      return {

        inputLayout:
          "NCHW",

        outputLayout:
          "NCHW",

        inputChannels:
          3,

        outputChannels:
          3,

        inputRange:
          "0..1",

        outputRange:
          "0..1",

        inputColor:
          "RGB",

        outputColor:
          "RGB",

        scale:
          Number(scale)

      };

    }

  };


  window.FidelisAIModelAdapter =
    Adapter;


})();
