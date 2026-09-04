/* =========================================================
   FIDELIS - IMAGE ENGINE
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    window.FidelisImage = {

        async enhance(file, quality = "standard") {
            if (!file) {
                throw new Error("No image selected.");
            }

            if (!file.type.startsWith("image/")) {
                throw new Error("Selected file is not an image.");
            }

            const image = await this.loadImage(file);

            const originalWidth = image.naturalWidth;
            const originalHeight = image.naturalHeight;

            let scale = 1.5;

            if (quality === "high") {
                scale = 2;
            }

            /*
             * Jangan melakukan pembesaran ekstrem.
             * Tujuannya memperjelas, bukan menciptakan wajah baru.
             */
            const maxDimension = 4096;

            let targetWidth = Math.round(originalWidth * scale);
            let targetHeight = Math.round(originalHeight * scale);

            if (targetWidth > maxDimension || targetHeight > maxDimension) {
                const ratio = Math.min(
                    maxDimension / targetWidth,
                    maxDimension / targetHeight
                );

                targetWidth = Math.round(targetWidth * ratio);
                targetHeight = Math.round(targetHeight * ratio);
            }

            const canvas = document.createElement("canvas");

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext("2d", {
                alpha: false
            });

            if (!ctx) {
                throw new Error("Canvas is not supported.");
            }

            /*
             * Browser interpolation berkualitas tinggi.
             */
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            /*
             * Background asli.
             * Tidak ada face regeneration.
             */
            ctx.drawImage(
                image,
                0,
                0,
                targetWidth,
                targetHeight
            );

            /*
             * Sharpening ringan.
             *
             * Kernel:
             *
             *  0  -1   0
             * -1   5  -1
             *  0  -1   0
             *
             * Ini meningkatkan edge/detail tanpa
             * menggambar ulang struktur wajah.
             */
            const imageData = ctx.getImageData(
                0,
                0,
                targetWidth,
                targetHeight
            );

            const sharpened = this.sharpen(
                imageData,
                quality === "high" ? 0.75 : 0.55
            );

            ctx.putImageData(
                sharpened,
                0,
                0
            );

            /*
             * Export JPEG berkualitas tinggi.
             */
            const blob = await new Promise((resolve, reject) => {

                canvas.toBlob(
                    result => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(
                                new Error("Failed to generate image.")
                            );
                        }
                    },
                    "image/jpeg",
                    0.94
                );

            });

            /*
             * Bersihkan resource.
             */
            image.src = "";

            return {
                blob: blob,
                width: targetWidth,
                height: targetHeight,
                originalWidth: originalWidth,
                originalHeight: originalHeight,
                quality: quality
            };
        },


        loadImage(file) {

            return new Promise((resolve, reject) => {

                const url = URL.createObjectURL(file);

                const image = new Image();

                image.onload = () => {
                    URL.revokeObjectURL(url);
                    resolve(image);
                };

                image.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(
                        new Error("Failed to load image.")
                    );
                };

                image.src = url;

            });

        },


        sharpen(imageData, strength = 0.6) {

            const width = imageData.width;
            const height = imageData.height;

            const source = imageData.data;

            const output = new Uint8ClampedArray(
                source.length
            );

            /*
             * Copy original pixels terlebih dahulu.
             */
            output.set(source);

            /*
             * Hindari memproses border.
             */
            for (let y = 1; y < height - 1; y++) {

                for (let x = 1; x < width - 1; x++) {

                    const index =
                        (y * width + x) * 4;

                    const top =
                        ((y - 1) * width + x) * 4;

                    const bottom =
                        ((y + 1) * width + x) * 4;

                    const left =
                        (y * width + (x - 1)) * 4;

                    const right =
                        (y * width + (x + 1)) * 4;


                    for (let channel = 0; channel < 3; channel++) {

                        const center =
                            source[index + channel];

                        const surrounding =
                            (
                                source[top + channel] +
                                source[bottom + channel] +
                                source[left + channel] +
                                source[right + channel]
                            ) / 4;

                        const detail =
                            center - surrounding;

                        let value =
                            center +
                            detail * strength;

                        /*
                         * Clamp 0-255.
                         */
                        value = Math.max(
                            0,
                            Math.min(255, value)
                        );

                        output[index + channel] =
                            value;
                    }

                    /*
                     * Alpha channel tetap asli.
                     */
                    output[index + 3] =
                        source[index + 3];
                }
            }

            return new ImageData(
                output,
                width,
                height
            );
        },


        /*
         * Helper untuk membuat preview URL.
         */
        createURL(blob) {

            if (!blob) {
                throw new Error("No image blob.");
            }

            return URL.createObjectURL(blob);

        },


        /*
         * Download hasil enhancement.
         */
        download(blob, originalName = "image") {

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = url;

            const cleanName =
                originalName
                    .replace(/\.[^/.]+$/, "");

            link.download =
                `${cleanName}_fidelis.jpg`;

            document.body.appendChild(link);

            link.click();

            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
        }

    };

})();
