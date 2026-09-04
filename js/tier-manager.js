/* =========================================================
   FIDELIS - TIER MANAGER
   FREE / HIGH / VVIP
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    const TIERS = {
        standard: {
            id: "standard",
            name: "Standard",
            access: "free",
            scale: 1.5,
            maxPhotoSize: 20 * 1024 * 1024,
            maxVideoSize: 200 * 1024 * 1024,
            ai: false
        },

        high: {
            id: "high",
            name: "High",
            access: "free",
            scale: 2,
            maxPhotoSize: 20 * 1024 * 1024,
            maxVideoSize: 200 * 1024 * 1024,
            ai: false
        },

        ultra: {
            id: "ultra",
            name: "Ultra AI",
            access: "vvip",
            scale: 4,
            maxPhotoSize: 100 * 1024 * 1024,
            maxVideoSize: 1000 * 1024 * 1024,
            ai: true
        }
    };


    window.FidelisTier = {

        currentUser: {
            vvip: false
        },


        /* =====================================================
           GET TIER
           ===================================================== */

        get(tier = "standard") {

            return (
                TIERS[tier] ||
                TIERS.standard
            );

        },


        /* =====================================================
           CHECK ACCESS
           ===================================================== */

        canUse(tier = "standard") {

            const config =
                this.get(tier);

            if (
                config.access ===
                "free"
            ) {
                return true;
            }

            return (
                this.currentUser.vvip ===
                true
            );

        },


        /* =====================================================
           REQUIRE ACCESS
           ===================================================== */

        require(tier = "standard") {

            if (
                this.canUse(tier)
            ) {

                return {
                    allowed: true,
                    tier: this.get(tier)
                };

            }


            return {
                allowed: false,
                reason:
                    "This feature requires FIDELIS VVIP.",
                tier:
                    this.get(tier)
            };

        },


        /* =====================================================
           SET VVIP
           ===================================================== */

        setVVIP(enabled) {

            this.currentUser.vvip =
                Boolean(enabled);


            if (
                window.FidelisStorage
            ) {

                window.FidelisStorage
                    .saveSettings({
                        vvip:
                            this.currentUser.vvip
                    });

            }


            return this.currentUser.vvip;

        },


        /* =====================================================
           LOAD USER STATE
           ===================================================== */

        load() {

            if (
                !window.FidelisStorage
            ) {
                return;
            }


            const settings =
                window.FidelisStorage
                    .getSettings();


            this.currentUser.vvip =
                settings.vvip === true;

        },


        /* =====================================================
           GET USER
           ===================================================== */

        getUser() {

            return {
                ...this.currentUser
            };

        },


        /* =====================================================
           GET AVAILABLE TIERS
           ===================================================== */

        getAll() {

            return Object.values(
                TIERS
            ).map(tier => ({

                ...tier,

                available:
                    this.canUse(
                        tier.id
                    )

            }));

        }

    };


    /*
     * Load saved account state.
     */

    window.FidelisTier.load();

})();
