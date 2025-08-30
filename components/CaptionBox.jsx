// components/CaptionBox.jsx
import { useState, useEffect } from 'react';
import "../css/CaptionBox.css";


export default function CaptionBox({ caption, setCaption }) {
  const handleChange = (e) => {
    const newCaption = e.target.value;
    setCaption(newCaption);
  };

  return (
    <div className="caption-input">
      <textarea
        value={caption}
        onChange={handleChange}
        placeholder="Type your caption here..."
        className="caption-textarea"
      />
    </div>
  );
}
