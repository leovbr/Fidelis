(function () {
"use strict";

const MODEL_URL =
"https://huggingface.co/SceneWorks/real-esrgan-onnx/resolve/main/real_esrgan_x2.onnx?download=true";

const box = document.createElement("section");

box.id = "directOnnxTest";

box.style.cssText = "margin: 24px 0; padding: 20px; border: 1px solid rgba(167,139,250,.35); border-radius: 16px; background: #09090f; color: #e8e8f0; font-family: monospace; font-size: 13px; line-height: 1.6; overflow: hidden;";

box.innerHTML = `
<div style="
font-size:15px;
font-weight:700;
margin-bottom:12px;
color:#ffffff;
">
FIDELIS DIRECT ONNX TEST
</div>

<div id="directOnnxStatus" style="margin-bottom:12px;">
  ⏳ Waiting...
</div>

<pre id="directOnnxOutput" style="
  margin:0;
  white-space:pre-wrap;
  word-break:break-word;
  max-height:700px;
  overflow:auto;
"></pre>

<button id="directOnnxButton" type="button" style="
  margin-top:16px;
  padding:10px 14px;
  border:1px solid rgba(167,139,250,.5);
  border-radius:10px;
  background:#12121c;
  color:#ffffff;
  cursor:pointer;
  font-family:inherit;
">
  Run Direct ONNX Test Again
</button>

`;

function mount() {

const container =
  document.querySelector(".container") ||
  document.body;

const runtimeDiagnostic =
  document.getElementById("runtimeDiagnostic");

if (
  runtimeDiagnostic &&
  runtimeDiagnostic.parentNode
) {
  runtimeDiagnostic.insertAdjacentElement(
    "afterend",
    box
  );
} else {
  container.appendChild(box);
}

}

function log(message) {

const output =
  document.getElementById(
    "directOnnxOutput"
  );

if (output) {
  output.textContent +=
    message + "\n";
}

}

function status(message) {

const element =
  document.getElementById(
    "directOnnxStatus"
  );

if (element) {
  element.textContent = message;
}

}

function errorDetails(error) {

if (!error) {
  return "Unknown error";
}

let result = "";

result +=
  "NAME: " +
  (error.name || "UNKNOWN") +
  "\n";

result +=
  "MESSAGE:\n" +
  (error.message || String(error)) +
  "\n";

if (error.stack) {

  result +=
    "\nSTACK:\n" +
    error.stack +
    "\n";
}

return result;

}

async function runTest() {

const output =
  document.getElementById(
    "directOnnxOutput"
  );

if (output) {
  output.textContent = "";
}

status(
  "⏳ Running direct ONNX session test..."
);

log(
  "========================================"
);

log(
  "FIDELIS DIRECT ONNX TEST"
);

log(
  "========================================"
);

log("");

/* =========================================
   STEP 1 — Check ORT
   ========================================= */

log("[1] CHECK ONNX RUNTIME");

if (!window.ort) {

  log(
    "❌ window.ort NOT FOUND"
  );

  status(
    "❌ ONNX RUNTIME NOT FOUND"
  );

  return;
}

log(
  "window.ort: FOUND"
);

log(
  "ORT version: " +
  (
    window.ort.env &&
    window.ort.env.versions &&
    window.ort.env.versions.web
      ? window.ort.env.versions.web
      : "UNKNOWN"
  )
);

log(
  "InferenceSession: " +
  (
    typeof window.ort.InferenceSession ===
    "function"
      ? "AVAILABLE"
      : "MISSING"
  )
);

log(
  "Tensor: " +
  (
    typeof window.ort.Tensor ===
    "function"
      ? "AVAILABLE"
      : "MISSING"
  )
);

log("");

if (
  typeof window.ort.InferenceSession !==
  "function"
) {

  log(
    "❌ InferenceSession.create tidak tersedia."
  );

  status(
    "❌ INFERENCE SESSION UNAVAILABLE"
  );

  return;
}

/* =========================================
   STEP 2 — Check runtime
   ========================================= */

log("[2] CHECK FIDELIS RUNTIME");

if (window.FidelisRuntime) {

  log(
    "FidelisRuntime: FOUND"
  );

  try {

    if (
      typeof window.FidelisRuntime.getBackend ===
      "function"
    ) {

      log(
        "Backend: " +
        String(
          window.FidelisRuntime.getBackend()
        )
      );
    }

  } catch (_) {}

} else {

  log(
    "FidelisRuntime: NOT FOUND"
  );
}

log("");

/* =========================================
   STEP 3 — Fetch model
   ========================================= */

log("[3] FETCH MODEL");

log(
  "MODEL URL:"
);

log(
  MODEL_URL
);

log("");

let response;

try {

  const started =
    performance.now();

  response =
    await fetch(
      MODEL_URL,
      {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        redirect: "follow"
      }
    );

  const elapsed =
    (
      performance.now() -
      started
    ).toFixed(0);

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
    "TIME: " +
    elapsed +
    " ms"
  );

  log(
    "FINAL URL:"
  );

  log(
    response.url
  );

  log("");

  if (!response.ok) {

    throw new Error(
      "Model HTTP error: " +
      response.status
    );
  }

} catch (error) {

  log(
    "❌ MODEL FETCH FAILED"
  );

  log("");

  log(
    errorDetails(error)
  );

  status(
    "❌ MODEL FETCH FAILED"
  );

  return;
}

/* =========================================
   STEP 4 — Read ArrayBuffer
   ========================================= */

log("[4] READ MODEL ARRAYBUFFER");

let modelData;

try {

  const started =
    performance.now();

  modelData =
    await response.arrayBuffer();

  const elapsed =
    (
      performance.now() -
      started
    ).toFixed(0);

  log(
    "ARRAYBUFFER: SUCCESS"
  );

  log(
    "BYTES: " +
    modelData.byteLength
  );

  log(
    "SIZE: " +
    (
      modelData.byteLength /
      1024 /
      1024
    ).toFixed(2) +
    " MB"
  );

  log(
    "READ TIME: " +
    elapsed +
    " ms"
  );

  log("");

} catch (error) {

  log(
    "❌ ARRAYBUFFER FAILED"
  );

  log("");

  log(
    errorDetails(error)
  );

  status(
    "❌ ARRAYBUFFER FAILED"
  );

  return;
}

/* =========================================
   STEP 5 — Validate model
   ========================================= */

log("[5] MODEL VALIDATION");

if (
  !modelData ||
  !modelData.byteLength
) {

  log(
    "❌ Model data kosong."
  );

  status(
    "❌ EMPTY MODEL DATA"
  );

  return;
}

if (
  modelData.byteLength <
  1024
) {

  log(
    "❌ Model terlalu kecil."
  );

  status(
    "❌ INVALID MODEL SIZE"
  );

  return;
}

log(
  "Model data: VALID"
);

log(
  "Model bytes: " +
  modelData.byteLength
);

log("");

/* =========================================
   STEP 6 — Create ONNX Session
   ========================================= */

log(
  "[6] CREATE ONNX INFERENCE SESSION"
);

log(
  "Attempting:"
);

log(
  "ort.InferenceSession.create(modelData)"
);

log("");

let session;

try {

  const started =
    performance.now();

  session =
    await window.ort.InferenceSession.create(
      modelData,
      {
        executionProviders: [
          "webgpu"
        ],
        graphOptimizationLevel:
          "all"
      }
    );

  const elapsed =
    (
      performance.now() -
      started
    ).toFixed(0);

  log(
    "🎉 SESSION CREATE SUCCESS"
  );

  log(
    "TIME: " +
    elapsed +
    " ms"
  );

  log("");

} catch (error) {

  log(
    "========================================"
  );

  log(
    "❌ SESSION CREATE FAILED"
  );

  log(
    "========================================"
  );

  log("");

  log(
    errorDetails(error)
  );

  log("");

  log(
    "IMPORTANT:"
  );

  log(
    "Model berhasil didownload."
  );

  log(
    "ArrayBuffer berhasil dibuat."
  );

  log(
    "Kegagalan terjadi saat ONNX Runtime"
  );

  log(
    "membuka / membuat InferenceSession."
  );

  status(
    "❌ ONNX SESSION CREATE FAILED"
  );

  return;
}

/* =========================================
   STEP 7 — Inspect session
   ========================================= */

log(
  "[7] SESSION INFORMATION"
);

try {

  log(
    "Input names:"
  );

  log(
    JSON.stringify(
      session.inputNames || [],
      null,
      2
    )
  );

  log("");

  log(
    "Output names:"
  );

  log(
    JSON.stringify(
      session.outputNames || [],
      null,
      2
    )
  );

} catch (error) {

  log(
    "Session inspection error:"
  );

  log(
    errorDetails(error)
  );
}

log("");

/* =========================================
   FINAL
   ========================================= */

log(
  "========================================"
);

log(
  "RESULT: SUCCESS ✅"
);

log(
  "========================================"
);

log("");

log(
  "✓ Model downloaded"
);

log(
  "✓ ArrayBuffer created"
);

log(
  "✓ ONNX Runtime accepted model"
);

log(
  "✓ InferenceSession created"
);

log(
  "✓ WebGPU execution provider initialized"
);

log("");

log(
  "NEXT TARGET:"
);

log(
  "Tensor input → session.run() → output"
);

status(
  "✅ DIRECT ONNX SESSION BERHASIL"
);

/*
  Simpan session hanya untuk diagnostic.
  Tidak menggantikan session FIDELIS utama.
*/

window.FidelisDirectONNXSession =
  session;

}

window.FidelisDirectONNXTest = {
run: runTest
};

function start() {

mount();

const button =
  document.getElementById(
    "directOnnxButton"
  );

if (button) {

  button.addEventListener(
    "click",
    function () {

      runTest();

    }
  );
}

/*
  Beri waktu ai-runtime.js untuk
  menyelesaikan initialization.
*/

setTimeout(
  function () {

    if (window.ort) {
      runTest();
    } else if (
      window.FidelisRuntime &&
      typeof window.FidelisRuntime.init ===
      "function"
    ) {

      window.FidelisRuntime
        .init()
        .then(function () {
          return runTest();
        })
        .catch(function (error) {

          status(
            "❌ RUNTIME INIT FAILED"
          );

          log("");
          log(
            errorDetails(error)
          );

        });

    } else {

      status(
        "❌ ONNX RUNTIME NOT READY"
      );

      log(
        "ONNX Runtime belum tersedia."
      );

    }

  },
  1500
);

}

if (
document.readyState ===
"loading"
) {

document.addEventListener(
  "DOMContentLoaded",
  start,
  { once: true }
);

} else {

start();

}

})();
