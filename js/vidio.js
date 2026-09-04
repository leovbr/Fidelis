/* =========================================================
   FIDELIS - VIDEO ENGINE
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    window.FidelisVideo = {

        /*
         * Membuat preview video.
         */
        createPreview(file) {

            if (!file) {
                throw new Error("No video selected.");
            }

            if (!file.type.startsWith("video/")) {
                throw new Error("Selected file is not a video.");
            }

            const url =
                URL.createObjectURL(file);

            return url;
        },


        /*
         * Membaca metadata video.
         */
        getMetadata(file) {

            return new Promise((resolve, reject) => {

                const video =
                    document.createElement("video");

                const url =
                    URL.createObjectURL(file);

                video.preload = "metadata";

                video.onloadedmetadata = () => {

                    const metadata = {

                        width:
                            video.videoWidth,

                        height:
                            video.videoHeight,

                        duration:
                            video.duration,

                        aspectRatio:
                            video.videoWidth /
                            video.videoHeight,

                        type:
                            file.type,

                        size:
                            file.size

                    };

                    URL.revokeObjectURL(url);

                    video.remove();

                    resolve(metadata);
                };

                video.onerror = () => {

                    URL.revokeObjectURL(url);

                    video.remove();

                    reject(
                        new Error(
                            "Unable to read video metadata."
                        )
                    );
                };

                video.src = url;

            });

        },


        /*
         * Basic browser-side video processing.
         *
         * Versi ini belum menggunakan AI.
         * Kita gunakan Canvas + MediaRecorder
         * untuk menghasilkan video baru.
         */
        async enhance(file, quality = "standard", onProgress = null) {

            if (!file) {
                throw new Error("No video selected.");
            }

            if (!file.type.startsWith("video/")) {
                throw new Error("Selected file is not a video.");
            }

            const metadata =
                await this.getMetadata(file);

            let scale = 1.25;

            if (quality === "high") {
                scale = 1.5;
            }

            const maxWidth = 1920;
            const maxHeight = 1080;

            let width =
                Math.round(metadata.width * scale);

            let height =
                Math.round(metadata.height * scale);


            /*
             * Jangan melewati Full HD untuk
             * browser processing basic.
             */
            if (width > maxWidth || height > maxHeight) {

                const ratio =
                    Math.min(
                        maxWidth / width,
                        maxHeight / height
                    );

                width =
                    Math.round(width * ratio);

                height =
                    Math.round(height * ratio);
            }


            /*
             * Video element.
             */
            const video =
                document.createElement("video");

            video.muted = true;
            video.playsInline = true;
            video.preload = "auto";

            const videoURL =
                URL.createObjectURL(file);

            video.src =
                videoURL;


            await new Promise((resolve, reject) => {

                video.onloadeddata =
                    resolve;

                video.onerror =
                    () => reject(
                        new Error(
                            "Failed to load video."
                        )
                    );

            });


            /*
             * Canvas output.
             */
            const canvas =
                document.createElement("canvas");

            canvas.width =
                width;

            canvas.height =
                height;

            const ctx =
                canvas.getContext("2d", {
                    alpha: false
                });

            ctx.imageSmoothingEnabled =
                true;

            ctx.imageSmoothingQuality =
                "high";


            /*
             * Ambil stream video dari canvas.
             */
            const stream =
                canvas.captureStream(30);


            /*
             * Audio asli.
             *
             * Browser compatibility bisa berbeda.
             */
            try {

                const audioContext =
                    new AudioContext();

                const source =
                    audioContext.createMediaElementSource(
                        video
                    );

                const destination =
                    audioContext.createMediaStreamDestination();

                source.connect(destination);

                const audioTrack =
                    destination.stream
                        .getAudioTracks()[0];

                if (audioTrack) {
                    stream.addTrack(audioTrack);
                }

            } catch (error) {

                console.warn(
                    "Audio passthrough unavailable:",
                    error
                );

            }


            /*
             * Cari codec yang didukung browser.
             */
            const mimeTypes = [

                "video/webm;codecs=vp9,opus",

                "video/webm;codecs=vp8,opus",

                "video/webm"

            ];

            let selectedMime =
                "";

            for (const type of mimeTypes) {

                if (
                    MediaRecorder
                        .isTypeSupported(type)
                ) {

                    selectedMime =
                        type;

                    break;
                }
            }

            if (!selectedMime) {

                URL.revokeObjectURL(videoURL);

                throw new Error(
                    "Browser does not support video recording."
                );
            }


            /*
             * Recorder.
             */
            const recorder =
                new MediaRecorder(
                    stream,
                    {
                        mimeType:
                            selectedMime,

                        videoBitsPerSecond:
                            quality === "high"
                                ? 8000000
                                : 5000000,

                        audioBitsPerSecond:
                            128000
                    }
                );


            const chunks = [];

            recorder.ondataavailable =
                event => {

                    if (
                        event.data &&
                        event.data.size > 0
                    ) {

                        chunks.push(
                            event.data
                        );
                    }
                };


            const recordingFinished =
                new Promise((resolve, reject) => {

                    recorder.onstop = () => {

                        try {

                            const blob =
                                new Blob(
                                    chunks,
                                    {
                                        type:
                                            selectedMime
                                    }
                                );

                            resolve(blob);

                        } catch (error) {

                            reject(error);

                        }

                    };

                    recorder.onerror =
                        event => {

                            reject(
                                event.error ||
                                new Error(
                                    "Video recording failed."
                                )
                            );

                        };

                });


            /*
             * Mulai recording.
             */
            recorder.start(250);

            await video.play();


            /*
             * Render frame demi frame.
             */
            await new Promise(resolve => {

                const renderFrame = () => {

                    if (
                        video.paused ||
                        video.ended
                    ) {

                        resolve();

                        return;
                    }


                    ctx.drawImage(
                        video,
                        0,
                        0,
                        width,
                        height
                    );


                    /*
                     * Progress.
                     */
                    if (
                        typeof onProgress ===
                        "function"
                    ) {

                        const progress =
                            video.duration > 0
                                ? (
                                    video.currentTime /
                                    video.duration
                                ) * 100
                                : 0;

                        onProgress(
                            Math.min(
                                99,
                                Math.round(progress)
                            )
                        );
                    }


                    /*
                     * requestAnimationFrame
                     * untuk menjaga rendering.
                     */
                    requestAnimationFrame(
                        renderFrame
                    );
                };

                renderFrame();

            });


            /*
             * Stop recorder.
             */
            if (
                recorder.state !==
                "inactive"
            ) {

                recorder.stop();

            }


            const output =
                await recordingFinished;


            /*
             * Cleanup.
             */
            URL.revokeObjectURL(
                videoURL
            );

            video.pause();

            video.src = "";

            video.remove();

            canvas.remove();


            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(100);

            }


            return {

                blob:
                    output,

                width:
                    width,

                height:
                    height,

                duration:
                    metadata.duration,

                originalWidth:
                    metadata.width,

                originalHeight:
                    metadata.height,

                mimeType:
                    selectedMime,

                quality:
                    quality

            };
        },


        /*
         * Download video.
         */
        download(blob, originalName = "video") {

            if (!blob) {
                throw new Error(
                    "No processed video."
                );
            }

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href =
                url;

            const cleanName =
                originalName
                    .replace(/\.[^/.]+$/, "");

            /*
             * Browser MediaRecorder
             * biasanya menghasilkan WebM.
             */
            link.download =
                `${cleanName}_fidelis.webm`;

            document.body.appendChild(link);

            link.click();

            link.remove();

            setTimeout(() => {

                URL.revokeObjectURL(url);

            }, 2000);

        }

    };

})();
