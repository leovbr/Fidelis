(function () {
    "use strict";

    /*
     * FIDELIS AI CONFIGURATION
     * --------------------------------
     *
     * Central configuration for:
     * - AI models
     * - enhancement presets
     * - face preservation
     * - output limits
     * - runtime preferences
     *
     * Keeping this separate makes it easier
     * to replace models later without rewriting
     * the application.
     */

    const CONFIG = {

        app: {

            name: "FIDELIS",

            tagline:
                "Enhance. Don't Change.",

            philosophy:
                "Enhance image quality without recreating identity."
        },

        runtime: {

            preferredBackend:
                "webgpu",

            fallbackBackends: [
                "webgl",
                "wasm"
            ],

            allowCPU:
                true
        },

        models: {

            basic: {

                id:
                    "fidelis-basic",

                name:
                    "FIDELIS Basic",

                tier:
                    "standard",

                scale:
                    1.5,

                format:
                    "onnx",

                modelURL:
                    null,

                enabled:
                    true,

                maxInput:
                    2048,

                maxOutput:
                    3072
            },

            high: {

                id:
                    "fidelis-high",

                name:
                    "FIDELIS High",

                tier:
                    "high",

                scale:
                    2,

                format:
                    "onnx",

                modelURL:
                    null,

                enabled:
                    true,

                maxInput:
                    4096,

                maxOutput:
                    4096
            },

            ultra: {

                id:
                    "fidelis-ultra",

                name:
                    "FIDELIS Ultra AI",

                tier:
                    "vvip",

                scale:
                    4,

                format:
                    "onnx",

                modelURL:
                    null,

                enabled:
                    true,

                maxInput:
                    4096,

                maxOutput:
                    8192
            }
        },

        /*
         * Enhancement presets.
         *
         * These are intentionally conservative.
         */

        presets: {

            standard: {

                scale:
                    1.5,

                sharpen:
                    0.35,

                denoise:
                    0.10,

                detail:
                    0.30,

                faceStrength:
                    0.20
            },

            high: {

                scale:
                    2,

                sharpen:
                    0.45,

                denoise:
                    0.18,

                detail:
                    0.45,

                faceStrength:
                    0.25
            },

            ultra: {

                scale:
                    4,

                sharpen:
                    0.55,

                denoise:
                    0.25,

                detail:
                    0.60,

                faceStrength:
                    0.30
            }
        },

        /*
         * Identity protection.
         */

        identityProtection: {

            enabled:
                true,

            preserveEyes:
                true,

            preserveNose:
                true,

            preserveMouth:
                true,

            preserveJaw:
                true,

            preserveFaceShape:
                true,

            preserveSkinTexture:
                true,

            allowFaceGeneration:
                false,

            allowIdentityReplacement:
                false,

            maximumIdentityDrift:
                0.05
        },

        /*
         * Output rules.
         */

        output: {

            imageFormat:
                "image/jpeg",

            jpegQuality:
                0.96,

            maxResolution:
                8192,

            preserveAspectRatio:
                true,

            preventUpscaleOverflow:
                true
        },

        /*
         * Processing limits.
         */

        processing: {

            maxPhotoSize:
                100 * 1024 * 1024,

            maxVideoSize:
                1000 * 1024 * 1024,

            maxConcurrentJobs:
                1,

            timeout:
                10 * 60 * 1000
        }
    };

    /*
     * =========================
     * GET CONFIG
     * =========================
     */

    function get() {

        return deepClone(
            CONFIG
        );
    }

    /*
     * =========================
     * MODEL
     * =========================
     */

    function getModel(
        modelKey
    ) {

        const model =
            CONFIG.models[modelKey];

        if (!model) {
            return null;
        }

        return {
            ...model
        };
    }

    /*
     * =========================
     * PRESET
     * =========================
     */

    function getPreset(
        quality
    ) {

        const preset =
            CONFIG.presets[quality];

        if (!preset) {

            return {
                ...CONFIG.presets.standard
            };
        }

        return {
            ...preset
        };
    }

    /*
     * =========================
     * IDENTITY
     * =========================
     */

    function getIdentityProtection() {

        return {
            ...CONFIG.identityProtection
        };
    }

    /*
     * =========================
     * OUTPUT
     * =========================
     */

    function getOutputConfig() {

        return {
            ...CONFIG.output
        };
    }

    /*
     * =========================
     * RUNTIME
     * =========================
     */

    function getRuntimeConfig() {

        return {
            ...CONFIG.runtime,

            fallbackBackends: [
                ...CONFIG.runtime
                    .fallbackBackends
            ]
        };
    }

    /*
     * =========================
     * UPDATE MODEL URL
     * =========================
     *
     * Used later when the actual
     * model file is deployed.
     */

    function setModelURL(
        modelKey,
        url
    ) {

        if (
            !CONFIG.models[modelKey]
        ) {

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

        CONFIG.models[modelKey]
            .modelURL = url.trim();

        /*
         * Keep
