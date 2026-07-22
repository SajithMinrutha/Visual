import React, { useState, useEffect } from 'react';
import { Download, Image as ImageIcon, Loader2, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from './utils/supabase';

const App = () => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
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

  const handleDownload = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `photo_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-blue-500/30">
      <Toaster position="bottom-right" />
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="font-bold text-white">L</span>
              </div>
              <span className="text-xl font-bold tracking-tight">LensStudio</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-sm font-medium hover:text-blue-400 transition-colors">Gallery</a>
              <a href="#" className="text-sm font-medium hover:text-blue-400 transition-colors">About</a>
              <a href="#" className="text-sm font-medium hover:text-blue-400 transition-colors">Contact</a>
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#09090b] border-b border-zinc-800 overflow-hidden"
            >
              <div className="flex flex-col gap-4 p-4">
                <a href="#" className="text-sm font-medium">Gallery</a>
                <a href="#" className="text-sm font-medium">About</a>
                <a href="#" className="text-sm font-medium">Contact</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <header className="pt-32 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500"
          >
            Capture the Essence
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto"
          >
            Explore our curated collection of high-definition photography, capturing moments from around the globe in stunning detail.
          </motion.p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <p className="text-zinc-500">Curating your experience...</p>
          </div>
        ) : (
          <div className="masonry">
            {images.length === 0 ? (
              <div className="text-center py-40">
                <div className="bg-zinc-900 p-12 rounded-3xl border border-zinc-800 max-w-md mx-auto">
                  <ImageIcon className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-400">No images found in the gallery.</p>
                </div>
              </div>
            ) : (
              images.map((image) => (
                <motion.div
                  key={image.id}
                  layoutId={`image-${image.id}`}
                  className="masonry-item relative group cursor-pointer overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800/50"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image.thumbnail_url}
                    alt={image.title}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <p className="text-white font-medium">{image.title}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs text-zinc-300 bg-white/10 backdrop-blur-md px-2 py-1 rounded">HD</span>
                      <span className="text-xs text-zinc-300 bg-white/10 backdrop-blur-md px-2 py-1 rounded">Raw</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
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
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 md:p-10 backdrop-blur-xl"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-6xl w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={selectedImage.url} 
                  alt={selectedImage.title} 
                  className="max-h-[85vh] w-full object-contain rounded-xl shadow-2xl"
                />
                <button 
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="w-10 h-10" />
                </button>
              </div>
              
              <div className="mt-8 flex flex-col items-center gap-6">
                <div className="text-center">
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">{selectedImage.title}</h2>
                  <p className="text-zinc-400">Full Resolution Gallery Asset</p>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleDownload(selectedImage.url)}
                    className="flex items-center gap-3 bg-white text-black hover:bg-zinc-200 px-10 py-4 rounded-full font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    <Download className="w-5 h-5" />
                    Download Full Resolution
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-zinc-900 py-12 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center">
              <span className="text-xs font-bold">L</span>
            </div>
            <span className="font-bold">LensStudio</span>
          </div>
          <p className="text-zinc-500 text-sm">© 2026 LensStudio. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">Twitter</a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
