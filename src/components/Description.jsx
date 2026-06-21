// components/Description.jsx
import { useState, useEffect } from 'react';
import "../css/CaptionBox.css";

export default function Description({ description, setDescription }) {
  const handleChange = (e) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
  };

  return (
    <div className="caption-input description-input">
      <textarea
        value={description}
        onChange={handleChange}
        placeholder="Type your YouTube description here..."
        className="caption-textarea"
      />
    </div>
  );
}
