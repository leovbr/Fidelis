/* =========================================================
   FIDELIS - PROCESSING ENGINE
   Routes PHOTO / VIDEO through the correct engine.
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    window.FidelisProcessing = {

        running: false,

        currentJob: null,


        /* =====================================================
           PROCESS
           ===================================================== */

        async process({
            file,
            mode = "photo",
            quality = "standard",
            onProgress = null
        } = {}) {

            if (!file) {

                throw new Error(
                    "No media selected."
                );

            }


            if (this.running) {

                throw new Error(
                    "Another enhancement is already running."
                );

            }


            /*
             * Check tier.
             */

            if (
                window.FidelisTier
            ) {

                const access =
                    window.FidelisTier
                        .require(
                            quality
                        );


                if (!access.allowed) {

                    throw new Error(
                        access.reason
                    );

                }

            }


            /*
             * Create job.
             */

            const jobId =
                this.createJobId();


            this.currentJob = {

                id:
                    jobId,

                fileName:
                    file.name,

                mode:
                    mode,

                quality:
                    quality,

                startedAt:
                    Date.now()

            };


            this.running = true;


            try {

                this.report(
                    3,
                    "Preparing processing engine...",
                    onProgress
                );


                let result;


                /* =================================================
                   PHOTO
                   ================================================= */

                if (
                    mode === "photo"
                ) {

                    /*
                     * Standard/High use browser engine.
                     *
                     * Ultra will eventually route to the
                     * real VVIP AI backend/model.
                     */

                    if (
                        quality === "ultra" &&
                        window.FidelisImageAI
                    ) {

                        result =
                            await window.FidelisImageAI.enhance(
                                file,
                                quality,
                                (
                                    progress,
                                    message
                                ) => {

                                    this.report(
                                        progress,
                                        message,
                                        onProgress
                                    );

                                }
                            );

                    } else {

                        if (
                            !window.FidelisImage
                        ) {

                            throw new Error(
                                "Image engine unavailable."
                            );

                        }


                        result =
                            await window.FidelisImage.enhance(
                                file,
                                quality
                            );


                        this.report(
                            100,
                            "Image enhancement complete.",
                            onProgress
                        );

                    }

                }


                /* =================================================
                   VIDEO
                   ================================================= */

                else if (
                    mode === "video"
                ) {

                    if (
                        !window.FidelisVideo
                    ) {

                        throw new Error(
                            "Video engine unavailable."
                        );

                    }


                    result =
                        await window.FidelisVideo.enhance(
                            file,
                            quality,
                            (
                                progress
                            ) => {

                                this.report(
                                    progress,
                                    "Enhancing video frames...",
                                    onProgress
                                );

                            }
                        );


                    this.report(
                        100,
                        "Video enhancement complete.",
                        onProgress
                    );

                }


                /* =================================================
                   INVALID MODE
                   ================================================= */

                else {

                    throw new Error(
                        "Unsupported processing mode."
                    );

                }


                /*
                 * Attach job information.
                 */

                result.jobId =
                    jobId;

                result.fileName =
                    file.name;

                result.mode =
                    mode;

                result.quality =
                    quality;

                result.completedAt =
                    Date.now();


                /*
                 * Save history.
                 */

                if (
                    window.FidelisStorage
                ) {

                    window.FidelisStorage
                        .addHistory({

                            fileName:
                                file.name,

                            mode:
                                mode,

                            quality:
                                quality,

                            width:
                                result.width,

                            height:
                                result.height

                        });

                }


                return result;


            } finally {

                this.running =
                    false;

                this.currentJob =
                    null;

            }

        },


        /* =====================================================
           PROGRESS
           ===================================================== */

        report(
            percentage,
            message,
            callback
        ) {

            const value =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            percentage
                        ) || 0
                    )
                );


            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    value,
                    message
                );

            }

        },


        /* =====================================================
           JOB ID
           ===================================================== */

        createJobId() {

            if (
                crypto &&
                typeof crypto.randomUUID ===
                    "function"
            ) {

                return crypto.randomUUID();

            }


            return (
                "job_" +
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .slice(2)
            );

        },


        /* =====================================================
           STATUS
           ===================================================== */

        getStatus() {

            return {

                running:
                    this.running,

                job:
                    this.currentJob

            };

        }

    };

})();
