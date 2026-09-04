(function () {
    "use strict";

    /*
     * FIDELIS AI RUNTIME
     * =========================
     *
     * Real browser AI runtime:
     * ONNX Runtime Web
     *
     * Supported:
     * - WebGPU
     * - WebGL
     * - WASM / CPU
     *
     * Runtime is loaded dynamically so
     * index.html does not need npm/build tools.
     */

    const ORT_VERSION = "1.29.0";

    const CDN_BASE =
        "https://cdn.jsdelivr.net/npm/onnxruntime-web@" +
        ORT_VERSION +
        "/dist/";

    const RUNTIME_URLS = {

        webgpu:
            CDN_BASE +
            "ort.webgpu.min.js",

        webgl:
            CDN_BASE +
            "ort.webgl.min.js",

        wasm:
            CDN_BASE +
            "ort.wasm.min.js",

        auto:
            CDN_BASE +
            "ort.min.js"
    };

    let initialized = false;

    let loading = false;

    let backend = "none";

    let ort = null;

    let runtimePromise = null;

    /*
     * =========================
     * SCRIPT LOADER
     * =========================
     */

    function loadScript(src) {

        return new Promise(
            function (resolve, reject) {

                /*
                 * Don't load twice.
                 */

                const existing =
                    document.querySelector(
                        'script[data-fidelis-ort="true"]'
                    );

                if (existing) {

                    if (window.ort) {

                        resolve(
                            window.ort
                        );

                        return;
                    }

                    existing.addEventListener(
                        "load",
                        function () {
                            resolve(
                                window.ort
                            );
                        }
                    );

                    existing.addEventListener(
                        "error",
                        function () {
                            reject(
                                new Error(
                                    "ONNX Runtime gagal dimuat."
                                )
                            );
                        }
                    );

                    return;
                }

                const script =
                    document.createElement(
                        "script"
                    );

                script.src = src;

                script.async = true;

                script.dataset.fidelisOrt =
                    "true";

                script.onload =
                    function () {

                        if (!window.ort) {

                            reject(
                                new Error(
                                    "ONNX Runtime loaded tetapi API ort tidak ditemukan."
                                )
                            );

                            return;
                        }

                        resolve(
                            window.ort
                        );
                    };

                script.onerror =
                    function () {

                        reject(
                            new Error(
                                "Gagal mengunduh ONNX Runtime Web."
                            )
                        );
                    };

                document.head.appendChild(
                    script
                );
            }
        );
    }

    /*
     * =========================
     * BACKEND DETECTION
     * =========================
     */

    function canUseWebGPU() {

        return (
            typeof navigator !==
                "undefined" &&
            !!navigator.gpu
        );
    }

    function canUseWebGL() {

        if (
            typeof document ===
            "undefined"
        ) {

            return false;
        }

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

    function canUseWASM() {

        return (
            typeof WebAssembly !==
            "undefined"
        );
    }

    function detectBackend(
        preferred = "auto"
    ) {

        if (
            preferred === "webgpu" &&
            canUseWebGPU()
        ) {

            return "webgpu";
        }

        if (
            preferred === "webgl" &&
            canUseWebGL()
        ) {

            return "webgl";
        }

        if (
            preferred === "wasm" &&
            canUseWASM()
        ) {

            return "wasm";
        }

        /*
         * Automatic fallback.
         */

        if (canUseWebGPU()) {
            return "webgpu";
        }

        if (canUseWebGL()) {
            return "webgl";
        }

        if (canUseWASM()) {
            return "wasm";
        }

        return "none";
    }

    /*
     * =========================
     * INITIALIZE
     * =========================
     */

    async function init(
        options = {}
    ) {

        if (initialized && ort) {
            return getStatus();
        }

        if (runtimePromise) {
            await runtimePromise;
            return getStatus();
        }

        runtimePromise =
            initializeRuntime(
                options
            );

        try {

            await runtimePromise;

        } finally {

            runtimePromise = null;
        }

        return getStatus();
    }

    async function initializeRuntime(
        options
    ) {

        loading = true;

        try {

            const preferred =
                options.backend ||
                getConfiguredBackend();

            backend =
                detectBackend(
                    preferred
                );

            if (backend === "none") {

                throw new Error(
                    "Browser tidak memiliki backend AI yang kompatibel."
                );
            }

            /*
             * Load matching ORT build.
             */

            const runtimeURL =
                RUNTIME_URLS[backend];

            ort =
                await loadScript(
                    runtimeURL
                );

            if (!ort) {

                throw new Error(
                    "ONNX Runtime tidak tersedia."
                );
            }

            /*
             * Configure WASM path.
             *
             * The WASM runtime files are served
             * from the same jsDelivr package.
             */

            if (
                backend === "wasm" &&
                ort.env &&
                ort.env.wasm
            ) {

                ort.env.wasm.wasmPaths =
                    CDN_BASE;
            }

            initialized = true;

            return true;

        } finally {

            loading = false;
        }
    }

    /*
     * =========================
     * CONFIG
     * =========================
     */

    function getConfiguredBackend() {

        if (
            window.FidelisAIConfig &&
            typeof FidelisAIConfig
                .getRuntimeConfig ===
                "function"
        ) {

            const config =
                FidelisAIConfig
                    .getRuntimeConfig();

            return (
                config.preferredBackend ||
                "auto"
            );
        }

        return "auto";
    }

    /*
     * =========================
     * GET ORT
     * =========================
     */

    function getORT() {

        if (!ort) {

            throw new Error(
                "ONNX Runtime belum diinisialisasi."
            );
        }

        return ort;
    }

    /*
     * =========================
     * SESSION OPTIONS
     * =========================
     */

    function getSessionOptions(
        requestedBackend
    ) {

        const selected =
            requestedBackend ||
            backend;

        const options = {

            executionProviders: [
                selected
            ]
        };

        /*
         * WebGPU prefers NCHW for many
         * image restoration models.
         *
         * The actual model must still
         * define its expected input layout.
         */

        if (
            selected === "webgpu"
        ) {

            options.preferredLayout =
                "NCHW";
        }

        return options;
    }

    /*
     * =========================
     * CREATE SESSION
     * =========================
     */

    async function createSession(
        modelData,
        options = {}
    ) {

        const runtime =
            getORT();

        if (!modelData) {

            throw new Error(
                "Data model ONNX tidak ditemukan."
            );
        }

        const sessionOptions =
            getSessionOptions(
                options.backend
            );

        if (
            options.graphOptimizationLevel
        ) {

            sessionOptions.graphOptimizationLevel =
                options.graphOptimizationLevel;
        }

        /*
         * ONNX Runtime accepts model data
         * as an ArrayBuffer.
         */

        const session =
            await runtime.InferenceSession
                .create(
                    modelData,
                    sessionOptions
                );

        return session;
    }

    /*
     * =========================
     * STATUS
     * =========================
     */

    function getStatus() {

        return {

            initialized,

            loading,

            backend,

            runtime:
                ort
                    ? "onnxruntime-web"
                    : null,

            version:
                ORT_VERSION,

            webgpu:
                canUseWebGPU(),

            webgl:
                canUseWebGL(),

            wasm:
                canUseWASM(),

            ready:
                initialized &&
                ort !== null
        };
    }

    /*
     * =========================
     * SHUTDOWN
     * =========================
     */

    async function shutdown() {

        ort = null;

        initialized = false;

        backend = "none";
    }

    /*
     * =========================
     * PUBLIC API
     * =========================
     */

    window.FidelisRuntime = {

        init,

        getORT,

        createSession,

        detectBackend,

        getSessionOptions,

        getStatus,

        shutdown,

        getVersion:
            function () {
                return ORT_VERSION;
            }
    };

})();
