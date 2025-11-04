import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import "../css/Dropzone.css";
import sunsetLogo from "../assets/sunset-logo.png";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import sunsetThumbnail from "../assets/sunset_uploader-template.png";

export default function Dropzone({ video, setVideo, caption }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const f = acceptedFiles[0];
        const absPath = f.path || null;
        const videoObj = { file: f, name: f.name, path: absPath };
        setVideo(videoObj);

        if (window.electronAPI && absPath) {
          window.electronAPI.storeFilePath(f.name, absPath);
        } else {
          console.warn(`No absolute path available for ${f.name}`);
        }
      }
    },
    [setVideo]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
  });

  const handleClick = async () => {
    if (window.electronAPI?.openFileDialog) {
      const result = await window.electronAPI.openFileDialog();
      if (result) setVideo(result);
    } else {
      open();
    }
  };

  return (
    <div {...getRootProps()} className="dropzone" onClick={handleClick}>
      <input {...getInputProps()} />
      {video ? (
        <div className="video-preview">
          {/* Use static thumbnail instead of video element */}
          <img
            src={sunsetThumbnail}
            alt="Video Thumbnail"
            className="video-thumbnail"
          />

          {caption && <div className="caption-overlay">{caption}</div>}

          <div className="engagement-icons">
            <div className="engagement-item">
              <Heart size={32} strokeWidth={2} />
              <span>1K</span>
            </div>
            <div className="engagement-item">
              <MessageCircle size={32} strokeWidth={2} />
              <span>45</span>
            </div>
            <div className="engagement-item">
              <Share2 size={32} strokeWidth={2} />
              <span>7</span>
            </div>
          </div>

          <div className="profile-pic">
            <img src={sunsetLogo} alt="Sunset Uploader" />
          </div>

          <div className="music-ticker">🎵 Song - Artist</div>
        </div>
      ) : (
        <p>
          {isDragActive
            ? "Drop the short here..."
            : "Drag & drop your short here, or click to select"}
        </p>
      )}
    </div>
  );
}
