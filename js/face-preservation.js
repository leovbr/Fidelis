/* =========================================================
   FIDELIS - FACE PRESERVATION ENGINE
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    window.FidelisFace = {

        enabled: true,

        settings: {
            maxEnhancement: 0.72,
            preserveStructure: true,
            preserveSkinTexture: true,
            preserveIdentity: true
        },


        setEnabled(value) {

            this.enabled = Boolean(value);

        },


        getStatus() {

            return {
                enabled: this.enabled,
                preserveStructure:
                    this.settings.preserveStructure,
                preserveSkinTexture:
                    this.settings.preserveSkinTexture,
                preserveIdentity:
                    this.settings.preserveIdentity
            };

        },


        /*
         * Analisis sederhana berdasarkan gambar.
         *
         * Ini BUKAN face recognition.
         * Tidak menyimpan wajah dan tidak membuat
         * identitas baru.
         */
        analyzeImage(image) {

            if (!image) {
                throw new Error(
                    "No image supplied."
                );
            }

            const canvas =
                document.createElement("canvas");

            const maxSize = 512;

            const ratio =
                Math.min(
                    maxSize / image.width,
                    maxSize / image.height,
                    1
                );

            canvas.width =
                Math.max(
                    1,
                    Math.round(
                        image.width * ratio
                    )
                );

            canvas.height =
                Math.max(
                    1,
                    Math.round(
                        image.height * ratio
                    )
                );

            const ctx =
                canvas.getContext("2d", {
                    willReadFrequently: true
                });

            ctx.drawImage(
                image,
                0,
                0,
                canvas.width,
                canvas.height
            );

            const data =
                ctx.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

            const pixels =
                data.data;

            let brightness = 0;
            let contrast = 0;

            const total =
                canvas.width *
                canvas.height;

            for (
                let i = 0;
                i < pixels.length;
                i += 4
            ) {

                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];

                const luminance =
                    0.2126 * r +
                    0.7152 * g +
                    0.0722 * b;

                brightness +=
                    luminance;
            }

            brightness /=
                total;

            for (
                let i = 0;
                i < pixels.length;
                i += 4
            ) {

                const luminance =
                    0.2126 * pixels[i] +
                    0.7152 * pixels[i + 1] +
                    0.0722 * pixels[i + 2];

                contrast +=
                    Math.abs(
                        luminance -
                        brightness
                    );
            }

            contrast /=
                total;


            canvas.remove();

            return {

                brightness:
                    Math.round(
                        brightness
                    ),

                contrast:
                    Math.round(
                        contrast
                    ),

                enhancementLimit:
                    this.settings.maxEnhancement,

                faceProtection:
                    this.enabled

            };

        },


        /*
         * Enhancement strength yang aman.
         */
        getSafeStrength(requestedStrength) {

            const requested =
                Number(
                    requestedStrength
                ) || 0;

            if (!this.enabled) {

                return Math.min(
                    requested,
                    1
                );

            }

            return Math.min(
                requested,
                this.settings.maxEnhancement
            );

        },


        /*
         * Metadata untuk engine AI nanti.
         */
        getAIConfig() {

            return {

                faceEnhancement:
                    false,

                identityPreservation:
                    this.settings
                        .preserveIdentity,

                structureProtection:
                    this.settings
                        .preserveStructure,

                skinTextureProtection:
                    this.settings
                        .preserveSkinTexture,

                maxFaceStrength:
                    this.settings
                        .maxEnhancement

            };

        }

    };

})();
