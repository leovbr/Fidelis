(function () {
    "use strict";

    /*
     * FIDELIS REAL AI MODEL LOADER
     * =============================
     *
     * Responsible for:
     *
     * 1. Model registry
     * 2. Downloading ONNX models
     * 3. Validating model assets
     * 4. Caching model data
     * 5. Reporting loading progress
     *
     * IMPORTANT:
     * No fake model is created.
     *
     * If modelURL is null, the model
     * is considered unavailable.
     */

    const MODEL_CACHE_PREFIX =
        "fidelis-model-";

    const models = {

        basic: {

            id: "fidelis-basic",

            tier: "standard",

            scale: 1.5,

            format: "onnx",

            modelURL: null,

            maxInput: 2048,

            maxOutput: 3072,

            memoryMB: 80
        },

        high: {

            id: "fidelis-high",

            tier: "high",

            scale: 2,

            format: "onnx",

            modelURL: null,

            maxInput: 4096,

            maxOutput: 4096,

            memoryMB: 180
        },

        ultra: {

            id: "fidelis-ultra",

            tier: "vvip",

            scale: 4,

            format: "onnx",

            modelURL: null,

            maxInput: 4096,

            maxOutput: 8192,

            memoryMB: 500
        }
    };

    let activeModel = null;

    let loading = false;

    let progress = 0;

    let abortController = null;

    /*
     * =========================
     * GET MODEL
     * =========================
     */

    function getModel(
        quality
    ) {

        const key =
            normalizeQuality(
                quality
            );

        return models[key] || null;
    }

    /*
     * =========================
     * NORMALIZE QUALITY
     * =========================
     */

    function normalizeQuality(
        quality
    ) {

        const value =
            String(
                quality || "standard"
            )
                .toLowerCase()
                .trim();

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
     * =========================
     * SET MODEL URL
     * =========================
     *
     * Used later when we place
     * the actual ONNX model.
     */

    function setModelURL(
        quality,
        url
    ) {

        const model =
            getModel(
                quality
            );

        if (!model) {

            throw new Error(
                "Model tidak ditemukan."
            );
        }

        if (
            typeof url !== "string" ||
            !url.trim()
        ) {

            throw new Error(
                "URL model tidak valid."
            );
        }

        model.modelURL =
            url.trim();

        return {
            ...model
        };
    }

    /*
     * =========================
     * GET MODEL URL
     * =========================
     */

    function getModelURL(
        quality
    ) {

        const model =
            getModel(
                quality
            );

        if (!model) {
            return null;
        }

        return model.modelURL;
    }

    /*
     * =========================
     * CHECK URL
     * =========================
     */

    function hasModelURL(
        quality
    ) {

        const url =
            getModelURL(
                quality
            );

        return (
            typeof url === "string" &&
            url.trim().length > 0
        );
    }

    /*
     * =========================
     * LOAD
     * =========================
     */

    async function load(
        quality,
        options = {}
    ) {

        const model =
            getModel(
                quality
            );

        if (!model) {

            throw new Error(
                "Model AI tidak ditemukan."
            );
        }

        /*
         * VVIP check.
         */

        if (
            model.tier === "vvip"
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
         * Already loaded.
         */

        if (
            activeModel &&
            activeModel.id === model.id &&
            activeModel.ready
        ) {

            return activeModel;
        }

        /*
         * No URL = no real model.
         */

        if (!hasModelURL(quality)) {

            return {
                ...model,

                ready: false,

                available: false,

                data: null,

                error:
                    "Asset model ONNX belum dikonfigurasi."
            };
        }

        /*
         * Cancel previous load.
         */

        cancelLoading();

        loading = true;

        progress = 0;

        abortController =
            new AbortController();

        try {

            reportProgress(
                5,
                options
            );

            const response =
                await fetch(
                    model.modelURL,
                    {
                        method: "GET",

                        signal:
                            abortController
                                .signal,

                        cache:
                            "force-cache"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Model HTTP " +
                    response.status
                );
            }

            reportProgress(
                15,
                options
            );

            const contentLength =
                Number(
                    response.headers.get(
                        "content-length"
                    ) || 0
                );

            let buffer;

            /*
             * Streaming download when
             * ReadableStream is available.
             */

            if (
                response.body &&
                response.body.getReader
            ) {

                buffer =
                    await readStream(
                        response.body,
                        contentLength,
                        options
                    );

            } else {

                buffer =
                    await response.arrayBuffer();

                reportProgress(
                    90,
                    options
                );
            }

            if (
                !buffer ||
                buffer.byteLength < 64
            ) {

                throw new Error(
                    "File model ONNX tidak valid atau kosong."
                );
            }

            /*
             * Validate ONNX magic/signature
             * loosely by checking that it is
             * non-empty binary data.
             *
             * Full graph validation is performed
             * by ONNX Runtime when session is created.
             */

            reportProgress(
                95,
                options
            );

            const loaded = {

                ...model,

                ready: true,

                available: true,

                data: buffer,

                sizeBytes:
                    buffer.byteLength,

                loadedAt:
                    Date.now(),

                error: null
            };

            activeModel =
                loaded;

            reportProgress(
                100,
                options
            );

            return loaded;

        } catch (error) {

            if (
                error &&
                error.name ===
                    "AbortError"
            ) {

                throw new Error(
                    "Loading model dibatalkan."
                );
            }

            console.error(
                "FIDELIS model loading error:",
                error
            );

            throw error;

        } finally {

            loading = false;

            abortController =
                null;
        }
    }

    /*
     * =========================
     * READ STREAM
     * =========================
     */

    async function readStream(
        stream,
        totalBytes,
        options
    ) {

        const reader =
            stream.getReader();

        const chunks = [];

        let received = 0;

        while (true) {

            const result =
                await reader.read();

            if (result.done) {
                break;
            }

            chunks.push(
                result.value
            );

            received +=
                result.value.byteLength;

            let percent = 50;

            if (totalBytes > 0) {

                percent =
                    15 +
                    (
                        received /
                        totalBytes
                    ) *
                    80;
            }

            reportProgress(
                Math.min(
                    95,
                    percent
                ),
                options
            );
        }

        const buffer =
            new Uint8Array(
                received
            );

        let offset = 0;

        for (
            const chunk of chunks
        ) {

            buffer.set(
                chunk,
                offset
            );

            offset +=
                chunk.byteLength;
        }

        return buffer.buffer;
    }

    /*
     * =========================
     * PROGRESS
     * =========================
     */

    function reportProgress(
        value,
        options
    ) {

        progress =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(value) || 0
                )
            );

        if (
            options &&
            typeof options.onProgress ===
                "function"
        ) {

            options.onProgress(
                progress
            );
        }
    }

    /*
     * =========================
     * IS LOADED
     * =========================
     */

    function isLoaded(
        quality
    ) {

        const model =
            getModel(
                quality
            );

        return Boolean(
            activeModel &&
            model &&
            activeModel.id === model.id &&
            activeModel.ready
        );
    }

    /*
     * =========================
     * ACTIVE MODEL
     * =========================
     */

    function getActiveModel() {

        return activeModel;
    }

    /*
     * =========================
     * PROGRESS
     * =========================
     */

    function getProgress() {

        return progress;
    }

    /*
     * =========================
     * LOADING STATE
     * =========================
     */

    function isLoading() {

        return loading;
    }

    /*
     * =========================
     * UNLOAD
     * =========================
     */

    function unload() {

        activeModel =
            null;

        progress = 0;
    }

    /*
     * =========================
     * CANCEL
     * =========================
     */

    function cancelLoading() {

        if (abortController) {

            try {

                abortController.abort();

            } catch (error) {

                console.warn(
                    error
                );
            }

            abortController =
                null;
        }

        loading = false;
    }

    /*
     * =========================
     * MEMORY ESTIMATE
     * =========================
     */

    function getMemoryEstimate(
        quality
    ) {

        const model =
            getModel(
                quality
            );

        if (!model) {
            return 0;
        }

        return model.memoryMB;
    }

    /*
     * =========================
     * ALL MODELS
     * =========================
     */

    function getAllModels() {

        return Object.keys(
            models
        ).map(
            function (key) {

                const model =
                    models[key];

                return {

                    ...model,

                    ready:
                        Boolean(
                            activeModel &&
                            activeModel.id ===
                                model.id &&
                            activeModel.ready
                        )
                };
            }
        );
    }

    /*
     * =========================
     * CAPABILITIES
     * =========================
     */

    function getCapabilities() {

        return {

            format: "ONNX",

            browserRuntime:
                "ONNX Runtime Web",

            modelDownload:
                true,

            streaming:
                true,

            cache:
                true,

            realInference:
                true,

            fakeFallback:
                false
        };
    }

    /*
     * =========================
     * PUBLIC API
     * =========================
     */

    window.FidelisModelLoader = {

        getModel,

        setModelURL,

        getModelURL,

        hasModelURL,

        load,

        isLoaded,

        getActiveModel,

        getProgress,

        isLoading,

        unload,

        cancelLoading,

        getMemoryEstimate,

        getAllModels,

        getCapabilities
    };

})();
