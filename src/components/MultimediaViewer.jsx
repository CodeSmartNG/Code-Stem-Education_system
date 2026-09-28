import React, { useState } from 'react';
import './MultimediaViewer.css';

// ✅ Backend base URL for media
const BACKEND_URL = 'https://code-stem-education-system.onrender.com';

const MultimediaViewer = ({ multimedia }) => {
  const [currentMedia, setCurrentMedia] = useState(0);

  if (!multimedia || multimedia.length === 0) return null;

  const media = multimedia[currentMedia];

  // ✅ Build full URL
  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;              // already absolute
    if (url.startsWith('/uploads')) return `${BACKEND_URL}${url}`;  // relative
    return url;
  };

  const mediaUrl = getFullUrl(media.url);

  return (
    <div className="multimedia-viewer">
      <h3>Learning Material</h3>

      {multimedia.length > 1 && (
        <div className="media-navigation">
          {multimedia.map((_, index) => (
            <button
              key={index}
              className={`nav-dot ${currentMedia === index ? 'active' : ''}`}
              onClick={() => setCurrentMedia(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}

      <div className="media-content">
        {media.type === 'video' ? (
          <div className="video-container">
            <video
              controls
              width="100%"
              style={{ maxHeight: '500px', background: '#000' }}
            >
              <source src={mediaUrl} type={media.fileType || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : media.type === 'image' ? (
          <div className="image-container">
            <img src={mediaUrl} alt={media.title} style={{ maxWidth: '100%' }} />
          </div>
        ) : media.type === 'audio' ? (
          <div className="audio-container">
            <audio controls style={{ width: '100%' }}>
              <source src={mediaUrl} type={media.fileType || 'audio/mpeg'} />
              Your browser does not support the audio tag.
            </audio>
          </div>
        ) : (
          <div className="document-container">
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
              📄 {media.title || 'Open Document'}
            </a>
          </div>
        )}

        <div className="media-info">
          <h4>{media.title}</h4>
          <p>{media.description}</p>
        </div>
      </div>
    </div>
  );
};

export default MultimediaViewer;
