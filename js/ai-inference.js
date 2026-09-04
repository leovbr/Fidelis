(function () {
    "use strict";

    /*
     * FIDELIS AI INFERENCE ENGINE
     * --------------------------------
     *
     * Purpose:
     * - Connect loaded AI models to image processing
     * - Detect available browser acceleration
     * - Prepare tensors
     * - Preserve image dimensions
     * - Prevent fake AI processing
     *
     * IMPORTANT:
     * This engine only performs real inference
     * when a compatible model/runtime is connected.
     */

    let initialized = false;

    let backend = "none";

    let runtime = null;

    /*
     * =========================
     * INITIALIZATION
     * =========================
     */

    async function init() {

        if (initialized) {
            return getStatus();
        }

        backend = detectBackend();

        /*
         * We intentionally do NOT import
         * an external AI runtime here yet.
         *
         * The next integration stage can
         * connect ONNX Runtime Web,
         * WebGPU, or another runtime.
         */

        initialized = true;

        return getStatus();
    }

    /*
     * =========================
     * BACKEND DETECTION
     * =========================
     */

    function detectBackend() {

        if (
            typeof navigator !== "undefined" &&
            "gpu" in navigator
        ) {

            return "webgpu";
        }

        if (
            typeof document !== "undefined"
        ) {

            try {

                const canvas =
                    document.createElement(
                        "canvas"
                    );

                const gl =
                    canvas.getContext(
                        "webgl2"
                    ) ||
                    canvas.getContext(
                        "webgl"
                    );

                if (gl) {
                    return "webgl";
                }

            } catch (error) {

                console.warn(
                    "WebGL detection failed:",
                    error
                );
            }
        }

        if (
            typeof WebAssembly !==
            "undefined"
        ) {

            return "wasm";
        }

        return "none";
    }

    /*
     * =========================
     * STATUS
     * =========================
     */

    function getStatus() {

        return {

            initialized,

            backend,

            runtimeAvailable:
                runtime !== null,

            ready:
                initialized &&
                runtime !== null
        };
    }

    /*
     * =========================
     * RUNTIME
     * =========================
     */

    function setRuntime(
        runtimeInstance
    ) {

        runtime =
            runtimeInstance || null;

        return getStatus();
    }

    function hasRuntime() {

        return runtime !== null;
    }

    /*
     * =========================
     * IMAGE PREPARATION
     * =========================
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

        if (!width || !height) {

            throw new Error(
                "Dimensi image tidak valid."
            );
        }

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width = width;
        canvas.height = height;

        const context =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently: true
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

        /*
         * RGBA -> normalized RGB
         */

        const pixelCount =
            width * height;

        const tensor =
            new Float32Array(
                pixelCount * 3
            );

        for (
            let i = 0;
            i < pixelCount;
            i++
        ) {

            const src =
                i * 4;

            const dst =
                i * 3;

            tensor[dst] =
                imageData.data[src] /
                255;

            tensor[dst + 1] =
                imageData.data[src + 1] /
                255;

            tensor[dst + 2] =
                imageData.data[src + 2] /
                255;
        }

        return {

            data: tensor,

            width,

            height,

            channels: 3,

            layout: "HWC",

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
        width,
        height
    ) {

        if (
            !tensor ||
            !width ||
            !height
        ) {

            throw new Error(
                "Tensor output tidak valid."
            );
        }

        const expected =
            width *
            height *
            3;

        if (
            tensor.length <
            expected
        ) {

            throw new Error(
                "Ukuran tensor tidak sesuai."
            );
        }

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width = width;
        canvas.height = height;

        const context =
            canvas.getContext(
                "2d"
            );

        const imageData =
            context.createImageData(
                width,
                height
            );

        for (
            let i = 0;
            i < width * height;
            i++
        ) {

            const src =
                i * 3;

            const dst =
                i * 4;

            imageData.data[dst] =
                clamp(
                    tensor[src] * 255
                );

            imageData.data[dst + 1] =
                clamp(
                    tensor[src + 1] * 255
                );

            imageData.data[dst + 2] =
                clamp(
                    tensor[src + 2] * 255
                );

            imageData.data[dst + 3] =
                255;
        }

        context.putImageData(
            imageData,
            0,
            0
        );

        return canvas;
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
                "Model AI belum dimuat."
            );
        }

        if (!model.ready) {

            throw new Error(
                "Model AI belum tersedia."
            );
        }

        if (!runtime) {

            throw new Error(
                "AI runtime belum terhubung."
            );
        }

        if (!input) {

            throw new Error(
                "Input AI tidak ditemukan."
            );
        }

        /*
         * Runtime-specific inference
         *
         * This intentionally refuses to
         * produce a fake AI result.
         */

        if (
            typeof runtime.run !==
            "function"
        ) {

            throw new Error(
                "AI runtime tidak memiliki fungsi inference."
            );
        }

        if (
            typeof options.onProgress ===
            "function"
        ) {

            options.onProgress(10);
        }

        const result =
            await runtime.run(
                model,
                input,
                options
            );

        if (
            typeof options.onProgress ===
            "function"
        ) {

            options.onProgress(100);
        }

        return result;
    }

    /*
     * =========================
     * VALIDATION
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
     * UTILITY
     * =========================
     */

    function clamp(value) {

        return Math.max(
            0,
            Math.min(
                255,
                Math.round(value)
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

        getStatus,

        detectBackend,

        setRuntime,

        hasRuntime,

        imageToTensor,

        tensorToImage,

        run,

        validateInput
    };

})();
