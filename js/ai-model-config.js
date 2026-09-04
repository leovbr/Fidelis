(function () {
    "use strict";

    /*
     * FIDELIS REAL AI MODEL CONFIG
     * =============================
     *
     * Semua konfigurasi model AI
     * dikumpulkan di satu tempat.
     *
     * GANTI modelURL nanti dengan
     * URL/file model ONNX nyata.
     */

    const MODELS = {

        basic: {
            id: "fidelis-basic",
            quality: "standard",
            tier: "standard",

            scale: 2,

            format: "onnx",

            modelURL: null,

            input: {
                layout: "NCHW",
                channels: 3,
                range: "0_1",
                order: "RGB"
            },

            output: {
                layout: "NCHW",
                channels: 3,
                range: "0_1",
                order: "RGB"
            },

            maxInput: 2048,
            maxOutput: 4096
        },

        high: {
            id: "fidelis-high",
            quality: "high",
            tier: "high",

            scale: 2,

            format: "onnx",

            modelURL: null,

            input: {
                layout: "NCHW",
                channels: 3,
                range: "0_1",
                order: "RGB"
            },

            output: {
                layout: "NCHW",
                channels: 3,
                range: "0_1",
                order: "RGB"
            },

            maxInput: 4096,
            maxOutput: 8192
        },

        ultra: {
            id: "fidelis-ultra",
            quality: "ultra",
            tier: "vvip",

            scale: 4,

            format: "onnx",

            modelURL: null,

            input: {
                layout: "NCHW",
                channels: 3,
                range: "0_1",
                order: "RGB"
            },

            output: {
                layout: "NCHW",
                channels: 3,
                range: "0_1",
                order: "RGB"
            },

            maxInput: 4096,
            maxOutput: 16384
        }
    };


    /*
     * =========================================
     * GET MODEL
     * =========================================
     */

    function get(
        quality
    ) {

        const key =
            normalizeQuality(
                quality
            );

        const model =
            MODELS[key];

        if (!model) {
            return null;
        }

        return clone(
            model
        );
    }


    /*
     * =========================================
     * NORMALIZE QUALITY
     * =========================================
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
     * =========================================
     * SET MODEL URL
     * =========================================
     */

    function setURL(
        quality,
        url
    ) {

        const key =
            normalizeQuality(
                quality
            );

        if (!MODELS[key]) {

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

        MODELS[key].modelURL =
            url.trim();

        return get(key);
    }


    /*
     * =========================================
     * GET MODEL URL
     * =========================================
     */

    function getURL(
        quality
    ) {

        const model =
            get(quality);

        return model
            ? model.modelURL
            : null;
    }


    /*
     * =========================================
     * CHECK MODEL
     * =========================================
     */

    function isConfigured(
        quality
    ) {

        const url =
            getURL(
                quality
            );

        return (
            typeof url === "string" &&
            url.length > 0
        );
    }


    /*
     * =========================================
     * ALL MODELS
     * =========================================
     */

    function getAll() {

        return Object.keys(
            MODELS
        ).map(
            function (key) {

                return clone(
                    MODELS[key]
                );
            }
        );
    }


    /*
     * =========================================
     * CLONE
     * =========================================
     */

    function clone(
        object
    ) {

        return JSON.parse(
            JSON.stringify(
                object
            )
        );
    }


    /*
     * =========================================
     * PUBLIC API
     * =========================================
     */

    window.FidelisAIModelConfig = {

        get,

        setURL,

        getURL,

        isConfigured,

        getAll,

        normalizeQuality
    };

})();
