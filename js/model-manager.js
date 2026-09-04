/* =========================================================
   FIDELIS - MODEL MANAGER
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    window.FidelisModelManager = {

        models: {
            basic: {
                id: "fidelis-basic",
                name: "FIDELIS Basic",
                tier: "free",
                scale: 2,
                loaded: false,
                size: "light"
            },

            high: {
                id: "fidelis-high",
                name: "FIDELIS High",
                tier: "high",
                scale: 2,
                loaded: false,
                size: "medium"
            },

            ultra: {
                id: "fidelis-ultra",
                name: "FIDELIS Ultra AI",
                tier: "vvip",
                scale: 4,
                loaded: false,
                size: "large"
            }
        },

        activeModel: null,

        loading: false,

        progress: 0,


        /* =====================================================
           GET MODEL
           ===================================================== */

        getModel(modelId) {

            return this.models[modelId] || null;

        },


        /* =====================================================
           GET MODEL FOR QUALITY
           ===================================================== */

        getModelForQuality(quality) {

            if (quality === "ultra") {
                return this.models.ultra;
            }

            if (quality === "high") {
                return this.models.high;
            }

            return this.models.basic;

        },


        /* =====================================================
           CHECK MODEL
           ===================================================== */

        isLoaded(modelId) {

            const model =
                this.getModel(modelId);

            return Boolean(
                model &&
                model.loaded
            );

        },


        /* =====================================================
           LOAD MODEL
           ===================================================== */

        async load(modelId, onProgress = null) {

            const model =
                this.getModel(modelId);

            if (!model) {

                throw new Error(
                    "FIDELIS model not found."
                );

            }


            if (model.loaded) {

                this.activeModel =
                    model;

                return model;

            }


            if (this.loading) {

                throw new Error(
                    "Another model is currently loading."
                );

            }


            this.loading = true;
            this.progress = 0;


            try {

                /*
                 * Model loader placeholder.
                 *
                 * Pada tahap berikutnya bagian ini
                 * akan mengambil file model AI asli
                 * seperti ONNX / WebGPU model.
                 */

                for (
                    let progress = 0;
                    progress <= 100;
                    progress += 10
                ) {

                    this.progress =
                        progress;


                    if (
                        typeof onProgress ===
                        "function"
                    ) {

                        onProgress(
                            progress,
                            `Loading ${model.name}...`
                        );

                    }


                    await this.delay(50);

                }


                model.loaded = true;

                this.activeModel =
                    model;


                return model;

            } finally {

                this.loading = false;

            }

        },


        /* =====================================================
           UNLOAD MODEL
           ===================================================== */

        unload(modelId) {

            const model =
                this.getModel(modelId);

            if (!model) {
                return false;
            }


            model.loaded = false;


            if (
                this.activeModel &&
                this.activeModel.id ===
                    model.id
            ) {

                this.activeModel =
                    null;

            }


            return true;

        },


        /* =====================================================
           UNLOAD ALL
           ===================================================== */

        unloadAll() {

            Object.values(
                this.models
            ).forEach(model => {

                model.loaded = false;

            });

            this.activeModel =
                null;

        },


        /* =====================================================
           MEMORY MANAGEMENT
           ===================================================== */

        prepareForModel(modelId) {

            /*
             * Jangan menahan banyak model besar
             * sekaligus di memory.
             */

            Object.keys(
                this.models
            ).forEach(id => {

                if (id !== modelId) {

                    this.models[id].loaded =
                        false;

                }

            });

        },


        /* =====================================================
           MODEL STATUS
           ===================================================== */

        getStatus() {

            return {

                loading:
                    this.loading,

                progress:
                    this.progress,

                activeModel:
                    this.activeModel
                        ? this.activeModel.id
                        : null,

                models:
                    Object.values(
                        this.models
                    ).map(model => ({
                        id: model.id,
                        name: model.name,
                        tier: model.tier,
                        loaded: model.loaded
                    }))

            };

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

        }

    };

})();
