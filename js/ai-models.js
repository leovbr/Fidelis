(function () {
    "use strict";

    /*
     * =========================================
     * FIDELIS AI MODEL REGISTRY
     * =========================================
     *
     * Central registry for real ONNX models.
     *
     * IMPORTANT:
     * The model URL below is intentionally
     * configurable.
     *
     * Once the model is hosted, change
     * MODEL_URLS.ultra.
     */

    const MODEL_URLS = {

        /*
         * Real-ESRGAN x4 ONNX
         *
         * Current placeholder:
         * null
         *
         * We do NOT pretend the model exists
         * until the actual asset is connected.
         */

        ultra: null,

        /*
         * Future models.
         */

        basic: null,

        high: null
    };


    const MODEL_DEFINITIONS = {

        basic: {

            id:
                "fidelis-basic",

            name:
                "FIDELIS Basic",

            provider:
                "Real-ESRGAN",

            format:
                "onnx",

            scale:
                2,

            tier:
                "standard",

            url:
                MODEL_URLS.basic,

            adapter: {

                inputLayout:
                    "NCHW",

                outputLayout:
                    "NCHW",

                inputRange:
                    "0_1",

                outputRange:
                    "0_1",

                channelOrder:
                    "RGB",

                outputChannelOrder:
                    "RGB"
            }
        },


        high: {

            id:
                "fidelis-high",

            name:
                "FIDELIS High",

            provider:
                "Real-ESRGAN",

            format:
                "onnx",

            scale:
                2,

            tier:
                "high",

            url:
                MODEL_URLS.high,

            adapter: {

                inputLayout:
                    "NCHW",

                outputLayout:
                    "NCHW",

                inputRange:
                    "0_1",

                outputRange:
                    "0_1",

                channelOrder:
                    "RGB",

                outputChannelOrder:
                    "RGB"
            }
        },


        ultra: {

            id:
                "fidelis-ultra",

            name:
                "FIDELIS Ultra",

            provider:
                "Real-ESRGAN",

            format:
                "onnx",

            scale:
                4,

            tier:
                "vvip",

            url:
                MODEL_URLS.ultra,

            adapter: {

                inputLayout:
                    "NCHW",

                outputLayout:
                    "NCHW",

                inputRange:
                    "0_1",

                outputRange:
                    "0_1",

                channelOrder:
                    "RGB",

                outputChannelOrder:
                    "RGB"
            }
        }
    };


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
                quality || "ultra"
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
            MODEL_DEFINITIONS[key];


        if (!model) {
            return null;
        }


        return clone(
            model
        );
    }


    /*
     * =========================================
     * GET ALL
     * =========================================
     */

    function getAll() {

        return Object.keys(
            MODEL_DEFINITIONS
        )
        .map(
            function (
                key
            ) {

                return clone(
                    MODEL_DEFINITIONS[key]
                );
            }
        );
    }


    /*
     * =========================================
     * IS CONFIGURED
     * =========================================
     */

    function isConfigured(
        quality
    ) {

        const model =
            get(
                quality
            );


        return Boolean(
            model &&
            typeof model.url ===
                "string" &&
            model.url.length > 0
        );
    }


    /*
     * =========================================
     * SET URL
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


        if (
            !MODEL_DEFINITIONS[key]
        ) {

            throw new Error(
                "Model tidak ditemukan."
            );
        }


        if (
            typeof url !==
                "string" ||
            !url.trim()
        ) {

            throw new Error(
                "URL model tidak valid."
            );
        }


        MODEL_DEFINITIONS[key].url =
            url.trim();


        return get(
            key
        );
    }


    /*
     * =========================================
     * MODEL INFO
     * =========================================
     */

    function getInfo(
        quality
    ) {

        const model =
            get(
                quality
            );


        if (!model) {
            return null;
        }


        return {

            id:
                model.id,

            name:
                model.name,

            provider:
                model.provider,

            format:
                model.format,

            scale:
                model.scale,

            tier:
                model.tier,

            configured:
                Boolean(
                    model.url
                ),

            adapter:
                model.adapter
        };
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

    window.FidelisAIModels = {

        get,

        getAll,

        getInfo,

        setURL,

        isConfigured,

        normalizeQuality
    };

})();
