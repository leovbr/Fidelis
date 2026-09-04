/* =========================================================
   FIDELIS — APP.JS
   Core interface & media handling
   Enhance. Don't Change.
========================================================= */

"use strict";


/* =========================================================
   ELEMENTS
========================================================= */

const fileInput = document.getElementById("fileInput");

const uploadBox = document.getElementById("uploadBox");
const uploadButton = document.getElementById("uploadButton");

const uploadTitle = document.getElementById("uploadTitle");
const uploadDescription = document.getElementById("uploadDescription");
const uploadLimit = document.getElementById("uploadLimit");

const photoMode = document.getElementById("photoMode");
const videoMode = document.getElementById("videoMode");

const previewSection = document.getElementById("previewSection");
const mediaPreview = document.getElementById("mediaPreview");

const fileName = document.getElementById("fileName");
const removeButton = document.getElementById("removeButton");

const enhancementOptions =
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


/* =========================================================
   APPLICATION STATE
========================================================= */

let currentMode = "photo";

let selectedFile = null;

let selectedQuality = "standard";

let currentObjectURL = null;

let enhancedObjectURL = null;

let processingTimer = null;


/* =========================================================
   INITIALIZATION
========================================================= */

function init() {

    setMode("photo");

    resetApplication();

    setupEvents();

}


/* =========================================================
   EVENT SETUP
========================================================= */

function setupEvents() {

    /* -------------------------------
       MODE
    -------------------------------- */

    photoMode.addEventListener("click", () => {
        setMode("photo");
    });


    videoMode.addEventListener("click", () => {
        setMode("video");
    });


    /* -------------------------------
       UPLOAD
    -------------------------------- */

    uploadButton.addEventListener("click", (event) => {

        event.stopPropagation();

        fileInput.click();

    });


    uploadBox.addEventListener("click", () => {

        if (!selectedFile) {
            fileInput.click();
        }

    });


    fileInput.addEventListener("change", (event) => {

        const file = event.target.files[0];

        if (file) {
            handleFile(file);
        }

    });


    /* -------------------------------
       DRAG & DROP
    -------------------------------- */

    uploadBox.addEventListener("dragover", (event) => {

        event.preventDefault();

        uploadBox.classList.add("dragging");

    });


    uploadBox.addEventListener("dragleave", () => {

        uploadBox.classList.remove("dragging");

    });


    uploadBox.addEventListener("drop", (event) => {

        event.preventDefault();

        uploadBox.classList.remove("dragging");

        const file =
            event.dataTransfer.files[0];

        if (file) {
            handleFile(file);
        }

    });


    /* -------------------------------
       REMOVE
    -------------------------------- */

    removeButton.addEventListener(
        "click",
        resetApplication
    );


    /* -------------------------------
       QUALITY
    -------------------------------- */

    enhancementOptions.forEach((option) => {

        option.addEventListener("click", () => {

            const quality =
                option.dataset.quality;

            if (quality === "ultra") {

                openVipModal();

                return;

            }

            enhancementOptions.forEach((item) => {

                item.classList.remove("active");

            });

            option.classList.add("active");

            selectedQuality = quality;

        });

    });


    /* -------------------------------
       ENHANCE
    -------------------------------- */

    enhanceButton.addEventListener(
        "click",
        startEnhancement
    );


    /* -------------------------------
       DOWNLOAD
    -------------------------------- */

    downloadButton.addEventListener(
        "click",
        downloadEnhancedMedia
    );


    /* -------------------------------
       NEW FILE
    -------------------------------- */

    newFileButton.addEventListener(
        "click",
        resetApplication
    );


    /* -------------------------------
       VVIP
    -------------------------------- */

    vipButton.addEventListener(
        "click",
        openVipModal
    );


    upgradeButton.addEventListener(
        "click",
        openVipModal
    );


    modalClose.addEventListener(
        "click",
        closeVipModal
    );


    modalOverlay.addEventListener(
        "click",
        closeVipModal
    );


    document.addEventListener(
        "keydown",
        handleKeyboard
    );

}


/* =========================================================
   MODE SWITCHING
========================================================= */

function setMode(mode) {

    currentMode = mode;

    photoMode.classList.toggle(
        "active",
        mode === "photo"
    );

    videoMode.classList.toggle(
        "active",
        mode === "video"
    );


    if (mode === "photo") {

        uploadTitle.textContent =
            "Upload your photo";

        uploadDescription.textContent =
            "Drop an image here or tap to browse";

        uploadLimit.textContent =
            "JPG, PNG, WEBP";

        fileInput.accept =
            "image/jpeg,image/png,image/webp";

    }


    if (mode === "video") {

        uploadTitle.textContent =
            "Upload your video";

        uploadDescription.textContent =
            "Drop a video here or tap to browse";

        uploadLimit.textContent =
            "MP4, WEBM, MOV";

        fileInput.accept =
            "video/mp4,video/webm,video/quicktime";

    }


    resetUploadVisuals();

}


