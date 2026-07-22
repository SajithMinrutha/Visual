import React, { useState, useEffect } from 'react';
import { Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from './utils/supabase';

const App = () => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        // Fetch from your real Supabase database
        const { data, error } = await supabase
          .from('images')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data) {
          setImages(data);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        toast.error('Failed to load gallery');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  const handleDownload = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started!');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <Toaster position="bottom-right" />
      
      <header className="max-w-7xl mx-auto mb-12 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"
        >
          Visuals.
        </motion.h1>
        <p className="text-zinc-400 text-lg">A collection of moments, captured in high definition.</p>
      </header>

      <main className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <p>Loading your gallery...</p>
          </div>
        ) : (
          <div className="masonry">
            {images.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                <p>No images found. Drop some photos into the /output folder!</p>
              </div>
            ) : (
              images.map((image) => (
                <motion.div
                  key={image.id}
                  layoutId={`image-${image.id}`}
                  className="masonry-item relative group cursor-pointer overflow-hidden rounded-2xl bg-zinc-900"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image.thumbnail_url}
                    alt={image.title}
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-full">
                      <ImageIcon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </motion.div>
              ))
            }
          </div>
        )}
      </main>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 md:p-10"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-5xl w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedImage.url} 
                alt={selectedImage.title} 
                className="max-h-[80vh] w-auto rounded-lg shadow-2xl"
              />
              <div className="mt-6 flex flex-col items-center gap-4">
                <h2 className="text-3xl font-bold">{selectedImage.title}</h2>
                <button 
                  onClick={() => handleDownload(selectedImage.url)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download High Quality
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
