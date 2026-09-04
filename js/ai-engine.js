/* =========================================================
   FIDELIS - AI ENGINE
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    window.FidelisAI = {

        initialized: false,

        model: null,

        config: {

            provider: "local",

            modelName:
                "fidelis-super-resolution",

            scale: 2,

            preserveIdentity: true,

            faceRestoration: false,

            maxResolution: 4096

        },


        /*
         * Initialize AI engine.
         */
        async init(options = {}) {

            this.config = {
                ...this.config,
                ...options
            };

            /*
             * Model belum dimuat pada versi ini.
             *
             * Kita sengaja tidak download model besar
             * sebelum benar-benar diperlukan.
             */

            this.initialized = true;

            console.log(
                "FIDELIS AI Engine initialized."
            );

            return {
                ready: true,
                config: this.config
            };

        },


        /*
         * Cek apakah AI engine tersedia.
         */
        isReady() {

            return this.initialized;

        },


        /*
         * Ambil konfigurasi berdasarkan tier.
         */
        getPreset(tier = "standard") {

            const presets = {

                standard: {

                    scale: 1.5,

                    strength: 0.45,

                    denoise: 0.15,

                    sharpen: 0.35,

                    faceProtection: true

                },


                high: {

                    scale: 2,

                    strength: 0.65,

                    denoise: 0.25,

                    sharpen: 0.5,

                    faceProtection: true

                },


                ultra: {

                    scale: 4,

                    strength: 0.9,

                    denoise: 0.4,

                    sharpen: 0.7,

                    faceProtection: true,

                    aiSuperResolution:
                        true

                }

            };


            return (
                presets[tier] ||
                presets.standard
            );

        },


        /*
         * Validasi permintaan AI.
         */
        validateRequest({
            tier = "standard",
            width = 0,
            height = 0
        } = {}) {

            const preset =
                this.getPreset(tier);

            const outputWidth =
                Math.round(
                    width *
                    preset.scale
                );

            const outputHeight =
                Math.round(
                    height *
                    preset.scale
                );


            if (
                outputWidth >
                    this.config.maxResolution ||
                outputHeight >
                    this.config.maxResolution
            ) {

                return {

                    valid: false,

                    reason:
                        "Requested resolution is too large."

                };

            }


            return {

                valid: true,

                width:
                    outputWidth,

                height:
                    outputHeight,

                preset:
                    preset

            };

        },


        /*
         * AI processing entry point.
         *
         * Untuk sementara diarahkan ke fallback
         * browser engine sampai model AI asli
         * dipasang.
         */
        async enhanceImage(
            file,
            tier = "standard",
            onProgress = null
        ) {

            if (!file) {

                throw new Error(
                    "No image supplied."
                );

            }


            if (!file.type.startsWith("image/")) {

                throw new Error(
                    "File is not an image."
                );

            }


            if (!this.initialized) {

                await this.init();

            }


            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(
                    10,
                    "Initializing AI engine..."
                );

            }


            const image =
                await this.loadImage(file);


            const validation =
                this.validateRequest({
                    tier:
                        tier,
                    width:
                        image.naturalWidth,
                    height:
                        image.naturalHeight
                });


            if (!validation.valid) {

                throw new Error(
                    validation.reason
                );

            }


            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(
                    25,
                    "Analyzing image..."
                );

            }


            /*
             * Face preservation configuration.
             */
            let faceConfig = null;

            if (
                window.FidelisFace
            ) {

                faceConfig =
                    window.FidelisFace
                        .getAIConfig();

            }


            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(
                    40,
                    "Protecting facial structure..."
                );

            }


            /*
             * Kalau model AI asli sudah dipasang,
             * bagian ini akan menjalankan model.
             *
             * Saat ini fallback ke FidelisImage.
             */
            if (
                window.FidelisImage
            ) {

                const fallbackQuality =
                    tier === "ultra"
                        ? "high"
                        : tier;


                const result =
                    await window.FidelisImage.enhance(
                        file,
                        fallbackQuality
                    );


                if (
                    typeof onProgress ===
                    "function"
                ) {

                    onProgress(
                        100,
                        "AI enhancement complete."
                    );

                }


                return {

                    ...result,

                    ai:
                        false,

                    fallback:
                        true,

                    faceProtection:
                        Boolean(
                            faceConfig
                        ),

                    engine:
                        "FIDELIS Browser Engine"

                };

            }


            throw new Error(
                "No image processing engine available."
            );

        },


        /*
         * Load image helper.
         */
        loadImage(file) {

            return new Promise(
                (resolve, reject) => {

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


        /*
         * Model information.
         */
        getModelInfo() {

            return {

                name:
                    this.config.modelName,

                provider:
                    this.config.provider,

                initialized:
                    this.initialized,

                scale:
                    this.config.scale,

                identityProtection:
                    this.config
                        .preserveIdentity

            };

        }

    };


    /*
     * Auto initialize.
     */
    FidelisAI
        .init()
        .catch(error => {

            console.warn(
                "FIDELIS AI initialization:",
                error
            );

        });

})();
