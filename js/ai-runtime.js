(function () {
    "use strict";

    /*
     * FIDELIS AI RUNTIME
     * --------------------------------
     *
     * Runtime abstraction layer.
     *
     * Pipeline:
     *
     * AI Model
     *    ↓
     * Runtime
     *    ↓
     * Inference
     *    ↓
     * Tensor Output
     *
     * This layer allows FIDELIS to use
     * WebGPU / WebGL / WASM runtimes
     * without changing the rest of the app.
     *
     * IMPORTANT:
     * No fake AI inference is performed.
     */

    let initialized = false;
    let backend = "none";
    let runtime = null;

    /*
     * =========================
     * INITIALIZE
     * =========================
     */

    async function init(options = {}) {

        if (initialized) {
            return getStatus();
        }

        backend =
            options.backend ||
            detectBackend();

        /*
         * Runtime can be injected externally.
         *
         * Example future runtime:
         *
         * FidelisRuntime.setRuntime({
         *     run: async function (...) {}
         * });
         *
         * This keeps the architecture
         * independent from a specific library.
         */

        if (options.runtime) {

            setRuntime(
                options.runtime
            );
        }

        initialized = true;

        return getStatus();
    }

    /*
     * =========================
     * BACKEND
     * =========================
     */

    function detectBackend() {

        /*
         * Prefer WebGPU.
         */

        if (
            typeof navigator !== "undefined" &&
            navigator.gpu
        ) {

            return "webgpu";
        }

        /*
         * Then WebGL.
         */

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
                    "WebGL detection failed.",
                    error
                );
            }
        }

        /*
         * WASM fallback.
         */

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
     * RUNTIME
     * =========================
     */

    function setRuntime(
        runtimeInstance
    ) {

        if (
            runtimeInstance &&
            typeof runtimeInstance.run !==
            "function"
        ) {

            throw new Error(
                "Runtime harus memiliki fungsi run()."
            );
        }

        runtime =
            runtimeInstance || null;

        return getStatus();
    }

    function getRuntime() {
        return runtime;
    }

    function hasRuntime() {
        return runtime !== null;
    }

    /*
     * =========================
     * MODEL VALIDATION
     * =========================
     */

    function validateModel(model) {

        if (!model) {

            throw new Error(
                "Model AI tidak ditemukan."
            );
        }

        if (!model.ready) {

            throw new Error(
                "Model AI belum siap."
            );
        }

        if (!model.data) {

            throw new Error(
                "Data model AI tidak tersedia."
            );
        }

        return true;
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

        validateModel(model);

        if (!runtime) {

            throw new Error(
                "AI runtime belum terhubung."
            );
        }

        if (!input) {

            throw new Error(
                "Input tensor tidak ditemukan."
            );
        }

        if (
            typeof runtime.run !==
            "function"
        ) {

            throw new Error(
                "Runtime tidak mendukung inference."
            );
        }

        if (
            typeof options.onProgress ===
            "function"
        ) {

            options.onProgress(5);
        }

        const result =
            await runtime.run(
                model,
                input,
                options
            );

        if (!result) {

            throw new Error(
                "Runtime menghasilkan output kosong."
            );
        }

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
     * STATUS
     * =========================
     */

    function getStatus() {

        return {

            initialized,

            backend,

            runtimeConnected:
                runtime !== null,

            ready:
                initialized &&
                runtime !== null
        };
    }

    /*
     * =========================
     * SHUTDOWN
     * =========================
     */

    async function shutdown() {

        if (
            runtime &&
            typeof runtime.dispose ===
            "function"
        ) {

            try {
                await runtime.dispose();
            } catch (error) {
                console.warn(
                    "Runtime dispose failed:",
                    error
                );
            }
        }

        runtime = null;
        initialized = false;
    }

    /*
     * =========================
     * PUBLIC API
     * =========================
     */

    window.FidelisRuntime = {

        init,

        detectBackend,

        setRuntime,

        getRuntime,

        hasRuntime,

        validateModel,

        run,

        getStatus,

        shutdown
    };

})();
