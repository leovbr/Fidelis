/* =========================================================
   FIDELIS - MAIN APPLICATION
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    let currentMode = "photo";
    let selectedFile = null;
    let selectedQuality = "standard";

    let currentPreviewURL = null;
    let enhancedURL = null;

    let processingTimer = null;


    /* =====================================================
       DOM
       ===================================================== */

    const fileInput =
        document.getElementById("fileInput");

    const uploadBox =
        document.getElementById("uploadBox");

    const uploadButton =
        document.getElementById("uploadButton");

    const uploadTitle =
        document.getElementById("uploadTitle");

    const uploadDescription =
        document.getElementById("uploadDescription");

    const uploadLimit =
        document.getElementById("uploadLimit");

    const photoMode =
        document.getElementById("photoMode");

    const videoMode =
        document.getElementById("videoMode");

    const previewSection =
        document.getElementById("previewSection");

    const mediaPreview =
        document.getElementById("mediaPreview");

    const fileName =
        document.getElementById("fileName");

    const removeButton =
        document.getElementById("removeButton");

    const qualityOptions =
        document.querySelectorAll(".quality-option");

    const enhanceButton =
        document.getElementById("enhanceButton");

    const processingSection =
        document.getElementById("processingSection");

    const progressBar =
        document.getElementById("progressBar");

    const progressPercent =
        document.getElementById("progressPercent");

    const processingText =
        document.getElementById("processingText");

    const resultSection =
        document.getElementById("resultSection");

    const resultPreview =
        document.getElementById("resultPreview");

    const resultQuality =
        document.getElementById("resultQuality");

    const downloadButton =
        document.getElementById("downloadButton");

    const newFileButton =
        document.getElementById("newFileButton");

    const vipButton =
        document.getElementById("vipButton");

    const upgradeButton =
        document.getElementById("upgradeButton");

    const vipModal =
        document.getElementById("vipModal");

    const modalOverlay =
        document.getElementById("modalOverlay");

    const modalClose =
        document.getElementById("modalClose");


    /* =====================================================
       INITIAL STATE
       ===================================================== */

    if (previewSection) {
        previewSection.classList.add("hidden");
    }

    if (processingSection) {
        processingSection.classList.add("hidden");
    }

    if (resultSection) {
        resultSection.classList.add("hidden");
    }


    /* =====================================================
       MODE SWITCH
       ===================================================== */

    if (photoMode) {

        photoMode.addEventListener(
            "click",
            () => setMode("photo")
        );

    }


    if (videoMode) {

        videoMode.addEventListener(
            "click",
            () => setMode("video")
        );

    }


    function setMode(mode) {

        currentMode = mode;

        resetCurrentFile();

        if (photoMode) {
            photoMode.classList.toggle(
                "active",
                mode === "photo"
            );
        }

        if (videoMode) {
            videoMode.classList.toggle(
                "active",
                mode === "video"
            );
        }


        if (mode === "photo") {

            if (uploadTitle) {
                uploadTitle.textContent =
                    "Drop your photo here";
            }

            if (uploadDescription) {
                uploadDescription.textContent =
                    "or click to browse from your device";
            }

            if (uploadLimit) {
                uploadLimit.textContent =
                    "JPG, JPEG, PNG, WEBP • Max 20MB";
            }

            if (fileInput) {
                fileInput.accept =
                    "image/jpeg,image/png,image/webp";
            }

        } else {

            if (uploadTitle) {
                uploadTitle.textContent =
                    "Drop your video here";
            }

            if (uploadDescription) {
                uploadDescription.textContent =
                    "or click to browse from your device";
            }

            if (uploadLimit) {
                uploadLimit.textContent =
                    "MP4, WEBM, MOV • Max 200MB";
            }

            if (fileInput) {
                fileInput.accept =
                    "video/mp4,video/webm,video/quicktime";
            }

        }

    }


    /* =====================================================
       FILE PICKER
       ===================================================== */

    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                if (fileInput) {
                    fileInput.click();
                }

            }
        );

    }


    if (uploadBox) {

        uploadBox.addEventListener(
            "click",
            event => {

                if (
                    event.target.closest(
                        "#uploadButton"
                    )
                ) {
                    return;
                }

                if (fileInput) {
                    fileInput.click();
                }

            }
        );


        /* Drag over */

        uploadBox.addEventListener(
            "dragover",
            event => {

                event.preventDefault();

                uploadBox.classList.add(
                    "dragging"
                );

            }
        );


        /* Drag leave */

        uploadBox.addEventListener(
            "dragleave",
            event => {

                event.preventDefault();

                uploadBox.classList.remove(
                    "dragging"
                );

            }
        );


        /* Drop */

        uploadBox.addEventListener(
            "drop",
            event => {

                event.preventDefault();

                uploadBox.classList.remove(
                    "dragging"
                );

                const files =
                    event.dataTransfer.files;

                if (
                    files &&
                    files.length > 0
                ) {

                    handleFile(files[0]);

                }

            }
        );

    }


    /* File input */

    if (fileInput) {

        fileInput.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files[0];

                if (file) {
                    handleFile(file);
                }

            }
        );

    }


    /* =====================================================
       FILE VALIDATION
       ===================================================== */

    function handleFile(file) {

        if (!file) {
            return;
        }


        const isPhoto =
            file.type.startsWith(
                "image/"
            );

        const isVideo =
            file.type.startsWith(
                "video/"
            );


        if (
            currentMode === "photo" &&
            !isPhoto
        ) {

            showError(
                "Please select an image file."
            );

            return;
        }


        if (
            currentMode === "video" &&
            !isVideo
        ) {

            showError(
                "Please select a video file."
            );

            return;
        }


        const maxSize =
            currentMode === "photo"
                ? 20 * 1024 * 1024
                : 200 * 1024 * 1024;


        if (file.size > maxSize) {

            showError(
                currentMode === "photo"
                    ? "Photo is larger than 20MB."
                    : "Video is larger than 200MB."
            );

            return;
        }


        selectedFile = file;

        showPreview(file);

    }


    /* =====================================================
       PREVIEW
       ===================================================== */

    function showPreview(file) {

        cleanupURLs();


        currentPreviewURL =
            URL.createObjectURL(file);


        if (mediaPreview) {

            mediaPreview.innerHTML = "";


            if (
                currentMode === "photo"
            ) {

                const img =
                    document.createElement(
                        "img"
                    );

                img.src =
                    currentPreviewURL;

                img.alt =
                    "Selected photo";

                mediaPreview.appendChild(
                    img
                );


            } else {

                const video =
                    document.createElement(
                        "video"
                    );

                video.src =
                    currentPreviewURL;

                video.controls =
                    true;

                video.playsInline =
                    true;

                mediaPreview.appendChild(
                    video
                );

            }

        }


        if (fileName) {

            fileName.textContent =
                file.name;

        }


        if (previewSection) {

            previewSection.classList.remove(
                "hidden"
            );

        }


        if (processingSection) {

            processingSection.classList.add(
                "hidden"
            );

        }


        if (resultSection) {

            resultSection.classList.add(
                "hidden"
            );

        }

    }


    /* =====================================================
       REMOVE FILE
       ===================================================== */

    if (removeButton) {

        removeButton.addEventListener(
            "click",
            resetCurrentFile
        );

    }


    function resetCurrentFile() {

        selectedFile = null;

        cleanupURLs();


        if (fileInput) {
            fileInput.value = "";
        }


        if (mediaPreview) {
            mediaPreview.innerHTML = "";
        }


        if (fileName) {
            fileName.textContent = "";
        }


        if (previewSection) {
            previewSection.classList.add(
                "hidden"
            );
        }


        if (processingSection) {
            processingSection.classList.add(
                "hidden"
            );
        }


        if (resultSection) {
            resultSection.classList.add(
                "hidden"
            );
        }


        resetProgress();

    }


    /* =====================================================
       QUALITY
       ===================================================== */

    qualityOptions.forEach(
        option => {

            option.addEventListener(
                "click",
                () => {

                    const quality =
                        option.dataset.quality;

                    if (!quality) {
                        return;
                    }


                    /*
                     * Ultra = VVIP.
                     */

                    if (
                        quality === "ultra"
                    ) {

                        openVIPModal();

                        return;
                    }


                    selectedQuality =
                        quality;


                    qualityOptions.forEach(
                        item => {

                            item.classList.toggle(
                                "active",
                                item === option
                            );

                        }
                    );

                }
            );

        }
    );


    /* =====================================================
       ENHANCE BUTTON
       ===================================================== */

    if (enhanceButton) {

        enhanceButton.addEventListener(
            "click",
            startEnhancement
        );

    }


    async function startEnhancement() {

        if (!selectedFile) {

            showError(
                "Please upload a file first."
            );

            return;
        }


        if (processingSection) {

            processingSection.classList.remove(
                "hidden"
            );

        }


        if (resultSection) {

            resultSection.classList.add(
                "hidden"
            );

        }


        if (enhanceButton) {

            enhanceButton.disabled =
                true;

        }


        setProgress(
            5,
            "Preparing media..."
        );


        try {

            let result;


            if (
                currentMode === "photo"
            ) {

                setProgress(
                    15,
                    "Analyzing image details..."
                );


                await delay(300);


                setProgress(
                    30,
                    "Upscaling image..."
                );


                result =
                    await FidelisImage.enhance(
                        selectedFile,
                        selectedQuality
                    );


                setProgress(
                    70,
                    "Improving clarity..."
                );


                await delay(300);


                setProgress(
                    88,
                    "Preserving facial details..."
                );


                await delay(300);


                setProgress(
                    100,
                    "Enhancement complete."
                );


            } else {

                setProgress(
                    10,
                    "Analyzing video..."
                );


                result =
                    await FidelisVideo.enhance(
                        selectedFile,
                        selectedQuality,
                        percentage => {

                            const value =
                                Math.max(
                                    10,
                                    Math.min(
                                        99,
                                        percentage
                                    )
                                );


                            setProgress(
                                value,
                                "Enhancing video frames..."
                            );

                        }
                    );


                setProgress(
                    100,
                    "Enhancement complete."
                );

            }


            /*
             * Simpan hasil.
             */

            if (enhancedURL) {

                URL.revokeObjectURL(
                    enhancedURL
                );

            }


            enhancedURL =
                URL.createObjectURL(
                    result.blob
                );


            showResult(
                result
            );


        } catch (error) {

            console.error(
                "FIDELIS enhancement error:",
                error
            );


            showError(
                error.message ||
                "Enhancement failed. Please try again."
            );


            if (processingSection) {

                processingSection.classList.add(
                    "hidden"
                );

            }

        } finally {

            if (enhanceButton) {

                enhanceButton.disabled =
                    false;

            }

        }

    }


    /* =====================================================
       RESULT
       ===================================================== */

    function showResult(result) {

        if (!resultPreview) {
            return;
        }


        resultPreview.innerHTML = "";


        if (
            currentMode === "photo"
        ) {

            const image =
                document.createElement(
                    "img"
                );

            image.src =
                enhancedURL;

            image.alt =
                "FIDELIS enhanced image";

            resultPreview.appendChild(
                image
            );


        } else {

            const video =
                document.createElement(
                    "video"
                );

            video.src =
                enhancedURL;

            video.controls =
                true;

            video.playsInline =
                true;

            resultPreview.appendChild(
                video
            );

        }


        if (resultQuality) {

            if (
                currentMode === "photo"
            ) {

                resultQuality.textContent =
                    `${result.width} × ${result.height}`;

            } else {

                resultQuality.textContent =
                    `${result.width} × ${result.height}`;

            }

        }


        if (resultSection) {

            resultSection.classList.remove(
                "hidden"
            );

        }

    }


    /* =====================================================
       DOWNLOAD
       ===================================================== */

    if (downloadButton) {

        downloadButton.addEventListener(
            "click",
            downloadResult
        );

    }


    function downloadResult() {

        if (
            !selectedFile ||
            !enhancedURL
        ) {

            return;

        }


        /*
         * Fetch blob dari object URL.
         */

        fetch(enhancedURL)
            .then(
                response =>
                    response.blob()
            )
            .then(blob => {

                if (
                    currentMode === "photo"
                ) {

                    FidelisImage.download(
                        blob,
                        selectedFile.name
                    );

                } else {

                    FidelisVideo.download(
                        blob,
                        selectedFile.name
                    );

                }

            })
            .catch(error => {

                console.error(
                    "Download failed:",
                    error
                );

                showError(
                    "Unable to download the result."
                );

            });

    }


    /* =====================================================
       NEW FILE
       ===================================================== */

    if (newFileButton) {

        newFileButton.addEventListener(
            "click",
            resetCurrentFile
        );

    }


    /* =====================================================
       PROGRESS
       ===================================================== */

    function setProgress(
        percentage,
        message
    ) {

        const value =
            Math.max(
                0,
                Math.min(
                    100,
                    percentage
                )
            );


        if (progressBar) {

            progressBar.style.width =
                `${value}%`;

        }


        if (progressPercent) {

  
