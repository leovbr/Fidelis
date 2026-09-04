/* =========================================================
   FIDELIS - LOCAL STORAGE SYSTEM
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    const STORAGE_KEY =
        "fidelis_settings_v1";

    const HISTORY_KEY =
        "fidelis_history_v1";

    const DEFAULT_SETTINGS = {

        quality: "standard",

        facePreservation: true,

        autoDownload: false,

        theme: "dark",

        language: "en",

        vvip: false

    };


    window.FidelisStorage = {

        /* =====================================================
           SETTINGS
           ===================================================== */

        getSettings() {

            try {

                const saved =
                    localStorage.getItem(
                        STORAGE_KEY
                    );

                if (!saved) {

                    return {
                        ...DEFAULT_SETTINGS
                    };

                }

                const parsed =
                    JSON.parse(saved);

                return {

                    ...DEFAULT_SETTINGS,
                    ...parsed

                };

            } catch (error) {

                console.warn(
                    "FIDELIS settings could not be loaded:",
                    error
                );

                return {
                    ...DEFAULT_SETTINGS
                };

            }

        },


        saveSettings(settings = {}) {

            try {

                const current =
                    this.getSettings();

                const updated = {

                    ...current,
                    ...settings

                };

                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(updated)
                );

                return updated;

            } catch (error) {

                console.warn(
                    "FIDELIS settings could not be saved:",
                    error
                );

                return null;

            }

        },


        resetSettings() {

            try {

                localStorage.removeItem(
                    STORAGE_KEY
                );

            } catch (error) {

                console.warn(
                    error
                );

            }

            return {
                ...DEFAULT_SETTINGS
            };

        },


        /* =====================================================
           HISTORY
           ===================================================== */

        getHistory() {

            try {

                const saved =
                    localStorage.getItem(
                        HISTORY_KEY
                    );

                if (!saved) {
                    return [];
                }

                const history =
                    JSON.parse(saved);

                return Array.isArray(history)
                    ? history
                    : [];

            } catch (error) {

                console.warn(
                    "FIDELIS history could not be loaded:",
                    error
                );

                return [];

            }

        },


        addHistory(item = {}) {

            try {

                const history =
                    this.getHistory();

                const entry = {

                    id:
                        crypto.randomUUID
                        ? crypto.randomUUID()
                        : String(
                            Date.now()
                        ),

                    fileName:
                        item.fileName ||
                        "Unknown",

                    mode:
                        item.mode ||
                        "photo",

                    quality:
                        item.quality ||
                        "standard",

                    width:
                        item.width ||
                        null,

                    height:
                        item.height ||
                        null,

                    timestamp:
                        Date.now()

                };


                history.unshift(
                    entry
                );


                /*
                 * Simpan maksimal 20 riwayat.
                 */
                const limited =
                    history.slice(
                        0,
                        20
                    );


                localStorage.setItem(
                    HISTORY_KEY,
                    JSON.stringify(
                        limited
                    )
                );


                return entry;

            } catch (error) {

                console.warn(
                    "FIDELIS history could not be saved:",
                    error
                );

                return null;

            }

        },


        removeHistory(id) {

            const history =
                this.getHistory();

            const filtered =
                history.filter(
                    item =>
                        item.id !== id
                );

            localStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(
                    filtered
                )
            );

            return filtered;

        },


        clearHistory() {

            try {

                localStorage.removeItem(
                    HISTORY_KEY
                );

            } catch (error) {

                console.warn(
                    error
                );

            }

            return [];

        },


        /* =====================================================
           STORAGE INFO
           ===================================================== */

        getInfo() {

            let settingsSize = 0;
            let historySize = 0;

            try {

                settingsSize =
                    (
                        localStorage.getItem(
                            STORAGE_KEY
                        ) || ""
                    ).length;

                historySize =
                    (
                        localStorage.getItem(
                            HISTORY_KEY
                        ) || ""
                    ).length;

            } catch (error) {

                console.warn(
                    error
                );

            }


            return {

                settingsBytes:
                    settingsSize,

                historyBytes:
                    historySize,

                totalBytes:
                    settingsSize +
                    historySize

            };

        }

    };

})();
