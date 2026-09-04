(function () {
    "use strict";

    /*
     * FIDELIS IMAGE AI
     * --------------------------------
     * AI image enhancement controller.
     *
     * Pipeline:
     *
     * File
     *  ↓
     * Image validation
     *  ↓
     * Face preservation guard
     *  ↓
     * Model selection
     *  ↓
     * Model loader
     *  ↓
     * AI inference
     *  ↓
     * Output validation
     *  ↓
     * Final image
     *
     * IMPORTANT:
     * This module NEVER claims AI processing
     * when a real model/runtime is unavailable.
     */

    const SETTINGS = {

        preserveIdentity: true,

        preserveFaceStructure: true,

        preserveSkinTexture: true,

        avoidFaceGeneration: true,

        maxOutputResolution: 8192
    };

    /*
     * =========================
     * INITIALIZATION
     * =========================
     */

    async function init() {

        if (window.FidelisInference) {

            await FidelisInference.init();
        }

        return getStatus();
    }

    /*
     * =========================
     * STATUS
     * =========================
     */

    function getStatus() {

        const inference =
            window.FidelisInference
                ? FidelisInference.getStatus()
                : null;

        const loader =
            window.FidelisModelLoader
                ? {
                    loading:
                        FidelisModelLoader.isLoading(),

                    progress:
                        FidelisModelLoader.getProgress(),

                    active:
                        FidelisModelLoader.getActiveModel()
                }
                : null;

        return {

            initialized: true,

            settings: {
                ...SETTINGS
            },

            inference,

            loader,

            realAIReady:
                Boolean(
                    inference &&
                    inference.ready
                )
        };
    }

    /*
     * =========================
     * VALIDATION
     * =========================
     */

    function validateFile(file) {

        if (!file) {

            throw new Error(
                "File gambar tidak ditemukan."
            );
        }

        if (!file.type.startsWith("image/")) {

            throw new Error(
                "FIDELIS AI hanya menerima file gambar."
            );
        }

        return true;
    }

    /*
     * =========================
     * LOAD IMAGE
     * =========================
     */

    function loadImage(file) {

        return new Promise(
            function (resolve, reject) {

                const url =
                    URL.createObjectURL(file);

                const image =
                    new Image();

                image.onload =
                    function () {

                        URL.revokeObjectURL(
                            url
                        );

                        resolve(image);
                    };

                image.onerror =
                    function () {

                        URL.revokeObjectURL(
                            url
                        );

                        reject(
                            new Error(
                                "Gagal membaca gambar."
                            )
                        );
                    };

                image.src = url;
            }
        );
    }

    /*
     * =========================
     * MODEL SELECTION
     * =========================
     */

    function getModelKey(quality) {

        switch (quality) {

            case "standard":
                return "basic";

            case "high":
                return "high";

            case "ultra":
                return "ultra";

            default:
                return "basic";
        }
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

            throw new Error(
                "AI menghasilkan output kosong."
            );
        }

        const width =
            output.width ||
            0;

        const height =
            output.height ||
            0;

        if (!width || !height) {

            throw new Error(
                "Output AI memiliki dimensi tidak valid."
            );
        }

        if (
            width >
            SETTINGS.maxOutputResolution ||
            height >
            SETTINGS.maxOutputResolution
        ) {

            throw new Error(
                "Output AI melebihi resolusi maksimum."
            );
        }

        return true;
    }

    /*
     * =========================
     * ENHANCE
     * =========================
     */

    async function enhance(
        file,
        quality = "ultra",
        onProgress
    ) {

        validateFile(file);

        /*
         * Ultra is VVIP.
         */

        if (
            quality === "ultra" &&
            window.FidelisTier &&
            !FidelisTier.canUse("ultra")
        ) {

            throw new Error(
                "Ultra AI membutuhkan FIDELIS VVIP."
            );
        }

        /*
         * Initialize inference engine.
         */

        await init();

        /*
         * Load source image.
         */

        if (typeof onProgress === "function") {
            onProgress(5);
        }

        const image =
            await loadImage(file);

        /*
         * Face protection.
         */

        let faceGuard = null;

        if (window.FidelisFaceGuard) {

            faceGuard =
                await FidelisFaceGuard.prepare(
                    image,
                    {
                        preserveIdentity:
                            SETTINGS.preserveIdentity,

                        preserveStructure:
                            SETTINGS.preserveFaceStructure,

                        preserveSkinTexture:
                            SETTINGS.preserveSkinTexture
                    }
                );
        }

        if (typeof onProgress === "function") {
            onProgress(12);
        }

        /*
         * Select model.
         */

        const modelKey =
            getModelKey(quality);

        if (!window.FidelisModelLoader) {

            throw new Error(
                "FIDELIS AI Model Loader belum tersedia."
            );
        }

        const modelConfig =
            FidelisModelLoader.getModelConfig(
                modelKey
            );

        if (!modelConfig) {

            throw new Error(
                "Konfigurasi model AI tidak ditemukan."
            );
        }

        /*
         * Check input resolution.
         */

        if (window.FidelisInference) {

            const validation =
                FidelisInference.validateInput(
                    image,
                    modelConfig
                );

            if (!validation.valid) {

                throw new Error(
                    validation.reason
                );
            }
        }

        /*
         * Load model.
         */

        const model =
            await FidelisModelLoader.load(
                modelKey,
                {
                    onProgress:
                        function (progress) {

                            /*
                             * Model loading occupies
                             * roughly 15-45%.
                             */

                            const mapped =
                                15 +
                                progress * 0.30;

                            if (
                                typeof onProgress ===
                                "function"
                            ) {

                                onProgress(
                                    mapped
                                );
                            }
                        }
                }
            );

        /*
         * If model asset isn't connected,
         * STOP instead of pretending.
         */

        if (
            !model ||
            !model.ready ||
            !model.available
        ) {

            throw new Error(
                "Model AI nyata belum terhubung. " +
                "FIDELIS tidak akan memalsukan proses AI."
            );
        }

        /*
         * Convert image -> tensor.
         */

        if (
            !window.FidelisInference
        ) {

            throw new Error(
                "AI inference engine tidak tersedia."
            );
        }

        const tensor =
            await FidelisInference.imageToTensor(
                image
            );

        if (typeof onProgress === "function") {
            onProgress(50);
        }

        /*
         * Prepare inference options.
         */

        const inferenceOptions = {

            preserveIdentity:
                SETTINGS.preserveIdentity,

            preserveFaceStructure:
                SETTINGS.preserveFaceStructure,

            preserveSkinTexture:
                SETTINGS.preserveSkinTexture,

            avoidFaceGeneration:
                SETTINGS.avoidFaceGeneration,

            faceGuard,

            scale:
                model.scale,

            onProgress:
                function (progress) {

                    const mapped =
                        50 +
                        progress * 0.40;

                    if (
                        typeof onProgress ===
                        "function"
                    ) {

                        onProgress(
                            mapped
                        );
                    }
                }
        };

        /*
         * REAL INFERENCE
         */

        const output =
            await FidelisInference.run(
                model,
                tensor,
                inferenceOptions
            );

        /*
         * Validate AI output.
         */

        validateOutput(
            output,
            model
        );

        if (typeof onProgress === "function") {
            onProgress(92);
        }

        /*
         * Convert tensor output to image
         * if runtime returns tensor data.
         */

        let finalCanvas = null;

        if (
            output.data &&
            output.width &&
            output.height
        ) {

            finalCanvas =
                FidelisInference.tensorToImage(
                    output.data,
                    output.width,
                    output.height
                );

        } else if (
            output.canvas
        ) {

            finalCanvas =
                output.canvas;

        } else {

            throw new Error(
                "Format output AI tidak dikenali."
            );
        }

        /*
         * Apply final face guard.
         */

        if (
            window.FidelisFaceGuard
        ) {

            finalCanvas =
                await FidelisFaceGuard.finalize(
                    finalCanvas,
                    image,
                    faceGuard
                );
        }

        if (typeof onProgress === "function") {
            onProgress(96);
        }

        /*
         * Export.
         */

        const blob =
            await canvasToBlob(
                finalCanvas,
                "image/jpeg",
                0.96
            );

        if (!blob) {

            throw new Error(
                "Gagal membuat file output AI."
            );
        }

        if (typeof onProgress === "function") {
            onProgress(100);
        }

        return {

            blob,

            width:
                finalCanvas.width,

            height:
                finalCanvas.height,

            originalWidth:
                image.naturalWidth,

            originalHeight:
                image.naturalHeight,

            quality,

            model:
                model.name,

            aiProcessed: true,

            fallback: false,

            engine:
                "FIDELIS AI Inference",

            faceProtection: {
                identity:
                    SETTINGS.preserveIdentity,

                structure:
                    SETTINGS.preserveFaceStructure,

                skinTexture:
                    SETTINGS.preserveSkinTexture
            },

            faceGuard
        };
    }

    /*
     * =========================
     * CANVAS EXPORT
     * =========================
     */

    function canvasToBlob(
        canvas,
        type,
        quality
    ) {

        return new Promise(
            function (resolve) {

                canvas.toBlob(
                    function (blob) {
                        resolve(blob);
                    },
                    type,
                    quality
                );
            }
        );
    }

    /*
     * =========================
     * SETTINGS
     * =========================
     */

    function getSettings() {

        return {
            ...SETTINGS
        };
    }

    function updateSettings(
        changes = {}
    ) {

        Object.keys(SETTINGS)
            .forEach(function (key) {

                if (
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            changes,
                            key
                        )
                ) {

                    SETTINGS[key] =
                        Boolean(
                            changes[key]
                        );
                }

            });

        return getSettings();
    }

    /*
     * =========================
     * PUBLIC API
     * =========================
     */

    window.FidelisImageAI = {

        init,

        enhance,

        getStatus,

        getSettings,

        updateSettings
    };

})();
