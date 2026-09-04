(function () {
    "use strict";

    /*
     * FIDELIS - Main Application Controller
     * "Enhance. Don't Change."
     */

    let currentMode = "photo";
    let selectedFile = null;
    let selectedQuality = "standard";

    let currentPreviewURL = null;
    let enhancedURL = null;
    let enhancedBlob = null;

    const $ = (id) => document.getElementById(id);

    const fileInput = $("fileInput");
    const uploadBox = $("uploadBox");
    const uploadButton = $("uploadButton");
    const uploadTitle = $("uploadTitle");
    const uploadDescription = $("uploadDescription");
    const uploadLimit = $("uploadLimit");

    const photoMode = $("photoMode");
    const videoMode = $("videoMode");

    const previewSection = $("previewSection");
    const mediaPreview = $("mediaPreview");
    const fileName = $("fileName");
    const removeButton = $("removeButton");

    const qualityOptions = document.querySelectorAll(".quality-option");
    const enhanceButton = $("enhanceButton");

    const processingSection = $("processingSection");
    const progressBar = $("progressBar");
    const progressPercent = $("progressPercent");
    const processingText = $("processingText");

    const resultSection = $("resultSection");
    const resultPreview = $("resultPreview");
    const resultQuality = $("resultQuality");
    const downloadButton = $("downloadButton");
    const newFileButton = $("newFileButton");

    const vipButton = $("vipButton");
    const upgradeButton = $("upgradeButton");

    const vipModal = $("vipModal");
    const modalOverlay = $("modalOverlay");
    const modalClose = $("modalClose");

    /*
     * =========================
     * INITIALIZATION
     * =========================
     */

    function init() {
        loadSettings();
        setupEvents();
        updateModeUI();
        updateQualityUI();
        updateUploadUI();

        if (window.FidelisNotify) {
            FidelisNotify.info("FIDELIS siap digunakan.");
        }
    }

    function loadSettings() {
        if (!window.FidelisStorage) return;

        const settings = FidelisStorage.getSettings();

        if (settings.quality) {
            selectedQuality = settings.quality;
        }

        if (window.FidelisTier) {
            FidelisTier.load();
        }
    }

    /*
     * =========================
     * EVENTS
     * =========================
     */

    function setupEvents() {

        // Upload button
        if (uploadButton) {
            uploadButton.addEventListener("click", function (event) {
                event.stopPropagation();

                if (fileInput) {
                    fileInput.click();
                }
            });
        }

        // Upload box
        if (uploadBox) {

            uploadBox.addEventListener("click", function () {
                if (fileInput) {
                    fileInput.click();
                }
            });

            uploadBox.addEventListener("dragover", function (event) {
                event.preventDefault();
                uploadBox.classList.add("dragging");
            });

            uploadBox.addEventListener("dragleave", function () {
                uploadBox.classList.remove("dragging");
            });

            uploadBox.addEventListener("drop", function (event) {
                event.preventDefault();

                uploadBox.classList.remove("dragging");

                const files = event.dataTransfer.files;

                if (files && files.length > 0) {
                    handleFile(files[0]);
                }
            });
        }

        // File input
        if (fileInput) {
            fileInput.addEventListener("change", function () {

                if (!fileInput.files || !fileInput.files.length) {
                    return;
                }

                handleFile(fileInput.files[0]);
            });
        }

        // Mode buttons
        if (photoMode) {
            photoMode.addEventListener("click", function () {
                setMode("photo");
            });
        }

        if (videoMode) {
            videoMode.addEventListener("click", function () {
                setMode("video");
            });
        }

        // Quality
        qualityOptions.forEach(function (option) {

            option.addEventListener("click", function () {

                const quality = option.dataset.quality;

                if (!quality) return;

                selectQuality(quality);
            });
        });

        // Enhance
        if (enhanceButton) {
            enhanceButton.addEventListener("click", startEnhancement);
        }

        // Remove
        if (removeButton) {
            removeButton.addEventListener("click", resetFile);
        }

        // Download
        if (downloadButton) {
            downloadButton.addEventListener("click", downloadResult);
        }

        // New file
        if (newFileButton) {
            newFileButton.addEventListener("click", resetAll);
        }

        // VVIP
        if (vipButton) {
            vipButton.addEventListener("click", openVIPModal);
        }

        if (upgradeButton) {
            upgradeButton.addEventListener("click", openVIPModal);
        }

        if (modalClose) {
            modalClose.addEventListener("click", closeVIPModal);
        }

        if (modalOverlay) {
            modalOverlay.addEventListener("click", function (event) {

                if (event.target === modalOverlay) {
                    closeVIPModal();
                }

            });
        }
    }

    /*
     * =========================
     * MODE
     * =========================
     */

    function setMode(mode) {

        if (mode !== "photo" && mode !== "video") {
            return;
        }

        currentMode = mode;

        updateModeUI();
        updateUploadUI();

        if (selectedFile) {
            resetFile();
        }
    }

    function updateModeUI() {

        if (photoMode) {
            photoMode.classList.toggle(
                "active",
                currentMode === "photo"
            );
        }

        if (videoMode) {
            videoMode.classList.toggle(
                "active",
                currentMode === "video"
            );
        }
    }

    function updateUploadUI() {

        if (currentMode === "photo") {

            if (uploadTitle) {
                uploadTitle.textContent = "Upload your photo";
            }

            if (uploadDescription) {
                uploadDescription.textContent =
                    "JPG, JPEG, PNG, WEBP";
            }

            if (uploadLimit) {
                uploadLimit.textContent =
                    "Maximum 20 MB";
            }

        } else {

            if (uploadTitle) {
                uploadTitle.textContent = "Upload your video";
            }

            if (uploadDescription) {
                uploadDescription.textContent =
                    "MP4, WEBM, MOV";
            }

            if (uploadLimit) {
                uploadLimit.textContent =
                    "Maximum 200 MB";
            }
        }
    }

    /*
     * =========================
     * QUALITY
     * =========================
     */

    function selectQuality(quality) {

        if (!["standard", "high", "ultra"].includes(quality)) {
            return;
        }

        // Check VVIP
        if (
            quality === "ultra" &&
            window.FidelisTier &&
            !FidelisTier.canUse("ultra")
        ) {

            showNotification(
                "Ultra AI hanya tersedia untuk FIDELIS VVIP.",
                "warning"
            );

            openVIPModal();
            return;
        }

        selectedQuality = quality;

        updateQualityUI();

        if (window.FidelisStorage) {
            FidelisStorage.saveSettings({
                quality: selectedQuality
            });
        }
    }

    function updateQualityUI() {

        qualityOptions.forEach(function (option) {

            const quality = option.dataset.quality;

            option.classList.toggle(
                "active",
                quality === selectedQuality
            );
        });
    }

    /*
     * =========================
     * FILE HANDLING
     * =========================
     */

    function handleFile(file) {

        if (!file) return;

        const validation = validateFile(file);

        if (!validation.valid) {

            showNotification(
                validation.message,
                "error"
            );

            return;
        }

        selectedFile = file;

        createPreview(file);

        if (previewSection) {
            previewSection.classList.remove("hidden");
        }

        if (enhanceButton) {
            enhanceButton.disabled = false;
        }

        if (resultSection) {
            resultSection.classList.add("hidden");
        }

        showNotification(
            "File berhasil dimuat.",
            "success"
        );
    }

    function validateFile(file) {

        if (currentMode === "photo") {

            if (!file.type.startsWith("image/")) {

                return {
                    valid: false,
                    message: "File harus berupa gambar."
                };
            }

            const maxSize = 20 * 1024 * 1024;

            if (file.size > maxSize) {

                return {
                    valid: false,
                    message: "Ukuran foto maksimal 20 MB."
                };
            }

        } else {

            if (!file.type.startsWith("video/")) {

                return {
                    valid: false,
                    message: "File harus berupa video."
                };
            }

            const maxSize = 200 * 1024 * 1024;

            if (file.size > maxSize) {

                return {
                    valid: false,
                    message: "Ukuran video maksimal 200 MB."
                };
            }
        }

        return {
            valid: true
        };
    }

    /*
     * =========================
     * PREVIEW
     * =========================
     */

    function createPreview(file) {

        cleanupPreviewURL();

        currentPreviewURL = URL.createObjectURL(file);

        if (!mediaPreview) return;

        mediaPreview.innerHTML = "";

        if (currentMode === "photo") {

            const img = document.createElement("img");

            img.src = currentPreviewURL;
            img.alt = "FIDELIS preview";

            mediaPreview.appendChild(img);

        } else {

            const video = document.createElement("video");

            video.src = currentPreviewURL;
            video.controls = true;
            video.playsInline = true;

            mediaPreview.appendChild(video);
        }

        if (fileName) {
            fileName.textContent = file.name;
        }
    }

    /*
     * =========================
     * ENHANCEMENT
     * =========================
     */

    async function startEnhancement() {

        if (!selectedFile) {

            showNotification(
                "Upload file terlebih dahulu.",
                "warning"
            );

            return;
        }

        if (
            window.FidelisProcessing &&
            FidelisProcessing.getStatus().running
        ) {

            showNotification(
                "Masih ada proses yang berjalan.",
                "warning"
            );

            return;
        }

        // VVIP protection
        if (
            selectedQuality === "ultra" &&
            window.FidelisTier &&
            !FidelisTier.canUse("ultra")
        ) {

            showNotification(
                "Ultra AI membutuhkan FIDELIS VVIP.",
                "warning"
            );

            openVIPModal();
            return;
        }

        showProcessing();

        try {

            let result;

            if (window.FidelisProcessing) {

                result = await FidelisProcessing.process({
                    file: selectedFile,
                    mode: currentMode,
                    quality: selectedQuality,
                    onProgress: updateProgress
                });

            } else {

                result = await fallbackProcessing();
            }

            if (!result || !result.blob) {
                throw new Error(
                    "Processing menghasilkan output kosong."
                );
            }

            enhancedBlob = result.blob;

            if (enhancedURL) {
                URL.revokeObjectURL(enhancedURL);
            }

            enhancedURL = URL.createObjectURL(
                enhancedBlob
            );

            showResult(result);

            showNotification(
                "Enhancement selesai.",
                "success"
            );

        } catch (error) {

            console.error(
                "FIDELIS processing error:",
                error
            );

            showNotification(
                error.message ||
                "Terjadi kesalahan saat enhancement.",
                "error"
            );

        } finally {

            hideProcessing();
        }
    }

    async function fallbackProcessing() {

        if (currentMode === "photo") {

            if (
                selectedQuality === "ultra" &&
                window.FidelisImageAI
            ) {

                return await FidelisImageAI.enhance(
                    selectedFile,
                    selectedQuality,
                    updateProgress
                );
            }

            return await FidelisImage.enhance(
                selectedFile,
                selectedQuality
            );
        }

        return await FidelisVideo.enhance(
            selectedFile,
            selectedQuality,
            updateProgress
        );
    }

    /*
     * =========================
     * PROGRESS
     * =========================
     */

    function showProcessing() {

        if (processingSection) {
            processingSection.classList.remove("hidden");
        }

        if (enhanceButton) {
            enhanceButton.disabled = true;
        }

        updateProgress(0);
        setProcessingText("Preparing enhancement...");
    }

    function hideProcessing() {

        if (processingSection) {
            processingSection.classList.add("hidden");
        }

        if (enhanceButton) {
            enhanceButton.disabled = false;
        }
    }

    function updateProgress(value) {

        let progress = Number(value);

        if (!Number.isFinite(progress)) {
            progress = 0;
        }

        progress = Math.max(
            0,
            Math.min(100, progress)
        );

        if (progressBar) {

            progressBar.style.width =
                progress + "%";
        }

        if (progressPercent) {

            progressPercent.textContent =
                Math.round(progress) + "%";
        }

        if (progress >= 100) {

            setProcessingText(
                "Finalizing enhanced file..."
            );

        } else if (progress >= 75) {

            setProcessingText(
                "Optimizing details..."
            );

        } else if (progress >= 40) {

            setProcessingText(
                "Enhancing image quality..."
            );

        } else {

            setProcessingText(
                "Processing..."
            );
        }
    }

    function setProcessingText(text) {

        if (processingText) {
            processingText.textContent = text;
        }
    }

    /*
     * =========================
     * RESULT
     * =========================
     */

    function showResult(result) {

        if (!resultSection || !resultPreview) {
            return;
        }

        resultSection.classList.remove("hidden");

        resultPreview.innerHTML = "";

        if (currentMode === "photo") {

            const img = document.createElement("img");

            img.src = enhancedURL;
            img.alt = "FIDELIS enhanced result";

            resultPreview.appendChild(img);

        } else {

            const video = document.createElement("video");

            video.src = enhancedURL;
            video.controls = true;
            video.playsInline = true;

            resultPreview.appendChild(video);
        }

        if (resultQuality) {

            let qualityName =
                selectedQuality;

            if (selectedQuality === "ultra") {
                qualityName = "Ultra AI VVIP";
            } else if (selectedQuality === "high") {
                qualityName = "High";
            } else {
                qualityName = "Standard";
            }

            resultQuality.textContent =
                qualityName;
        }

        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    /*
     * =========================
     * DOWNLOAD
     * =========================
     */

    function downloadResult() {

        if (!enhancedBlob) {

            showNotification(
                "Belum ada hasil enhancement.",
                "warning"
            );

            return;
        }

        const extension =
            currentMode === "photo"
                ? "jpg"
                : "webm";

        const originalName =
            selectedFile
                ? selectedFile.name
                : "fidelis";

        const cleanName =
            originalName
                .replace(/\.[^/.]+$/, "");

        const filename =
            cleanName +
            "_fidelis." +
            extension;

        const link =
            document.createElement("a");

        link.href = enhancedURL;
        link.download = filename;

        document.body.appendChild(link);

        link.click();

        link.remove();

        if (window.FidelisNotify) {
            FidelisNotify.success(
                "File berhasil disiapkan untuk download."
            );
        }
    }

    /*
     * =========================
     * RESET
     * =========================
     */

    function resetFile() {

        selectedFile = null;

        cleanupPreviewURL();

        if (fileInput) {
            fileInput.value = "";
        }

        if (previewSection) {
            previewSection.classList.add("hidden");
        }

        if (mediaPreview) {
            mediaPreview.innerHTML = "";
        }

        if (fileName) {
            fileName.textContent = "";
        }

        if (enhanceButton) {
            enhanceButton.disabled = true;
        }
    }

    function resetAll() {

        resetFile();

        if (enhancedURL) {
            URL.revokeObjectURL(enhancedURL);
            enhancedURL = null;
        }

        enhancedBlob = null;

        if (resultPreview) {
            resultPreview.innerHTML = "";
        }

        if (resultSection) {
            resultSection.classList.add("hidden");
        }

        updateProgress(0);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        showNotification(
            "FIDELIS siap untuk file baru.",
            "info"
        );
    }

    /*
     * =========================
     * VVIP MODAL
     * =========================
     */

    function openVIPModal() {

        if (!vipModal) return;

        vipModal.classList.remove("hidden");

        document.body.classList.add(
            "modal-open"
        );
    }

    function closeVIPModal() {

        if (!vipModal) return;

        vipModal.classList.add("hidden");

        document.body.classList.remove(
            "modal-open"
        );
    }

    /*
     * =========================
     * NOTIFICATIONS
     * =========================
     */

    function showNotification(
        message,
        type = "info"
    ) {

        if (window.FidelisNotify) {
                   
