(function () {
    "use strict";

    /*
     * =========================================
     * FIDELIS AI DIAGNOSTICS
     * =========================================
     *
     * Developer diagnostic layer.
     *
     * Used to determine:
     *
     * - Runtime availability
     * - GPU backend
     * - ONNX Runtime
     * - Model availability
     * - Model URL
     * - Session status
     * - Face protection
     *
     * This is extremely useful while
     * connecting the real AI model.
     */


    /*
     * =========================================
     * RUN FULL DIAGNOSTIC
     * =========================================
     */

    async function run() {

        const report = {

            timestamp:
                new Date()
                    .toISOString(),

            app:
                "FIDELIS",

            runtime:
                null,

            inference:
                null,

            models:
                [],

            faceGuard:
                null,

            browser:
                browserInfo(),

            status:
                "checking"
        };


        /*
         * Runtime.
         */

        if (
            window.FidelisRuntime
        ) {

            try {

                report.runtime =
                    FidelisRuntime
                        .getStatus();

            } catch (error) {

                report.runtime = {

                    error:
                        error.message
                };
            }

        } else {

            report.runtime = {

                available:
                    false,

                error:
                    "FidelisRuntime tidak ditemukan."
            };
        }


        /*
         * Inference.
         */

        if (
            window.FidelisInference
        ) {

            try {

                report.inference =
                    FidelisInference
                        .getStatus();

            } catch (error) {

                report.inference = {

                    error:
                        error.message
                };
            }

        } else {

            report.inference = {

                available:
                    false
            };
        }


        /*
         * Models.
         */

        if (
            window.FidelisModelLoader
        ) {

            try {

                report.models =
                    FidelisModelLoader
                        .getAllModels();

            } catch (error) {

                report.models = [

                    {
                        error:
                            error.message
                    }
                ];
            }
        }


        /*
         * Face Guard.
         */

        if (
            window.FidelisFaceGuard
        ) {

            try {

                report.faceGuard =
                    FidelisFaceGuard
                        .getStatus();

            } catch (error) {

                report.faceGuard = {

                    error:
                        error.message
                };
            }
        }


        /*
         * Final status.
         */

        report.status =
            calculateStatus(
                report
            );


        return report;
    }


    /*
     * =========================================
     * STATUS CALCULATION
     * =========================================
     */

    function calculateStatus(
        report
    ) {

        if (
            !report.runtime ||
            !report.runtime.ready
        ) {

            return "runtime-not-ready";
        }


        if (
            !report.inference ||
            !report.inference.initialized
        ) {

            return "inference-not-ready";
        }


        const availableModel =
            report.models.some(
                function (
                    model
                ) {

                    return (
                        model.available &&
                        model.modelURL
                    );
                }
            );


        if (!availableModel) {

            return "model-not-configured";
        }


        return "ready";
    }


    /*
     * =========================================
     * PRINT REPORT
     * =========================================
     */

    async function print() {

        const report =
            await run();


        console.group(
            "FIDELIS AI Diagnostics"
        );


        console.log(
            "Status:",
            report.status
        );


        console.log(
            "Runtime:",
            report.runtime
        );


        console.log(
            "Inference:",
            report.inference
        );


        console.log(
            "Models:",
            report.models
        );


        console.log(
            "Face Guard:",
            report.faceGuard
        );


        console.log(
            "Browser:",
            report.browser
        );


        console.groupEnd();


        return report;
    }


    /*
     * =========================================
     * BROWSER INFO
     * =========================================
     */

    function browserInfo() {

        return {

            userAgent:
                navigator.userAgent,

            language:
                navigator.language,

            online:
                navigator.onLine,

            hardwareConcurrency:
                navigator.hardwareConcurrency ||
                null,

            deviceMemory:
                navigator.deviceMemory ||
                null,

            webGPU:
                Boolean(
                    navigator.gpu
                ),

            webAssembly:
                typeof WebAssembly !==
                "undefined",

            webGL:
                detectWebGL()
        };
    }


    /*
     * =========================================
     * WEBGL
     * =========================================
     */

    function detectWebGL() {

        try {

            const canvas =
                document.createElement(
                    "canvas"
                );


            return Boolean(
                canvas.getContext(
                    "webgl2"
                ) ||
                canvas.getContext(
                    "webgl"
                )
            );

        } catch (error) {

            return false;
        }
    }


    /*
     * =========================================
     * CHECK MODEL
     * =========================================
     */

    function checkModel(
        quality
    ) {

        if (
            !window.FidelisModelLoader
        ) {

            return {

                available:
                    false,

                error:
                    "Model loader tidak tersedia."
            };
        }


        const model =
            FidelisModelLoader.getModel(
                quality
            );


        if (!model) {

            return {

                available:
                    false,

                error:
                    "Model tidak ditemukan."
            };
        }


        return {

            id:
                model.id,

            quality:
                quality,

            url:
                model.modelURL,

            configured:
                Boolean(
                    model.modelURL
                ),

            loaded:
                FidelisModelLoader
                    .isLoaded(
                        quality
                    )
        };
    }


    /*
     * =========================================
     * PUBLIC API
     * =========================================
     */

    window.FidelisDiagnostics = {

        run,

        print,

        checkModel,

        browserInfo
    };

})();
