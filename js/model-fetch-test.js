(function () {
  "use strict";

  const MODEL_URL =
    "https://huggingface.co/SceneWorks/real-esrgan-onnx/resolve/main/real_esrgan_x2.onnx?download=true";

  function createUI() {
    const old = document.getElementById(
      "fidelisModelFetchTest"
    );

    if (old) {
      old.remove();
    }

    const box = document.createElement("div");

    box.id = "fidelisModelFetchTest";

    box.style.cssText = `
      position: fixed;
      inset: 20px;
      z-index: 999999;
      background: #111;
      color: #fff;
      padding: 20px;
      border-radius: 16px;
      font-family: Arial, sans-serif;
      overflow: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,.6);
    `;

    box.innerHTML = `
      <h2 style="margin-top:0">
        FIDELIS Model Fetch Test
      </h2>

      <div id="fidelisTestStatus">
        Menyiapkan test...
      </div>

      <pre
        id="fidelisTestLog"
        style="
          white-space:pre-wrap;
          word-break:break-word;
          background:#000;
          padding:15px;
          border-radius:10px;
          margin-top:15px;
        "
      ></pre>

      <button
        id="fidelisTestClose"
        style="
          margin-top:15px;
          padding:12px 18px;
          border:0;
          border-radius:10px;
          background:#fff;
          color:#000;
          font-weight:bold;
        "
      >
        CLOSE
      </button>
    `;

    document.body.appendChild(box);

    document
      .getElementById("fidelisTestClose")
      .onclick = function () {
        box.remove();
      };

    return box;
  }

  function log(message) {
    const el =
      document.getElementById(
        "fidelisTestLog"
      );

    if (!el) return;

    el.textContent +=
      message + "\n";
  }

  function status(message) {
    const el =
      document.getElementById(
        "fidelisTestStatus"
      );

    if (!el) return;

    el.textContent = message;
  }

  function formatMB(bytes) {
    return (
      bytes /
      1024 /
      1024
    ).toFixed(2) + " MB";
  }

  async function runTest() {
    createUI();

    status(
      "⏳ Testing model fetch..."
    );

    log(
      "========================================"
    );

    log(
      "FIDELIS MODEL FETCH TEST"
    );

    log(
      "========================================"
    );

    log("");

    log(
      "MODEL URL:"
    );

    log(MODEL_URL);

    log("");

    /*
     * STEP 1
     * Check browser fetch API
     */

    if (
      typeof window.fetch !==
      "function"
    ) {
      status(
        "❌ FETCH API TIDAK TERSEDIA"
      );

      log(
        "Browser tidak menyediakan Fetch API."
      );

      return;
    }

    log(
      "FETCH API: OK"
    );

    log("");

    /*
     * STEP 2
     * Try HEAD request first.
     *
     * Some servers don't allow HEAD,
     * so failure here is NOT considered
     * final failure.
     */

    try {
      status(
        "⏳ Checking server..."
      );

      const head =
        await fetch(
          MODEL_URL,
          {
            method: "HEAD",
            mode: "cors",
            redirect: "follow",
            cache: "no-store"
          }
        );

      log(
        "HEAD STATUS: " +
        head.status
      );

      log(
        "HEAD TYPE: " +
        head.type
      );

      log(
        "FINAL URL:"
      );

      log(
        head.url ||
        "(tidak tersedia)"
      );

      log("");
    } catch (error) {
      log(
        "HEAD TEST:"
      );

      log(
        "⚠️ Gagal / ditolak:"
      );

      log(
        error.message ||
        String(error)
      );

      log(
        "Ini belum tentu berarti fetch GET gagal."
      );

      log("");
    }

    /*
     * STEP 3
     * Actual GET request.
     *
     * This is the important test.
     */

    try {
      status(
        "⏳ Downloading model..."
      );

      log(
        "GET TEST:"
      );

      const start =
        performance.now();

      const response =
        await fetch(
          MODEL_URL,
          {
            method: "GET",
            mode: "cors",
            redirect: "follow",
            cache: "no-store",
            headers: {
              Accept:
                "application/octet-stream"
            }
          }
        );

      const elapsed =
        (
          performance.now() -
          start
        ) / 1000;

      log(
        "HTTP STATUS: " +
        response.status
      );

      log(
        "STATUS TEXT: " +
        response.statusText
      );

      log(
        "RESPONSE TYPE: " +
        response.type
      );

      log(
        "FINAL URL:"
      );

      log(
        response.url ||
        "(tidak tersedia)"
      );

      log(
        "TIME: " +
        elapsed.toFixed(2) +
        " seconds"
      );

      log("");

      /*
       * HTTP check
       */

      if (!response.ok) {
        status(
          "❌ SERVER RETURNED HTTP " +
          response.status
        );

        log(
          "Model tidak berhasil diambil."
        );

        return;
      }

      log(
        "HTTP: ✅ OK"
      );

      /*
       * Content type
       */

      const contentType =
        response.headers.get(
          "content-type"
        );

      log(
        "CONTENT-TYPE: " +
        (
          contentType ||
          "(tidak tersedia)"
        )
      );

      /*
       * Content length
       */

      const contentLength =
        response.headers.get(
          "content-length"
        );

      if (contentLength) {
        log(
          "CONTENT-LENGTH: " +
          contentLength +
          " bytes"
        );

        log(
          "CONTENT SIZE: " +
          formatMB(
            Number(contentLength)
          )
        );
      } else {
        log(
          "CONTENT-LENGTH: tidak tersedia"
        );
      }

      log("");

      /*
       * STEP 4
       * Read response body.
       */

      status(
        "⏳ Reading model data..."
      );

      const buffer =
        await response.arrayBuffer();

      log(
        "ARRAYBUFFER: ✅ BERHASIL"
      );

      log(
        "RECEIVED BYTES: " +
        buffer.byteLength
      );

      log(
        "RECEIVED SIZE: " +
        formatMB(
          buffer.byteLength
        )
      );

      log("");

      /*
       * STEP 5
       * Basic sanity check.
       */

      if (
        buffer.byteLength <
        1024
      ) {
        status(
          "❌ MODEL TERLALU KECIL"
        );

        log(
          "Response berhasil diterima,"
        );

        log(
          "tetapi ukurannya tidak masuk akal"
        );

        log(
          "untuk file Real-ESRGAN ONNX."
        );

        return;
      }

      /*
       * SUCCESS
       */

      status(
        "✅ MODEL FETCH BERHASIL"
      );

      log(
        "========================================"
      );

      log(
        "RESULT: SUCCESS ✅"
      );

      log(
        "Browser FIDELIS berhasil:"
      );

      log(
        "✓ connect ke Hugging Face"
      );

      log(
        "✓ melewati CORS"
      );

      log(
        "✓ menerima response"
      );

      log(
        "✓ membaca ArrayBuffer"
      );

      log(
        "✓ menerima file model"
      );

      log(
        "========================================"
      );

      log("");

      log(
        "Kesimpulan:"
      );

      log(
        "Masalah kemungkinan BUKAN pada"
      );

      log(
        "download model."
      );

      log(
        "Kita bisa lanjut debug"
      );

      log(
        "ONNX Runtime / Model Bridge."
      );

    } catch (error) {
      status(
        "❌ MODEL FETCH GAGAL"
      );

      log(
        "========================================"
      );

      log(
        "RESULT: FAILED ❌"
      );

      log(
        "========================================"
      );

      log("");

      log(
        "ERROR:"
      );

      log(
        error &&
        error.message
          ? error.message
          : String(error)
      );

      log("");

      log(
        "Kemungkinan:"
      );

      log(
        "1. CORS"
      );

      log(
        "2. Redirect CDN Hugging Face"
      );

      log(
        "3. Browser/network"
      );

      log(
        "4. Request diblokir"
      );

      log(
        "5. GitHub Pages → Hugging Face"
      );

      log("");

      log(
        "Catatan:"
      );

      log(
        "Download manual berhasil tidak"
      );

      log(
        "selalu berarti JavaScript fetch"
      );

      log(
        "juga diizinkan."
      );
    }
  }

  window.FidelisModelFetchTest = {
    run: runTest
  };

  /*
   * Auto-run.
   */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      runTest
    );
  } else {
    runTest();
  }
})();
