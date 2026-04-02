import { useState } from "react";
import { getUploadUrl, uploadFileToR2 } from "../services/api";
import "../css/UploadButton.css";

export default function UploadButton({ video, caption, platforms, setLogs }) {
  const [isRunning, setIsRunning] = useState(false);

  const openNativeFilePicker = async () => {
    alert(
      "If the app can't resolve the full path, re-drop the file or restart the app (packaged mode will have full paths)."
    );
  };

  const handleUpload = async () => {
    if (!video || !caption || platforms.length === 0) {
      alert("Please select a video, write a caption, and choose platforms.");
      return;
    }

    // ----------------------------
    // Resolve absolute video path
    // ----------------------------
    let videoPath = video.path || video.fullPath || null;

    const looksRelative = (p) =>
      !p || (!p.includes("/") && !p.includes("\\") && !p.includes(":"));

    if (looksRelative(videoPath) && window.electronAPI?.getFilePath) {
      try {
        const resolved = await window.electronAPI.getFilePath(
          video.name || video.file?.name
        );
        if (resolved) videoPath = resolved;
      } catch (err) {
        console.error("Error calling getFilePath:", err);
      }
    }

    if (!videoPath) {
      await openNativeFilePicker();
      return;
    }

    console.log("Video path passed to python:", videoPath);

    setLogs([]);
    setIsRunning(true);

    // ============================
    // ELECTRON WORKFLOW
    // ============================
    if (window.electronAPI) {
      // 1️ Get signals directory from Electron
      let signalsDir = null;
      try {
        if (window.electronAPI.getSignalsDir) {
          signalsDir = await window.electronAPI.getSignalsDir();
          console.log("Signals dir:", signalsDir);
        }
      } catch (e) {
        console.error("Failed to get signals dir:", e);
      }

      // 2️ Send signal path to Chrome extension
      if (signalsDir && window.chrome?.runtime?.sendMessage) {
        window.chrome.runtime.sendMessage({
          type: "SET_SIGNAL_PATH",
          path: signalsDir,
        });
      }

      // 3️ Stream Python logs
      window.electronAPI.onPythonLog((line) => {
        setLogs((prev) => [...prev, line]);
      });

      // 4️ Run Python uploader
      try {
        const platformArgs =
          platforms.length > 0 ? ["--platforms", ...platforms] : [];

        await window.electronAPI.runPythonUploader([
          "--caption",
          caption,
          "--video",
          videoPath,
          ...platformArgs,
        ]);
      } catch (err) {
        setLogs((prev) => [...prev, `Error: ${err.message || err}`]);
      } finally {
        setIsRunning(false);
      }

      return;
    }

    // ============================
    // WEB WORKFLOW (R2 UPLOAD)
    // ============================
    try {
      setLogs((prev) => [...prev, "Requesting upload URL..."]);
      const { upload_url, public_url } = await getUploadUrl(video.name);

      setLogs((prev) => [...prev, "Uploading to R2..."]);
      await uploadFileToR2(upload_url, video);

      setLogs((prev) => [
        ...prev,
        `Upload successful! File accessible at: ${public_url}`,
      ]);
    } catch (err) {
      setLogs((prev) => [...prev, `Error: ${err.message || err}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    if (window.electronAPI) {
      const msg = await window.electronAPI.stopPythonUploader();
      setLogs((prev) => [...prev, msg]);
    }
    setIsRunning(false);
  };

  return (
    <div className="upload-button-container">
      {!isRunning ? (
        <button className="upload-button" onClick={handleUpload}>
          Start Upload
        </button>
      ) : (
        <button className="stop-button" onClick={handleStop}>
          Stop Upload
        </button>
      )}
    </div>
  );
}
