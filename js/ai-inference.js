(function () {
    "use strict";

    /*
     * FIDELIS AI INFERENCE
     * =========================
     *
     * Real ONNX Runtime Web inference.
     *
     * Pipeline:
     *
     * Image
     *   ↓
     * Tensor
     *   ↓
     * ONNX Session
     *   ↓
     * Model inference
     *   ↓
     * Output Tensor
     *   ↓
     * Image
     *
     * No fake AI fallback is performed.
     */

    let initialized = false;

    let activeSession = null;

    let activeModelId = null;

    /*
     * =========================
     * INITIALIZE
     * =========================
     */

    async function init() {

        if (initialized) {
            return getStatus();
        }

        if (!window.FidelisRuntime) {

            throw new Error(
                "FIDELIS AI Runtime belum tersedia."
            );
        }

        await FidelisRuntime.init();

        initialized = true;

        return getStatus();
    }

    /*
     * =========================
     * LOAD MODEL SESSION
     * =========================
     */

    async function loadModel(
        model,
        options = {}
    ) {

        if (!model) {

            throw new Error(
                "Model tidak ditemukan."
            );
        }

        if (!model.ready) {

            throw new Error(
                "Model belum siap."
            );
        }

        if (!model.data) {

            throw new Error(
                "Data ONNX model tidak tersedia."
            );
        }

        await init();

        /*
         * Reuse current session when
         * the same model is already active.
         */

        if (
            activeSession &&
            activeModelId === model.id
        ) {

            return activeSession;
        }

        /*
         * Dispose previous session.
         */

        await disposeSession();

        activeSession =
            await FidelisRuntime
                .createSession(
                    model.data,
                    options
                );

        activeModelId =
            model.id;

        return activeSession;
    }

    /*
     * =========================
     * IMAGE -> TENSOR
     * =========================
     *
     * Produces NCHW RGB float32.
     */

    async function imageToTensor(
        image,
        options = {}
    ) {

        if (!image) {

            throw new Error(
                "Image tidak ditemukan."
            );
        }

        const width =
            image.naturalWidth ||
            image.videoWidth ||
            image.width;

        const height =
            image.naturalHeight ||
            image.videoHeight ||
            image.height;

        if (
            !width ||
            !height
        ) {

            throw new Error(
                "Dimensi image tidak valid."
            );
        }

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            width;

        canvas.height =
            height;

        const context =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently:
                        true
                }
            );

        context.drawImage(
            image,
            0,
            0,
            width,
            height
        );

        const imageData =
            context.getImageData(
                0,
                0,
                width,
                height
            );

        const pixelCount =
            width * height;

        /*
         * NCHW:
         *
         * RRRR...
         * GGGG...
         * BBBB...
         */

        const tensorData =
            new Float32Array(
                pixelCount * 3
            );

        const redOffset = 0;

        const greenOffset =
            pixelCount;

        const blueOffset =
            pixelCount * 2;

        for (
            let i = 0;
            i < pixelCount;
            i++
        ) {

            const src =
                i * 4;

            tensorData[
                redOffset + i
            ] =
                imageData.data[src] /
                255;

            tensorData[
                greenOffset + i
            ] =
                imageData.data[src + 1] /
                255;

            tensorData[
                blueOffset + i
            ] =
                imageData.data[src + 2] /
                255;
        }

        /*
         * Actual ONNX Tensor.
         */

        const ort =
            FidelisRuntime.getORT();

        const tensor =
            new ort.Tensor(
                "float32",
                tensorData,
                [
                    1,
                    3,
                    height,
                    width
                ]
            );

        return {

            tensor,

            width,

            height,

            channels: 3,

            layout: "NCHW",

            normalized: true
        };
    }

    /*
     * =========================
     * TENSOR -> IMAGE
     * =========================
     */

    function tensorToImage(
        tensor,
        options = {}
    ) {

        if (!tensor) {

            throw new Error(
                "Output tensor tidak ditemukan."
            );
        }

        const data =
            tensor.data;

        const dims =
            tensor.dims;

        if (
            !data ||
            !dims ||
            dims.length !== 4
        ) {

            throw new Error(
                "Format output tensor tidak valid."
            );
        }

        /*
         * Expected:
         *
         * [1, 3, H, W]
         */

        const batch =
            dims[0];

        const channels =
            dims[1];

        const height =
            dims[2];

        const width =
            dims[3];

        if (
            batch !== 1 ||
            channels < 3
        ) {

            throw new Error(
                "Output model harus memiliki format [1,3,H,W]."
            );
        }

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            width;

        canvas.height =
            height;

        const context =
            canvas.getContext(
                "2d"
            );

        const imageData =
            context.createImageData(
                width,
                height
            );

        const pixelCount =
            width * height;

        const redOffset =
            0;

        const greenOffset =
            pixelCount;

        const blueOffset =
            pixelCount * 2;

        for (
            let i = 0;
            i < pixelCount;
            i++
        ) {

            const dst =
                i * 4;

            const r =
                data[
                    redOffset + i
                ];

            const g =
                data[
                    greenOffset + i
                ];

            const b =
                data[
                    blueOffset + i
                ];

            imageData.data[dst] =
                normalizePixel(r);

            imageData.data[dst + 1] =
                normalizePixel(g);

            imageData.data[dst + 2] =
                normalizePixel(b);

            imageData.data[dst + 3] =
                255;
        }

        context.putImageData(
            imageData,
            0,
            0
        );

        return {

            canvas,

            width,

            height,

            channels
        };
    }

    /*
     * =========================
     * INFERENCE
     * =========================
     */

    async function run(
        model,
        input,
        options = {}
    ) {

        if (!model) {

            throw new Error(
                "Model AI tidak ditemukan."
            );
        }

        if (!input) {

            throw new Error(
                "Input tensor tidak ditemukan."
            );
        }

        const session =
            await loadModel(
                model,
                options
            );

        if (!session) {

            throw new Error(
                "Inference session gagal dibuat."
            );
        }

        /*
         * Get model input/output names.
         */

        const inputNames =
            session.inputNames || [];

        const outputNames =
            session.outputNames || [];

        if (!inputNames.length) {

            throw new Error(
                "Model tidak memiliki input."
            );
        }

        if (!outputNames.length) {

            throw new Error(
                "Model tidak memiliki output."
            );
        }

        /*
         * Use first input/output.
         *
         * Most single-image restoration
         * models follow this structure.
         */

        const inputName =
            options.inputName ||
            inputNames[0];

        const outputName =
            options.outputName ||
            outputNames[0];

        if (
            typeof options.onProgress ===
            "function"
        ) {

            options.onProgress(10);
        }

        /*
         * Run real ONNX inference.
         */

        const feeds = {};

        feeds[inputName] =
            input.tensor ||
            input;

        const results =
            await session.run(
                feeds
            );

        if (
            typeof options.onProgress ===
            "function"
        ) {

            options.onProgress(85);
        }

        const output =
            results[outputName];

        if (!output) {

            /*
             * Some models can expose
             * a different output key.
             */

            const firstOutput =
                Object.values(
                    results
                )[0];

            if (!firstOutput) {

                throw new Error(
                    "Model tidak menghasilkan output."
                );
            }

            return {

                data:
                    firstOutput.data,

                dims:
                    firstOutput.dims,

                tensor:
                    firstOutput
            };
        }

        if (
            typeof options.onProgress ===
            "function"
        ) {

            options.onProgress(100);
        }

        return {

            data:
                output.data,

            dims:
                output.dims,

            tensor:
                output
        };
    }

    /*
     * =========================
     * VALIDATE
     * =========================
     */

    function validateInput(
        image,
        modelConfig
    ) {

        if (!image) {

            return {

                valid: false,

                reason:
                    "Image tidak ditemukan."
            };
        }

        if (!modelConfig) {

            return {

                valid: false,

                reason:
                    "Konfigurasi model tidak ditemukan."
            };
        }

        const width =
            image.naturalWidth ||
            image.width;

        const height =
            image.naturalHeight ||
            image.height;

        const max =
            modelConfig.maxInput ||
            modelConfig.maxInputResolution ||
            4096;

        if (
            width > max ||
            height > max
        ) {

            return {

                valid: false,

                reason:
                    "Resolusi input melebihi batas model."
            };
        }

        return {
            valid: true
        };
    }

    /*
     * =========================
     * OUTPUT -> IMAGE
     * =========================
     */

    function outputToImage(
        output
    ) {

        if (
            !output ||
            !output.tensor
        ) {

            throw new Error(
                "Output tensor tidak tersedia."
            );
        }

        return tensorToImage(
            output.tensor
        );
    }

    /*
     * =========================
     * DISPOSE
     * =========================
     */

    async function disposeSession() {

        if (
            activeSession &&
            typeof activeSession
                .release === "function"
        ) {

            try {

                await activeSession.release();

            } catch (error) {

                console.warn(
                    "Failed to release ONNX session:",
                    error
                );
            }
        }

        activeSession = null;

        activeModelId = null;
    }

    /*
     * =========================
     * STATUS
     * =========================
     */

    function getStatus() {

        const runtime =
            window.FidelisRuntime
                ? FidelisRuntime.getStatus()
                : null;

        return {

            initialized,

            session:
                activeSession !== null,

            activeModel:
                activeModelId,

            runtime
        };
    }

    /*
     * =========================
     * UTILITY
     * =========================
     */

    function normalizePixel(
        value
    ) {

        /*
         * Some models return:
         *
         * 0..1
         *
         * while others may return:
         *
         * -1..1
         */

        let v =
            Number(value);

        if (!Number.isFinite(v)) {
            v = 0;
        }

        if (
            v >= -1 &&
            v <= 1
        ) {

            /*
             * If negative values exist,
             * assume [-1,1].
             */

            if (v < 0) {
                v =
                    (v + 1) / 2;
            }
        }

        return Math.max(
            0,
            Math.min(
                255,
                Math.round(
                    v * 255
                )
            )
        );
    }

    /*
     * =========================
     * PUBLIC API
     * =========================
     */

    window.FidelisInference = {

        init,

        loadModel,

        imageToTensor,

        tensorToImage,

        outputToImage,

        run,

        validateInput,

        disposeSession,

        getStatus
    };

})();
