(function () {
    "use strict";

    /*
     * =========================================
     * FIDELIS AI MODEL INSTALLER
     * =========================================
     *
     * Responsible for registering an actual
     * ONNX model URL into the FIDELIS system.
     *
     * Supports:
     *
     * - URL model
     * - GitHub Pages hosted model
     * - Hugging Face hosted model
     * - User supplied model endpoint
     *
     * The model is NOT downloaded here.
     * Download happens through ModelLoader.
     */


    /*
     * =========================================
     * INSTALL FROM URL
     * =========================================
     */

    function installURL(
        quality,
        url
    ) {

        if (
            !window.FidelisAIModels
        ) {

            throw new Error(
                "AI Model Registry belum tersedia."
            );
        }


        /*
         * Validate URL.
         */

        let parsedURL;


        try {

            parsedURL =
                new URL(
                    url,
                    window.location.href
                );

        } catch (error) {

            throw new Error(
                "URL model tidak valid."
            );
        }


        /*
         * Only HTTP(S).
         */

        if (
            parsedURL.protocol !==
                "http:" &&
            parsedURL.protocol !==
                "https:"
        ) {

            throw new Error(
                "Model hanya boleh menggunakan HTTP atau HTTPS."
            );
        }


        /*
         * Register URL.
         */

        const model =
            FidelisAIModels.setURL(
                quality,
                parsedURL.href
            );


        /*
         * Sync with existing loader.
         */

        if (
            window.FidelisModelLoader &&
            FidelisModelLoader.setModelURL
        ) {

            FidelisModelLoader.setModelURL(
                quality,
                parsedURL.href
            );
        }


        return {

            installed:
                true,

            quality:
                quality,

            model:
                model,

            url:
                parsedURL.href
        };
    }


    /*
     * =========================================
     * CHECK MODEL URL
     * =========================================
     */

    async function checkURL(
        url
    ) {

        let parsedURL;


        try {

            parsedURL =
                new URL(
                    url,
                    window.location.href
                );

        } catch (error) {

            return {

                reachable:
                    false,

                error:
                    "URL tidak valid."
            };
        }


        try {

            /*
             * HEAD is preferred because
             * model files can be large.
             */

            let response =
                await fetch(
                    parsedURL.href,
                    {
                        method:
                            "HEAD",

                        cache:
                            "no-store"
                    }
                );


            /*
             * Some servers reject HEAD.
             *
             * Try GET only for metadata.
             */

            if (
                !response.ok
            ) {

                response =
                    await fetch(
                        parsedURL.href,
                        {
                            method:
                                "GET",

                            headers: {

                                Range:
                                    "bytes=0-63"
                            },

                            cache:
                                "no-store"
                        }
                    );
            }


            if (
                !response.ok
            ) {

                return {

                    reachable:
                        false,

                    status:
                        response.status,

                    error:
                        "Model tidak dapat diakses."
                };
            }


            const contentType =
                response.headers.get(
                    "content-type"
                );


            const contentLength =
                response.headers.get(
                    "content-length"
                );


            return {

                reachable:
                    true,

                url:
                    parsedURL.href,

                contentType,

                contentLength,

                cors:
                    true
            };

        } catch (error) {

            return {

                reachable:
                    false,

                error:
                    error.message ||
                    "Gagal mengakses model."
            };
        }
    }


    /*
     * =========================================
     * INSTALL + TEST
     * =========================================
     */

    async function installAndTest(
        quality,
        url
    ) {

        /*
         * First register.
         */

        const installed =
            installURL(
                quality,
                url
            );


        /*
         * Test reachability.
         */

        const check =
            await checkURL(
                url
            );


        return {

            ...installed,

            reachable:
                check.reachable,

            check
        };
    }


    /*
     * =========================================
     * GET STATUS
     * =========================================
     */

    function getStatus() {

        if (
            !window.FidelisAIModels
        ) {

            return {

                ready:
                    false,

                error:
                    "AI Model Registry tidak tersedia."
            };
        }


        return {

            ready:
                true,

            models:
                FidelisAIModels.getAll()
        };
    }


    /*
     * =========================================
     * PUBLIC API
     * =========================================
     */

    window.FidelisAIModelInstaller = {

        installURL,

        checkURL,

        installAndTest,

        getStatus
    };

})();
