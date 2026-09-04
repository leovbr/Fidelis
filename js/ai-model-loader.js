(function () {
    "use strict";

    /*
     * FIDELIS AI MODEL LOADER
     * --------------------------------
     * Responsible for:
     * - Model registry
     * - Loading model assets
     * - Progress tracking
     * - Memory management
     * - Model caching
     *
     * NOTE:
     * This loader is prepared for real AI model files.
     * It does not fake AI inference.
     */

    const MODEL_REGISTRY = {

        basic: {
            id: "fidelis-basic",
            name: "FIDELIS Basic",
            tier: "standard",

            scale: 1.5,

            /*
             * Future real model:
             * ONNX / WebGPU / WASM compatible model
             */
            url: null,

            format: "onnx",

            maxInputResolution: 2048,
            maxOutputResolution: 3072,

            memoryEstimate: 80 * 1024 * 1024
        },

        high: {
            id: "fidelis-high",
            name: "FIDELIS High",
            tier: "high",

            scale: 2,

            url: null,

            format: "onnx",

            maxInputResolution: 4096,
            maxOutputResolution: 4096,

            memoryEstimate: 180 * 1024 * 1024
        },

        ultra: {
            id: "fidelis-ultra",
            name: "FIDELIS Ultra AI",
            tier: "vvip",

            scale: 4,

            /*
             * Real model URL will be inserted here
             * when deployment/backend is ready.
             */
            url: null,

            format: "onnx",

            maxInputResolution: 4096,
            maxOutputResolution: 8192,

            memoryEstimate: 500 * 1024 * 1024
        }
    };

    const loadedModels = new Map();

    let activeModel = null;

    let loading = false;

    let loadingProgress = 0;

    /*
     * =========================
     * HELPERS
     * =========================
     */

    function delay(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    function getModelConfig(modelId) {

        if (!modelId) {
            return null;
        }

        return MODEL_REGISTRY[modelId] || null;
    }

    function setProgress(value, callback) {

        loadingProgress = Math.max(
            0,
            Math.min(100, Number(value) || 0)
        );

        if (typeof callback === "function") {
            callback(loadingProgress);
        }
    }

    /*
     * =========================
     * BROWSER CAPABILITY
     * =========================
     */

    function getCapabilities() {

        const capabilities = {

            webgpu:
                typeof navigator !== "undefined" &&
                "gpu" in navigator,

            webgl:
                typeof document !== "undefined" &&
                !!document.createElement("canvas")
                    .getContext("webgl"),

            wasm:
                typeof WebAssembly !== "undefined",

            indexedDB:
                typeof indexedDB !== "undefined"
        };

        return capabilities;
    }

    /*
     * =========================
     * LOAD
     * =========================
     */

    async function load(
        modelId,
        options = {}
    ) {

        const config =
            getModelConfig(modelId);

        if (!config) {

            throw new Error(
                "Model tidak ditemukan: " +
                modelId
            );
        }

        if (loadedModels.has(modelId)) {

            activeModel = modelId;

            setProgress(
                100,
                options.onProgress
            );

            return loadedModels.get(modelId);
        }

        if (loading) {

            throw new Error(
                "Model lain sedang dimuat."
            );
        }

        loading = true;

        setProgress(
            0,
            options.onProgress
        );

        try {

            /*
             * Check VVIP access
             */

            if (
                config.tier === "vvip" &&
                window.FidelisTier &&
                !FidelisTier.canUse("ultra")
            ) {

                throw new Error(
                    "Model Ultra AI membutuhkan FIDELIS VVIP."
                );
            }

            /*
             * Check browser
             */

            const capabilities =
                getCapabilities();

            if (!capabilities.wasm) {

                throw new Error(
                    "Browser tidak mendukung WebAssembly."
                );
            }

            /*
             * REAL MODEL PATH
             *
             * If URL exists, the loader will fetch it.
             *
             * Currently URL is intentionally null.
             */

            if (!config.url) {

                /*
                 * Model belum tersedia.
                 *
                 * Jangan pura-pura mengatakan
                 * model AI sudah dimuat.
                 */

                setProgress(
                    100,
                    options.onProgress
                );

                const unavailableModel = {

                    id: config.id,

                    name: config.name,

                    scale: config.scale,

                    ready: false,

                    available: false,

                    reason:
                        "Real AI model asset has not been connected yet.",

                    capabilities

                };

                loadedModels.set(
                    modelId,
                    unavailableModel
                );

                activeModel = modelId;

                return unavailableModel;
            }

            /*
             * Fetch real model
             */

            const response =
                await fetch(
                    config.url,
                    {
                        method: "GET",
                        cache: "force-cache"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Gagal mengambil model AI."
                );
            }

            const contentLength =
                Number(
                    response.headers.get(
                        "Content-Length"
                    )
                );

            let modelData;

            if (
                contentLength &&
                response.body &&
                response.body.getReader
            ) {

                const reader =
                    response.body.getReader();

                const chunks = [];

                let received = 0;

                while (true) {

                    const {
                        done,
                        value
                    } = await reader.read();

                    if (done) break;

                    chunks.push(value);

                    received += value.byteLength;

                    const progress =
                        contentLength > 0
                            ? (
                                received /
                                contentLength
                            ) * 90
                            : 45;

                    setProgress(
                        progress,
                        options.onProgress
                    );
                }

                const totalLength =
                    chunks.reduce(
                        (sum, chunk) =>
                            sum + chunk.byteLength,
                        0
                    );

                const merged =
                    new Uint8Array(
                        totalLength
                    );

                let offset = 0;

                for (
                    const chunk of chunks
                ) {

                    merged.set(
                        chunk,
                        offset
                    );

                    offset +=
                        chunk.byteLength;
                }

                modelData =
                    merged.buffer;

            } else {

                modelData =
                    await response.arrayBuffer();

                setProgress(
                    90,
                    options.onProgress
                );
            }

            /*
             * Store model data.
             */

            const model = {

                id: config.id,

                name: config.name,

                scale: config.scale,

                format: config.format,

                data: modelData,

                ready: true,

                available: true,

                capabilities,

                loadedAt:
                    Date.now()
            };

            loadedModels.set(
                modelId,
                model
            );

            activeModel = modelId;

            setProgress(
                100,
                options.onProgress
            );

            return model;

        } finally {

            loading = false;
        }
    }

    /*
     * =========================
     * STATUS
     * =========================
     */

    function isLoaded(modelId) {

        return loadedModels.has(
            modelId
        );
    }

    function getActiveModel() {

        if (!activeModel) {
            return null;
        }

        return loadedModels.get(
            activeModel
        ) || null;
    }

    function getProgress() {
        return loadingProgress;
    }

    function isLoading() {
        return loading;
    }

    /*
     * =========================
     * UNLOAD
     * =========================
     */

    function unload(modelId) {

        if (!loadedModels.has(modelId)) {
            return false;
        }

        loadedModels.delete(
            modelId
        );

        if (activeModel === modelId) {
            activeModel = null;
        }

        return true;
    }

    function unloadAll() {

        loadedModels.clear();

        activeModel = null;

        loadingProgress = 0;
    }

    /*
     * =========================
     * MEMORY
     * =========================
     */

    function getMemoryEstimate() {

        let total = 0;

        loadedModels.forEach(
            function (model) {

                const config =
                    Object.values(
                        MODEL_REGISTRY
                    ).find(
                        item =>
                            item.id === model.id
                    );

                if (config) {
                    total +=
                        config.memoryEstimate;
                }
            }
        );

        return total;
    }

    /*
     * =========================
     * REGISTRY
     * =========================
     */

    function getAllModels() {

        return Object.entries(
            MODEL_REGISTRY
        ).map(
            ([key, model]) => ({
                key,
                ...model,
                loaded:
                    loadedModels.has(key)
            })
        );
    }

    /*
     * =========================
     * PUBLIC API
     * =========================
     */

    window.FidelisModelLoader = {

        load,

        unload,

        unloadAll,

        isLoaded,

        isLoading,

        getProgress,

        getActiveModel,

        getCapabilities,

        getMemoryEstimate,

        getModelConfig,

        getAllModels
    };

})();