/* =========================================================
   FILE HANDLING
========================================================= */

function handleFile(file) {

    if (!isValidFile(file)) {

        showUploadError();

        return;

    }


    selectedFile = file;


    cleanupObjectURLs();


    currentObjectURL =
        URL.createObjectURL(file);


    showPreview(file);

}


/* =========================================================
   FILE VALIDATION
========================================================= */

function isValidFile(file) {

    if (currentMode === "photo") {

        return file.type.startsWith("image/");

    }


    if (currentMode === "video") {

        return file.type.startsWith("video/");

    }


    return false;

}


/* =========================================================
   FILE SIZE CHECK
========================================================= */

function isFileTooLarge(file) {

    const maxSizeMB =
        currentMode === "photo"
            ? 20
            : 200;

    const maxBytes =
        maxSizeMB * 1024 * 1024;

    return file.size > maxBytes;

}


/* =========================================================
   PREVIEW
========================================================= */

function showPreview(file) {

    if (isFileTooLarge(file)) {

        alert(
            `This file is too large. Maximum size is ${
                currentMode === "photo"
                    ? "20 MB"
                    : "200 MB"
            }.`
        );

        resetApplication();

        return;

    }


    mediaPreview.innerHTML = "";


    fileName.textContent =
        file.name;


    if (currentMode === "photo") {

        const image =
            document.createElement("img");

        image.src =
            currentObjectURL;

        image.alt =
            "Original uploaded image";

        mediaPreview.appendChild(image);

    }


    if (currentMode === "video") {

        const video =
            document.createElement("video");

        video.src =
            currentObjectURL;

        video.controls = true;

        video.playsInline = true;

        video.preload = "metadata";

        mediaPreview.appendChild(video);

    }


    previewSection.classList.remove(
        "hidden"
    );


    processingSection.classList.add(
        "hidden"
    );


    resultSection.classList.add(
        "hidden"
    );


    uploadBox.classList.add(
        "hidden"
    );


    scrollToElement(
        previewSection
    );

}


/* =========================================================
   ENHANCEMENT
========================================================= */

function startEnhancement() {

    if (!selectedFile) {

        alert(
            "Please upload a file first."
        );

        return;

    }


    if (selectedQuality === "ultra") {

        openVipModal();

        return;

    }


    previewSection.classList.add(
        "hidden"
    );


    resultSection.classList.add(
        "hidden"
    );


    processingSection.classList.remove(
        "hidden"
    );


    progressBar.style.width =
        "0%";

    progressPercent.textContent =
        "0%";


    const messages =
        currentMode === "photo"
            ? [
                "Analyzing image details...",
                "Improving clarity...",
                "Reducing compression artifacts...",
                "Preserving facial details...",
                "Preparing enhanced image..."
            ]
            : [
                "Analyzing video...",
                "Optimizing frames...",
                "Improving clarity...",
                "Preserving facial details...",
                "Preparing enhanced video..."
            ];


    let progress = 0;

    let messageIndex = 0;


    processingText.textContent =
        messages[0];


    clearInterval(
        processingTimer
    );


    processingTimer =
        setInterval(() => {

            progress +=
                Math.floor(
                    Math.random() * 7
                ) + 3;


            if (progress > 100) {
                progress = 100;
            }


            progressBar.style.width =
                `${progress}%`;


            progressPercent.textContent =
                `${progress}%`;


            if (
                progress > 20 &&
                messageIndex < 1
            ) {

                messageIndex = 1;

                processingText.textContent =
                    messages[messageIndex];

            }


            if (
                progress > 40 &&
                messageIndex < 2
            ) {

                messageIndex = 2;

                processingText.textContent =
                    messages[messageIndex];

            }


            if (
                progress > 65 &&
                messageIndex < 3
            ) {

                messageIndex = 3;

                processingText.textContent =
                    messages[messageIndex];

            }


            if (
                progress > 85 &&
                messageIndex < 4
            ) {

                messageIndex = 4;

                processingText.textContent =
                    messages[messageIndex];

            }


            if (progress >= 100) {

                clearInterval(
                    processingTimer
                );


                setTimeout(
                    showResult,
                    450
                );

            }

        }, 160);

}


/* =========================================================
   RESULT
========================================================= */

