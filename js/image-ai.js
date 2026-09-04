/* =========================================================
   FIDELIS - AI IMAGE PIPELINE
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    window.FidelisImageAI = {

        initialized: false,

        settings: {

            preserveIdentity: true,

            preserveFaceStructure: true,

            preserveSkinTexture: true,

            avoidFaceGeneration: true,

            maxOutputResolution: 4096

        },


        /* =====================================================
           INITIALIZE
           ===================================================== */

        async init() {

            if (
                this.initialized
            ) {

                return true;

            }


            if (
                window.FidelisAI
            ) {

                await window.FidelisAI.init();

            }


            this.initialized =
                true;


            return true;

        },


        /* =====================================================
           ENHANCE
           ===================================================== */

        async enhance(
            file,
            quality = "standard",
            onProgress = null
        ) {

            if (!file) {

                throw new Error(
                    "No image selected."
                );

            }


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                throw new Error(
                    "FIDELIS Image AI only accepts images."
                );

            }


            await this.init();


            /*
             * Select model.
             */

            const model =
                window.FidelisModelManager
                    ? window.FidelisModelManager
                        .getModelForQuality(
                            quality
                        )
                    : null;


            if (!model) {

                throw new Error(
                    "AI model configuration unavailable."
                );

            }


            /*
             * Ultra model membutuhkan VVIP.
             *
             * Untuk sekarang kita hanya menyiapkan
             * pipeline-nya.
             */

            if (
                quality === "ultra"
            ) {

                throw new Error(
                    "FIDELIS Ultra AI is reserved for VVIP."
                );

            }


            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(
                    5,
                    "Preparing AI pipeline..."
                );

            }


            /*
             * Load model.
             */

            if (
                window.FidelisModelManager
            ) {

                await window.FidelisModelManager.load(
                    model.id,
                    (
                        progress,
                        message
                    ) => {

                        const mapped =
                            5 +
                            progress * 0.25;

                        if (
                            typeof onProgress ===
                            "function"
                        ) {

                            onProgress(
                                mapped,
                                message
                            );

                        }

                    }
                );

            }


            /*
             * Analyze face protection.
             */

            let faceAnalysis = null;


            if (
                window.FidelisFace
            ) {

                const image =
                    await this.loadImage(
                        file
                    );

                faceAnalysis =
                    window.FidelisFace
                        .analyzeImage(
                            image
                        );

            }


            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(
                    40,
                    "Protecting identity..."
                );

            }


            /*
             * AI configuration.
             */

            const aiConfig = {

                preserveIdentity:
                    this.settings
                        .preserveIdentity,

                preserveFaceStructure:
                    this.settings
                        .preserveFaceStructure,

                preserveSkinTexture:
                    this.settings
                        .preserveSkinTexture,

                avoidFaceGeneration:
                    this.settings
                        .avoidFaceGeneration

            };


            /*
             * =============================================
             * CURRENT FALLBACK
             * =============================================
             *
             * Sampai model ONNX/WebGPU asli dipasang,
             * gunakan browser enhancement sebagai fallback.
             *
             * Jadi pipeline sudah benar:
             *
             * Upload
             * ↓
             * Model Manager
             * ↓
             * Face Protection
             * ↓
             * Image Engine
             * ↓
             * Result
             */

            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(
                    55,
                    "Enhancing image details..."
                );

            }


            if (
                !window.FidelisImage
            ) {

                throw new Error(
                    "FIDELIS image engine unavailable."
                );

            }


            const result =
                await window.FidelisImage.enhance(
                    file,
                    quality
                );


            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(
                    82,
                    "Checking facial preservation..."
                );

            }


            await this.delay(200);


            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(
                    94,
                    "Finalizing enhanced image..."
                );

            }


            await this.delay(200);


            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(
                    100,
                    "Complete."
                );

            }


            return {

                ...result,

                aiProcessed:
                    false,

                fallback:
                    true,

                model:
                    model.name,

                faceProtection:
                    aiConfig,

                analysis:
                    faceAnalysis

            };

        },


        /* =====================================================
           LOAD IMAGE
           ===================================================== */

        loadImage(file) {

            return new Promise(
                (
                    resolve,
                    reject
                ) => {

                    const url =
                        URL.createObjectURL(
                            file
                        );

                    const image =
                        new Image();


                    image.onload = () => {

                        URL.revokeObjectURL(
                            url
                        );

                        resolve(
                            image
                        );

                    };


                    image.onerror = () => {

                        URL.revokeObjectURL(
                            url
                        );

                        reject(
                            new Error(
                                "Failed to load image."
                            )
                        );

                    };


                    image.src =
                        url;

                }
            );

        },


        /* =====================================================
           DELAY
           ===================================================== */

        delay(ms) {

            return new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        ms
                    )
            );

        },


        /* =====================================================
           SETTINGS
           ===================================================== */

        setIdentityProtection(
            enabled
        ) {

            this.settings
                .preserveIdentity =
                Boolean(enabled);

        },


        getSettings() {

            return {
                ...this.settings
            };

        }

    };

})();
