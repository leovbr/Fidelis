/* =========================================================
   FIDELIS - NOTIFICATION SYSTEM
   Enhance. Don't Change.
   ========================================================= */

(function () {
    "use strict";

    let container = null;


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function init() {

        if (container) {
            return;
        }


        container =
            document.createElement(
                "div"
            );

        container.id =
            "fidelisNotifications";


        container.style.position =
            "fixed";

        container.style.top =
            "20px";

        container.style.right =
            "20px";

        container.style.zIndex =
            "99999";

        container.style.display =
            "flex";

        container.style.flexDirection =
            "column";

        container.style.gap =
            "10px";

        container.style.width =
            "min(360px, calc(100vw - 40px))";


        document.body.appendChild(
            container
        );

    }


    /* =====================================================
       SHOW
       ===================================================== */

    function show(
        message,
        type = "info",
        duration = 3500
    ) {

        init();


        const notification =
            document.createElement(
                "div"
            );


        notification.style.position =
            "relative";

        notification.style.padding =
            "14px 16px";

        notification.style.borderRadius =
            "14px";

        notification.style.background =
            "rgba(20, 20, 28, 0.96)";

        notification.style.border =
            "1px solid rgba(255,255,255,0.10)";

        notification.style.color =
            "#ffffff";

        notification.style.fontFamily =
            "inherit";

        notification.style.fontSize =
            "14px";

        notification.style.lineHeight =
            "1.45";

        notification.style.boxShadow =
            "0 15px 40px rgba(0,0,0,0.35)";

        notification.style.backdropFilter =
            "blur(18px)";

        notification.style.transform =
            "translateX(30px)";

        notification.style.opacity =
            "0";

        notification.style.transition =
            "all 0.25s ease";


        const icon =
            document.createElement(
                "span"
            );


        if (type === "success") {

            icon.textContent =
                "✓";

        } else if (type === "error") {

            icon.textContent =
                "×";

        } else if (type === "warning") {

            icon.textContent =
                "⚠";

        } else {

            icon.textContent =
                "i";

        }


        icon.style.display =
            "inline-flex";

        icon.style.alignItems =
            "center";

        icon.style.justifyContent =
            "center";

        icon.style.width =
            "24px";

        icon.style.height =
            "24px";

        icon.style.marginRight =
            "10px";

        icon.style.borderRadius =
            "50%";

        icon.style.background =
            "rgba(255,255,255,0.10)";

        icon.style.fontWeight =
            "700";


        const text =
            document.createElement(
                "span"
            );

        text.textContent =
            message;


        const row =
            document.createElement(
                "div"
            );

        row.style.display =
            "flex";

        row.style.alignItems =
            "center";


        row.appendChild(
            icon
        );

        row.appendChild(
            text
        );


        notification.appendChild(
            row
        );


        container.appendChild(
            notification
        );


        /*
         * Enter animation.
         */
        requestAnimationFrame(() => {

            notification.style.transform =
                "translateX(0)";

            notification.style.opacity =
                "1";

        });


        /*
         * Remove.
         */
        const timeout =
            setTimeout(() => {

                notification.style.transform =
                    "translateX(30px)";

                notification.style.opacity =
                    "0";


                setTimeout(() => {

                    notification.remove();

                }, 250);

            }, duration);


        /*
         * Click to dismiss.
         */
        notification.addEventListener(
            "click",
            () => {

                clearTimeout(
                    timeout
                );

                notification.remove();

            }
        );


        return notification;

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.FidelisNotify = {

        init,

        show,


        success(message) {

            return show(
                message,
                "success"
            );

        },


        error(message) {

            return show(
                message,
                "error",
                5000
            );

        },


        warning(message) {

            return show(
                message,
                "warning",
                4500
            );

        },


        info(message) {

            return show(
                message,
                "info"
            );

        }

    };


    /*
     * Initialize after DOM ready.
     */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }

})();
