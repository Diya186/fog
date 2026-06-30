// ============================================================
//  camera.js  —  fogmirror
//  sets up the mirrored video stream
// ============================================================

/**
 * Initialise the camera stream into the given <video> element.
 * The CSS already handles the mirror flip via scaleX(-1).
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<MediaStream>}
 */
export async function initCamera(videoEl) {
  const constraints = {
    video: {
      facingMode: 'user',
      width:  { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    audio: false, // mic is handled separately in audio.js
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = stream;

    await new Promise((resolve, reject) => {
      videoEl.onloadedmetadata = resolve;
      videoEl.onerror = reject;
    });

    await videoEl.play();
    console.log('[camera] stream ready', stream.getVideoTracks()[0].label);
    return stream;

  } catch (err) {
    console.error('[camera] failed to get video stream:', err);
    throw err;
  }
}

/**
 * Stop all tracks on a stream cleanly.
 * @param {MediaStream} stream
 */
export function stopCamera(stream) {
  stream?.getTracks().forEach(t => t.stop());
}