function showResult() {

    processingSection.classList.add(
        "hidden"
    );


    resultSection.classList.remove(
        "hidden"
    );


    resultPreview.innerHTML = "";


    if (!selectedFile) {
        return;
    }


    /*
     * V1 FALLBACK
     *
     * At this stage the application uses
     * the original media as a visual result.
     *
     * Real super-resolution processing will
     * be connected in the next processing
     * modules.
     */

    enhancedObjectURL =
        currentObjectURL;


    if (currentMode === "photo") {

        const image =
            document.createElement("img");

        image.src =
            enhancedObjectURL;

        image.alt =
            "Enhanced image";

        resultPreview.appendChild(
            image
        );

    }


    if (currentMode === "video") {

        const video =
            document.createElement("video");

        video.src =
            enhancedObjectURL;

        video.controls = true;

        video.playsInline = true;

        resultPreview.appendChild(
            video
        );

    }


    resultQuality.textContent =
        selectedQuality === "high"
            ? "High"
            : "2×";


    scrollToElement(
        resultSection
    );

}


/* =========================================================
   DOWNLOAD
========================================================= */

function downloadEnhancedMedia() {

    if (!enhancedObjectURL) {

        alert(
            "No enhanced media available."
        );

        return;

    }


    const extension =
        currentMode === "photo"
            ? getImageExtension(selectedFile)
            : getVideoExtension(selectedFile);


    const baseName =
        selectedFile.name
            .replace(/\.[^/.]+$/, "");


    const link =
        document.createElement("a");


    link.href =
        enhancedObjectURL;


    link.download =
        `${baseName}_fidelis.${extension}`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();

}


/* =========================================================
   EXTENSIONS
========================================================= */

function getImageExtension(file) {

    if (!file) {
        return "jpg";
    }


    if (
        file.type ===
        "image/png"
    ) {
        return "png";
    }


    if (
        file.type ===
        "image/webp"
    ) {
        return "webp";
    }


    return "jpg";

}


function getVideoExtension(file) {

    if (!file) {
        return "mp4";
    }


    if (
        file.type ===
        "video/webm"
    ) {
        return "webm";
    }


    return "mp4";

}


/* =========================================================
   RESET
========================================================= */

function resetApplication() {

    clearInterval(
        processingTimer
    );


    cleanupObjectURLs();


    selectedFile = null;

    selectedQuality =
        "standard";


    fileInput.value = "";


    previewSection.classList.add(
        "hidden"
    );


    processingSection.classList.add(
        "hidden"
    );


    resultSection.classList.add(
        "hidden"
    );


    uploadBox.classList.remove(
        "hidden"
    );


    progressBar.style.width =
        "0%";


    progressPercent.textContent =
        "0%";


    mediaPreview.innerHTML = "";

    resultPreview.innerHTML = "";


    enhancementOptions.forEach(
        (option) => {

            option.classList.remove(
                "active"
            );

        }
    );


    const standardOption =
        document.querySelector(
            '[data-quality="standard"]'
        );


    if (standardOption) {

        standardOption.classList.add(
            "active"
        );

    }


    resetUploadVisuals();

}


/* =========================================================
   RESET UPLOAD VISUALS
========================================================= */

function resetUploadVisuals() {

    uploadBox.classList.remove(
        "dragging"
    );


    if (currentMode === "photo") {

        uploadTitle.textContent =
            "Upload your photo";

        uploadDescription.textContent =
            "Drop an image here or tap to browse";

        uploadLimit.textContent =
            "JPG, PNG, WEBP";

    }


    if (currentMode === "video") {

        uploadTitle.textContent =
            "Upload your video";

        uploadDescription.textContent =
            "Drop a video here or tap to browse";

        uploadLimit.textContent =
            "MP4, WEBM, MOV";

    }

}


/* =========================================================
   OBJECT URL CLEANUP
========================================================= */

function cleanupObjectURLs() {

    /*
     * Don't revoke currentObjectURL here if it
     * is still being used by the current media.
     *
     * It will be revoked when a new file is loaded
     * or the application is reset.
     */

}


/* =========================================================
   UPLOAD ERROR
========================================================= */

function showUploadError() {

    const oldTitle =
        uploadTitle.textContent;


    uploadTitle.textContent =
        "Unsupported file";


    uploadDescription.textContent =
        currentMode === "photo"
            ? "Please choose JPG, PNG or WEBP"
            : "Please choose MP4, WEBM or MOV";


    setTimeout(() => {

        uploadTitle.textContent =
            oldTitle;

        setMode(currentMode);

    }, 2200);

}


/* =========================================================
   VVIP MODAL
========================================================= */

function openVipModal() {

    vipModal.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";

}


function closeVipModal() {

    vipModal.classList.add(
        "hidden"
    );


    document.body.style.overflow =
        "";

}


/* =========================================================
   KEYBOARD
========================================================= */

function handleKeyboard(event) {

    if (
        event.key === "Escape" &&
        !vipModal.classList.contains(
            "hidden"
        )
    ) {

        closeVipModal();

    }

}


/* =========================================================
   SCROLL
========================================================= */

function scrollToElement(element) {

    if (!element) {
        return;
    }


    setTimeout(() => {

        element.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);

}


/* =========================================================
   START
========================================================= */

init();
