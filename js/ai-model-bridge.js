(function () {
    "use strict";

    /*
     * FIDELIS AI MODEL BRIDGE
     * ========================
     *
     * Bridge:
     *
     * UI
     * ↓
     * Model Config
     * ↓
     * Model Loader
     * ↓
     * ONNX Runtime
     * ↓
     * Inference
     *
     * Tidak ada fake AI fallback.
     */

    let currentModel = null;

    let currentSession = null;


    /*
     * =========================================
     * INITIALIZE
     * =========================================
     */

    async function init() {

        if (
            !window.FidelisRuntime
        ) {

            throw new Error(
                "FIDELIS Runtime belum tersedia."
            );
        }

        await FidelisRuntime.init();

        return status();
    }


    /*
     * =========================================
     * PREPARE MODEL
     * =========================================
     */

    async function prepare(
        quality,
        options = {}
    ) {

        const key =
            normalize(
                quality
            );

        /*
         * Get central config.
         */

        let config = null;

        if (
            window.FidelisAIModelConfig
        ) {

            config =
                FidelisAIModelConfig.get(
                    key
                );
        }

        if (!config) {

            throw new Error(
                "Konfigurasi model tidak ditemukan."
            );
        }


        /*
         * VVIP protection.
         */

        if (
            config.tier === "vvip"
        ) {

            if (
                window.FidelisTier &&
                !FidelisTier.canUse(
                    "ultra"
                )
            ) {

                throw new Error(
                    "Model Ultra membutuhkan akses VVIP."
                );
            }
        }


        /*
         * Loader must exist.
         */

        if (
            !window.FidelisModelLoader
        ) {

            throw new Error(
                "Model Loader belum tersedia."
            );
        }


        /*
         * Make sure loader knows
         * the configured URL.
         */

        if (
            config.modelURL &&
            window.FidelisModelLoader.setModelURL
        ) {

            FidelisModelLoader.setModelURL(
                key,
                config.modelURL
            );
        }


        /*
         * Load actual ONNX binary.
         */

        const model =
            await FidelisModelLoader.load(
                key,
                {
                    onProgress:
                        options.onProgress
                }
            );


        /*
         * IMPORTANT:
         *
         * Do not continue if the model
         * is unavailable.
         */

        if (
            !model ||
            !model.ready ||
            !model.data
        ) {

            throw new Error(
                "Model ONNX nyata belum tersedia."
            );
        }


        /*
         * Initialize runtime.
         */

        await init();


        /*
         * Create inference session.
         */

        if (
            !window.FidelisInference
        ) {

            throw new Error(
                "FIDELIS Inference Engine belum tersedia."
            );
        }


        currentSession =
            await FidelisInference
                .loadModel(
                    model,
                    {
                        backend:
                            options.backend
                    }
                );


        currentModel = {

            ...model,

            config
        };


        return {

            model:
                currentModel,

            session:
                currentSession,

            runtime:
                FidelisRuntime.getStatus(),

            ready: true
        };
    }


    /*
     * =========================================
     * RUN
     * =========================================
     */

    async function run(
        image,
        quality,
        options = {}
    ) {

        if (!image) {

            throw new Error(
                "Image input tidak ditemukan."
            );
        }


        /*
         * Prepare model.
         */

        const prepared =
            await prepare(
                quality,
                {
                    onProgress:
                        options.onProgress
                }
            );


        const model =
            prepared.model;


        /*
         * Convert image → tensor.
         */

        const imageTensor =
            await FidelisInference
                .imageToTensor(
                    image
                );


        /*
         * Validate input.
         */

        const validation =
            FidelisInference
                .validateInput(
                    image,
                    model
                );


        if (!validation.valid) {

            throw new Error(
                validation.reason
            );
        }


        /*
         * Adapt tensor according
         * to model configuration.
         */

        let adaptedInput =
            imageTensor;


        if (
            window.FidelisModelAdapter
        ) {

            const adapterConfig = {

                ...model,

                adapter: {

                    inputLayout:
                        model.config.input
                            .layout,

                    outputLayout:
                        model.config.output
                            .layout,

                    inputRange:
                        model.config.input
                            .range,

                    outputRange:
                        model.config.output
                            .range,

                    channelOrder:
                        model.config.input
                            .order,

                    outputChannelOrder:
                        model.config.output
                            .order
                }
            };


            const ort =
                FidelisRuntime.getORT();


            adaptedInput = {

                ...imageTensor,

                tensor:
                    FidelisModelAdapter
                        .createInputTensor(
                            ort,
                            imageTensor,
                            adapterConfig
                        )
            };
        }


        /*
         * REAL INFERENCE.
         */

        const result =
            await FidelisInference.run(
                model,
                adaptedInput,
                {
                    onProgress:
                        options.onProgress
                }
            );


        /*
         * Normalize output.
         */

        let output =
            result;


        if (
            window.FidelisModelAdapter
        ) {

            const normalized =
                FidelisModelAdapter
                    .normalizeOutput(
                        result.tensor,
                        {
                            adapter: {

                                outputLayout:
                                    model.config
                                        .output
                                        .layout,

                                outputRange:
                                    model.config
                                        .output
                                        .range,

                                outputChannelOrder:
                                    model.config
                                        .output
                                        .order
                            }
                        }
                    );


            const valid =
                FidelisModelAdapter
                    .validateOutput(
                        normalized,
                        model
                    );


            if (!valid.valid) {

                throw new Error(
                    valid.reason
                );
            }


            output = {

                ...result,

                data:
                    normalized.data,

                dims:
                    normalized.dims,

                width:
                    normalized.width,

                height:
                    normalized.height
            };
        }


        /*
         * Convert output tensor
         * into an actual image.
         */

        const imageResult =
            tensorToCanvas(
                output
            );


        return {

            canvas:
                imageResult.canvas,

            width:
                imageResult.width,

            height:
                imageResult.height,

            model:
                model.id,

            scale:
                model.scale,

            aiProcessed:
                true,

            fallback:
                false,

            engine:
                "ONNX Runtime Web",

            backend:
                FidelisRuntime
                    .getStatus()
                    .backend
        };
    }


    /*
     * =========================================
     * TENSOR → CANVAS
     * =========================================
     */

    function tensorToCanvas(
        output
    ) {

        if (
            !output ||
            !output.data ||
            !output.dims
        ) {

            throw new Error(
                "Output AI tidak valid."
            );
        }


        const dims =
            output.dims;


        if (
            dims.length !== 4
        ) {

            throw new Error(
                "Output model harus 4D."
            );
        }


        const channels =
            dims[1];

        const height =
            dims[2];

        const width =
            dims[3];


        if (
            channels !== 3
        ) {

            throw new Error(
                "Output model harus RGB."
            );
        }


        const data =
            output.data;


        const pixels =
            width * height;


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


        for (
            let i = 0;
            i < pixels;
            i++
        ) {

            const r =
                clamp01(
                    data[i]
                );

            const g =
                clamp01(
                    data[
                        pixels + i
                    ]
                );

            const b =
                clamp01(
                    data[
                        pixels * 2 + i
                    ]
                );


            const index =
                i * 4;


            imageData.data[index] =
                Math.round(
                    r * 255
                );

            imageData.data[index + 1] =
                Math.round(
                    g * 255
                );

            imageData.data[index + 2] =
                Math.round(
                    b * 255
                );

            imageData.data[index + 3] =
                255;
        }


        ctx.putImageData(
            imageData,
            0,
            0
        );


        return {

            canvas,

            width,

            height
        };
    }


    /*
     * =========================================
     * NORMALIZE
     * =========================================
     */

    function normalize(
        quality
    ) {

        if (
            window.FidelisAIModelConfig
        ) {

            return FidelisAIModelConfig
                .normalizeQuality(
                    quality
                );
        }


        const value =
            String(
                quality || "standard"
            )
            .toLowerCase();


        if (
            value === "ultra" ||
            value === "vvip"
        ) {
            return "ultra";
        }


        if (
            value === "high" ||
            value === "hd"
        ) {
            return "high";
        }


        return "basic";
    }


    /*
     * =========================================
     * CLAMP
     * =========================================
     */

    function clamp01(
        value
    ) {

        const number =
            Number(value);


        if (
            !Number.isFinite(
                number
            )
        ) {

            return 0;
        }


        return Math.max(
            0,
            Math.min(
                1,
                number
            )
        );
    }


    /*
     * =========================================
     * STATUS
     * =========================================
     */

    function status() {

        return {

            ready:
                Boolean(
                    currentSession
                ),

            model:
                currentModel
                    ? currentModel.id
                    : null,

            session:
                Boolean(
                    currentSession
                ),

            runtime:
                window.FidelisRuntime
                    ? FidelisRuntime
                        .getStatus()
                    : null
        };
    }


    /*
     * =========================================
     * RELEASE
     * =========================================
     */

    async function release() {

        if (
            window.FidelisInference
        ) {

            await FidelisInference
                .disposeSession();
        }


        if (
            window.FidelisModelLoader
        ) {

            FidelisModelLoader
                .unload();
        }


        currentSession =
            null;

        currentModel =
            null;
    }


    /*
     * =========================================
     * PUBLIC API
     * =========================================
     */

    window.FidelisAIModelBridge = {

        init,

        prepare,

        run,

        status,

        release
    };

})();
