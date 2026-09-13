/*
 * LittleHollow AIManager replacement
 *
 * The new app/AIManager.html is fully self-contained:
 * - Transformers.js is loaded inside its inference worker.
 * - Model loading/inference/tool handling live in AIManager.html.
 *
 * This file intentionally contains no legacy ONNX inference implementation.
 * It remains here so a GitHub upload/replace operation also removes the
 * previous js/aiOnnx.js implementation at the same path.
 */
(() => {
  'use strict';

  if (typeof window !== 'undefined') {
    window.LittleHollowAI = window.LittleHollowAI || {};
    window.LittleHollowAI.aiOnnxReplaced = true;
  }
})();
