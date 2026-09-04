(function () {
    "use strict";

    /*
     * =========================================
     * FIDELIS IMAGE AI
     * =========================================
     *
     * Real AI image enhancement pipeline.
     *
     * Pipeline:
     *
     * Image
     *   ↓
     * Face Guard
     *   ↓
     * AI Model Bridge
     *   ↓
     * ONNX Runtime
     *   ↓
     * Super Resolution Model
     *   ↓
     * Face Guard validation
     *   ↓
     * JPEG
     *
     * IMPORTANT:
     * No fake AI fallback.
     */

    const SETTINGS = {

        preserveIdentity: true,

        preserveFaceStructure: true,

        preserveSkinTexture: true,

        avoidFaceGeneration: true,

        maxOutputResolution: 8192,

        jpegQuality: 0.96
    };


    /*
     * =========================================
     * INITIALIZE
     * =========================================
     */

    async function init() {

        if (
            window.FidelisRuntime
        ) {

            try {

                await FidelisRuntime.init();

            } catch (error) {

                console.warn(
                    "FIDELIS Runtime belum siap:",
                    error
                );
            }
        }

        return getStatus();
    }


    /*
     * =========================================
     * ENHANCE
     * =========================================
     */

    async function enhance(
        file,
        quality = "ultra",
        onProgress
    ) {

        if (!file) {

            throw new Error(
                "File gambar tidak ditemukan."
            );
        }


        if (
            !file.type ||
            !file.type.startsWith(
                "image/"
            )
        ) {

            throw new Error(
                "File harus berupa gambar."
            );
        }


        /*
         * VVIP verification.
         */

        if (
            normalizeQuality(
                quality
            ) === "ultra"
        ) {

            if (
                window.FidelisTier &&
                !FidelisTier.canUse(
                    "ultra"
                )
            ) {

                throw new Error(
                    "AI Ultra membutuhkan akses VVIP."
                );
            }
        }


        report(
            onProgress,
            3
        );


        /*
         * Load source image.
         */

        const image =
            await loadImage(
                file
            );


        report(
            onProgress,
            10
        );


        /*
         * Validate source resolution.
         */

        const sourceWidth =
            image.naturalWidth;

        const sourceHeight =
            image.naturalHeight;


        if (
            !sourceWidth ||
            !sourceHeight
        ) {

            throw new Error(
                "Resolusi gambar tidak valid."
            );
        }


        /*
         * FACE GUARD
         *
         * Conservative protection.
         */

        let faceGuard = null;


        if (
            window.FidelisFaceGuard
        ) {

            faceGuard =
                FidelisFaceGuard.prepare(
                    image,
                    {
                        preserveIdentity:
                            SETTINGS
                                .preserveIdentity,

                        preserveStructure:
                            SETTINGS
                                .preserveFaceStructure,

                        preserveSkinTexture:
                            SETTINGS
                                .preserveSkinTexture
                    }
                );
        }


        report(
            onProgress,
            15
        );


        /*
         * REAL AI BRIDGE.
         */

        if (
            !window.FidelisAIModelBridge
        ) {

            throw new Error(
                "AI Model Bridge belum tersedia."
            );
        }


        const result =
            await FidelisAIModelBridge.run(
                image,
                normalizeQuality(
                    quality
                ),
                {
                    onProgress:
                        function (
                            value
                        ) {

                            /*
                             * Map model progress
                             * into 15-85%.
                             */

                            const mapped =
                                15 +
                                (
                                    Number(
                                        value
                                    ) || 0
                                ) *
                                0.70;

                            report(
                                onProgress,
                                mapped
                            );
                        }
                }
            );


        if (
            !result ||
            !result.canvas
        ) {

            throw new Error(
                "AI tidak menghasilkan gambar."
            );
        }


        report(
            onProgress,
            88
        );


        /*
         * =====================================
         * FACE GUARD FINALIZATION
         * =====================================
         *
         * Important:
         *
         * This does NOT generate a face.
         *
         * It only validates the resulting
         * image against FIDELIS rules.
         */

        let finalCanvas =
            result.canvas;


        if (
            faceGuard &&
            window.FidelisFaceGuard
        ) {

            const finalized =
                FidelisFaceGuard.finalize(
                    finalCanvas,
                    faceGuard
                );


            if (
                finalized &&
                finalized.canvas
            ) {

                finalCanvas =
                    finalized.canvas;
            }
        }


        report(
            onProgress,
            92
        );


        /*
         * =====================================
         * RESOLUTION PROTECTION
         * =====================================
         */

        finalCanvas =
            limitResolution(
                finalCanvas,
                SETTINGS
                    .maxOutputResolution
            );


        report(
            onProgress,
            95
        );


        /*
         * =====================================
         * EXPORT JPEG
         * =====================================
         */

        const blob =
            await canvasToBlob(
                finalCanvas,
                "image/jpeg",
                SETTINGS
                    .jpegQuality
            );


        if (!blob) {

            throw new Error(
                "Gagal membuat output JPEG."
            );
        }


        report(
            onProgress,
            100
        );


        return {

            blob,

            width:
                finalCanvas.width,

            height:
                finalCanvas.height,

            originalWidth:
                sourceWidth,

            originalHeight:
                sourceHeight,

            quality:
                normalizeQuality(
                    quality
                ),

            aiProcessed:
                true,

            fallback:
                false,

            engine:
                result.engine ||
                "ONNX Runtime Web",

            model:
                result.model ||
                null,

            backend:
                result.backend ||
                null,

            identityProtection:
                true,

            faceGeneration:
                false,

            faceGuard:
                faceGuard
                    ? true
                    : false
        };
    }


    /*
     * =========================================
     * LOAD IMAGE
     * =========================================
     */

    function loadImage(
        file
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const url =
                    URL.createObjectURL(
                        file
                    );


                const image =
                    new Image();


                image.onload =
                    function () {

                        URL.revokeObjectURL(
                            url
                        );

                        resolve(
                            image
                        );
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


                image.src =
                    url;
            }
        );
    }


    /*
     * =========================================
     * CANVAS → BLOB
     * =========================================
     */

    function canvasToBlob(
        canvas,
        type,
        quality
    ) {

        return new Promise(
            function (
                resolve
            ) {

                canvas.toBlob(
                    function (
                        blob
                    ) {

                        resolve(
                            blob
                        );
                    },

                    type,

                    quality
                );
            }
        );
    }


    /*
     * =========================================
     * RESOLUTION LIMIT
     * =========================================
     */

    function limitResolution(
        canvas,
        maxResolution
    ) {

        const width =
            canvas.width;

        const height =
            canvas.height;


        if (
            width <= maxResolution &&
            height <= maxResolution
        ) {

            return canvas;
        }


        const scale =
            Math.min(
                maxResolution /
                    width,

                maxResolution /
                    height
            );


        const newWidth =
            Math.max(
                1,
                Math.floor(
                    width * scale
                )
            );


        const newHeight =
            Math.max(
                1,
                Math.floor(
                    height * scale
                )
            );


        const output =
            document.createElement(
                "canvas"
            );


        output.width =
            newWidth;

        output.height =
            newHeight;


        const ctx =
            output.getContext(
                "2d"
            );


        ctx.imageSmoothingEnabled =
            true;


        ctx.imageSmoothingQuality =
            "high";


        ctx.drawImage(
            canvas,

            0,
            0,

            newWidth,
            newHeight
        );


        return output;
    }


    /*
     * =========================================
     * QUALITY
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
     * PROGRESS
     * =========================================
     */

    function report(
        callback,
        value
    ) {

        if (
            typeof callback !==
            "function"
        ) {

            return;
        }


        callback(
            Math.max(
                0,
                Math.min(
                    100,
                    Number(
                        value
                    ) || 0
                )
            )
        );
    }


    /*
     * =========================================
     * SETTINGS
     * =========================================
     */

    function getSettings() {

        return {
            ...SETTINGS
        };
    }


    /*
     * =========================================
     * STATUS
     * =========================================
     */

    function getStatus() {

        return {

            ready:
                Boolean(
                    window
                        .FidelisAIModelBridge
                ),

            runtime:
                window
                    .FidelisRuntime
                    ? FidelisRuntime
                        .getStatus()
                    : null,

            identityProtection:
                SETTINGS
                    .preserveIdentity,

            faceGeneration:
                !SETTINGS
                    .avoidFaceGeneration
        };
    }


    /*
     * =========================================
     * PUBLIC API
     * =========================================
     */

    window.FidelisImageAI = {

        init,

        enhance,

        getSettings,

        getStatus
    };

})();
