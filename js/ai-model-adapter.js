(function () {
    "use strict";

    /*
     * FIDELIS AI MODEL ADAPTER
     * =========================
     *
     * Converts FIDELIS image tensors into
     * the format expected by a super-resolution
     * ONNX model and converts the output back.
     *
     * This layer exists because different
     * ONNX models may use:
     *
     * RGB / BGR
     * NCHW / NHWC
     * 0..1 / 0..255 / -1..1
     *
     * The model configuration determines
     * which format is used.
     */

    const DEFAULT_CONFIG = {

        inputLayout: "NCHW",

        outputLayout: "NCHW",

        channels: 3,

        inputRange: "0_1",

        outputRange: "0_1",

        channelOrder: "RGB",

        outputChannelOrder: "RGB"
    };

    /*
     * =========================
     * GET CONFIG
     * =========================
     */

    function getConfig(
        model
    ) {

        const config =
            model &&
            model.adapter
                ? model.adapter
                : {};

        return {

            ...DEFAULT_CONFIG,

            ...config
        };
    }

    /*
     * =========================
     * CREATE INPUT TENSOR
     * =========================
     */

    function createInputTensor(
        ort,
        imageData,
        model
    ) {

        if (!ort) {

            throw new Error(
                "ONNX Runtime tidak tersedia."
            );
        }

        if (
            !imageData ||
            !imageData.tensor
        ) {

            throw new Error(
                "Input image tensor tidak valid."
            );
        }

        const config =
            getConfig(
                model
            );

        const source =
            imageData.tensor;

        const width =
            imageData.width;

        const height =
            imageData.height;

        /*
         * Already NCHW RGB float32.
         */

        let data =
            new Float32Array(
                source.data
            );

        /*
         * Convert value range.
         */

        data =
            convertInputRange(
                data,
                config.inputRange
            );

        /*
         * Convert RGB/BGR.
         */

        if (
            config.channelOrder ===
            "BGR"
        ) {

            data =
                swapRGB(
                    data,
                    width,
                    height
                );
        }

        /*
         * Convert layout.
         */

        if (
            config.inputLayout ===
            "NHWC"
        ) {

            data =
                nchwToNhwc(
                    data,
                    width,
                    height
                );

            return new ort.Tensor(
                "float32",
                data,
                [
                    1,
                    height,
                    width,
                    3
                ]
            );
        }

        return new ort.Tensor(
            "float32",
            data,
            [
                1,
                3,
                height,
                width
            ]
        );
    }

    /*
     * =========================
     * OUTPUT NORMALIZATION
     * =========================
     */

    function normalizeOutput(
        tensor,
        model
    ) {

        if (!tensor) {

            throw new Error(
                "Output tensor kosong."
            );
        }

        const config =
            getConfig(
                model
            );

        let dims =
            Array.from(
                tensor.dims
            );

        let data =
            new Float32Array(
                tensor.data
            );

        let width;

        let height;

        /*
         * Convert NHWC → NCHW.
         */

        if (
            config.outputLayout ===
            "NHWC"
        ) {

            if (
                dims.length !== 4
            ) {

                throw new Error(
                    "Output NHWC tidak valid."
                );
            }

            height =
                dims[1];

            width =
                dims[2];

            data =
                nhwcToNchw(
                    data,
                    width,
                    height
                );

            dims = [
                1,
                3,
                height,
                width
            ];
        } else {

            if (
                dims.length !== 4
            ) {

                throw new Error(
                    "Output NCHW tidak valid."
                );
            }

            height =
                dims[2];

            width =
                dims[3];
        }

        /*
         * RGB/BGR correction.
         */

        if (
            config.outputChannelOrder ===
            "BGR"
        ) {

            data =
                swapRGB(
                    data,
                    width,
                    height
                );
        }

        /*
         * Convert output range
         * to 0..1.
         */

        data =
            convertOutputRange(
                data,
                config.outputRange
            );

        return {

            data,

            dims,

            width,

            height,

            channels: 3,

            layout: "NCHW",

            range: "0_1"
        };
    }

    /*
     * =========================
     * INPUT RANGE
     * =========================
     */

    function convertInputRange(
        data,
        range
    ) {

        const output =
            new Float32Array(
                data.length
            );

        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const value =
                data[i];

            if (
                range ===
                "0_255"
            ) {

                output[i] =
                    value * 255;

            } else if (
                range ===
                "-1_1"
            ) {

                output[i] =
                    value * 2 - 1;

            } else {

                /*
                 * 0..1
                 */

                output[i] =
                    value;
            }
        }

        return output;
    }

    /*
     * =========================
     * OUTPUT RANGE
     * =========================
     */

    function convertOutputRange(
        data,
        range
    ) {

        const output =
            new Float32Array(
                data.length
            );

        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const value =
                data[i];

            if (
                range ===
                "0_255"
            ) {

                output[i] =
                    value / 255;

            } else if (
                range ===
                "-1_1"
            ) {

                output[i] =
                    (
                        value + 1
                    ) / 2;

            } else {

                output[i] =
                    value;
            }

            /*
             * Safety clamp.
             */

            output[i] =
                Math.max(
                    0,
                    Math.min(
                        1,
                        output[i]
                    )
                );
        }

        return output;
    }

    /*
     * =========================
     * RGB ↔ BGR
     * =========================
     */

    function swapRGB(
        data,
        width,
        height
    ) {

        const pixelCount =
            width * height;

        const output =
            new Float32Array(
                data.length
            );

        /*
         * NCHW:
         *
         * R plane
         * G plane
         * B plane
         */

        for (
            let i = 0;
            i < pixelCount;
            i++
        ) {

            output[i] =
                data[
                    pixelCount * 2 +
                    i
                ];

            output[
                pixelCount + i
            ] =
                data[
                    pixelCount + i
                ];

            output[
                pixelCount * 2 + i
            ] =
                data[i];
        }

        return output;
    }

    /*
     * =========================
     * NCHW → NHWC
     * =========================
     */

    function nchwToNhwc(
        data,
        width,
        height
    ) {

        const pixelCount =
            width * height;

        const output =
            new Float32Array(
                pixelCount * 3
            );

        for (
            let i = 0;
            i < pixelCount;
            i++
        ) {

            output[
                i * 3
            ] =
                data[i];

            output[
                i * 3 + 1
            ] =
                data[
                    pixelCount + i
                ];

            output[
                i * 3 + 2
            ] =
                data[
                    pixelCount * 2 + i
                ];
        }

        return output;
    }

    /*
     * =========================
     * NHWC → NCHW
     * =========================
     */

    function nhwcToNchw(
        data,
        width,
        height
    ) {

        const pixelCount =
            width * height;

        const output =
            new Float32Array(
                pixelCount * 3
            );

        for (
            let i = 0;
            i < pixelCount;
            i++
        ) {

            output[i] =
                data[
                    i * 3
                ];

            output[
                pixelCount + i
            ] =
                data[
                    i * 3 + 1
                ];

            output[
                pixelCount * 2 + i
            ] =
                data[
                    i * 3 + 2
                ];
        }

        return output;
    }

    /*
     * =========================
     * OUTPUT VALIDATION
     * =========================
     */

    function validateOutput(
        output,
        model
    ) {

        if (!output) {

            return {

                valid: false,

                reason:
                    "Output kosong."
            };
        }

        if (
            !output.data ||
            !output.dims
        ) {

            return {

                valid: false,

                reason:
                    "Output tensor tidak valid."
            };
        }

        if (
            output.dims.length !== 4
        ) {

            return {

                valid: false,

                reason:
                    "Output harus memiliki 4 dimensi."
            };
        }

        const channels =
            output.dims[1];

        if (
            channels !== 3
        ) {

            return {

                valid: false,

                reason:
                    "Model output harus RGB 3-channel."
            };
        }

        const maxOutput =
            model &&
            model.maxOutput
                ? model.maxOutput
                : 8192;

        const width =
            output.dims[3];

        const height =
            output.dims[2];

        if (
            width > maxOutput ||
            height > maxOutput
        ) {

            return {

                valid: false,

                reason:
                    "Output model melebihi batas resolusi."
            };
        }

        return {
            valid: true
        };
    }

    /*
     * =========================
     * CONFIG PRESETS
     * =========================
     */

    function createPreset(
        type
    ) {

        const key =
            String(
                type || "default"
            )
                .toLowerCase();

        /*
         * Generic RGB NCHW model.
         */

        if (
            key === "realesrgan" ||
            key === "real-esrgan"
        ) {

            return {

                inputLayout: "NCHW",

                outputLayout: "NCHW",

                channels: 3,

                inputRange: "0_1",

                outputRange: "0_1",

                channelOrder: "RGB",

                outputChannelOrder: "RGB"
            };
        }

        return {
            ...DEFAULT_CONFIG
        };
    }

    /*
     * =========================
     * PUBLIC API
     * =========================
     */

    window.FidelisModelAdapter = {

        getConfig,

        createInputTensor,

        normalizeOutput,

        validateOutput,

        createPreset
    };

})();
