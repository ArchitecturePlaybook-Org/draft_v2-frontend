import React, { useEffect } from 'react';

interface ImageLightboxProps {
  imageUrl: string;
  onClose: () => void;
  altText?: string;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ imageUrl, onClose, altText = "Image preview" }) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent scrolling on body when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl shadow-lg backdrop-blur-sm transition-all"
        title="Close (Escape)"
      >
        ✕
      </button>
      
      <div 
        className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center animate-scale-in"
        onClick={(e) => e.stopPropagation()} // Prevent clicks on the image from closing
      >
        <img 
          src={imageUrl} 
          alt={altText} 
          className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
        />
      </div>
    </div>
  );
};
