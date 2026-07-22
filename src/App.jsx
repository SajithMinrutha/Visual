import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  Menu,
  Shrink,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "./utils/supabase";

const App = () => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid', 'compact', 'list'

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("images")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          setImages(data);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
        toast.error("Failed to load gallery");
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;

    try {
      const { error } = await supabase.from("images").delete().eq("id", id);

      if (error) throw error;

      setImages((prev) => prev.filter((img) => img.id !== id));
      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  /**
   * Converts CDN preview & thumbnail URLs to uncompressed, raw original files
   */
  const getOriginalQualityUrl = (rawUrl) => {
    if (!rawUrl) return "";
    let url = rawUrl;

    // 1. Zedge CDN: Remove path-based crop boundaries (/crop/10/250/250/0/ -> /image/)
    url = url.replace(/\/crop\/\d+\/\d+\/\d+\/\d+\//i, "/image/");
    url = url.replace(/\/crop\/\d+\/\d+\//i, "/image/");

    // 2. Supabase Storage: Bypass image optimization worker, fetch raw object
    url = url.replace(
      "/storage/v1/render/image/public/",
      "/storage/v1/object/public/",
    );

    // 3. Cloudinary: Remove scaling / downsampling parameters
    url = url
      .replace(/\/c_scale,[^/]+\//i, "/")
      .replace(/\/w_\d+[^/]*\//i, "/");

    // 4. Strip CDN URL Query Parameters (Unsplash, Imgix, etc.)
    try {
      const urlObj = new URL(url);
      const paramsToClear = [
        "w",
        "h",
        "width",
        "height",
        "quality",
        "q",
        "fit",
        "crop",
        "resize",
        "auto",
        "dpr",
      ];
      paramsToClear.forEach((param) => urlObj.searchParams.delete(param));
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  // High-Resolution Download Engine
  const handleDownload = async (image) => {
    if (!image) return;

    const rawTargetUrl =
      image.original_url ||
      image.hd_url ||
      image.full_url ||
      image.url ||
      image.thumbnail_url;
    if (!rawTargetUrl) {
      toast.error("Download URL not found");
      return;
    }

    const toastId = toast.loading("Extracting uncompressed original file...");

    try {
      // Get uncompressed CDN source URL
      const highResUrl = getOriginalQualityUrl(rawTargetUrl);

      // Fetch with cache bypass to prevent getting browser's scaled preview cache
      let response = await fetch(highResUrl, { cache: "reload" });

      // Fallback if transformed URL isn't directly reachable
      if (!response.ok) {
        response = await fetch(rawTargetUrl, { cache: "reload" });
      }

      if (!response.ok)
        throw new Error("Failed to fetch high-res image source");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const cleanTitle = image.title
        ? image.title.toLowerCase().replace(/[^a-z0-9]/g, "_")
        : "wallpaper";
      const fileName = `${cleanTitle}_original_${Date.now()}.jpg`;

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success("Original high-quality download complete!", {
        id: toastId,
      });
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: Open full resolution image directly in new tab
      window.open(getOriginalQualityUrl(rawTargetUrl), "_blank");
      toast.success("Opened original asset in new tab", { id: toastId });
    }
  };

  // Fallback handler if thumbnail image link fails to load
  const handleImageError = (e, fallbackUrl) => {
    if (fallbackUrl && e.target.src !== fallbackUrl) {
      e.target.src = fallbackUrl;
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
                <span className="font-bold text-white">D</span>
              </div>
              <span className="text-xl font-bold tracking-tight">
                Duffer Wallpapers
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a
                href="#"
                className="text-sm font-medium hover:text-blue-400 transition-colors"
              >
                Gallery
              </a>
              <a
                href="#"
                className="text-sm font-medium hover:text-blue-400 transition-colors"
              >
                About
              </a>
              <a
                href="#"
                className="text-sm font-medium hover:text-blue-400 transition-colors"
              >
                Contact
              </a>
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
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#09090b] border-b border-zinc-800 overflow-hidden"
            >
              <div className="flex flex-col gap-4 p-4">
                <a href="#" className="text-sm font-medium">
                  Gallery
                </a>
                <a href="#" className="text-sm font-medium">
                  About
                </a>
                <a href="#" className="text-sm font-medium">
                  Contact
                </a>
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
            Premium Wallpapers
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto"
          >
            Explore our curated collection of high-definition wallpapers,
            capturing moments from around the globe in stunning detail.
          </motion.p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-white"}`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={`p-2 rounded-lg transition-all ${viewMode === "compact" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-white"}`}
              title="Compact View"
            >
              <Shrink className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-white"}`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <p className="text-zinc-500 text-sm">Showing {images.length} items</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <p className="text-zinc-500">Curating your experience...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {images.length === 0 ? (
              <div className="text-center py-40">
                <div className="bg-zinc-900 p-12 rounded-3xl border border-zinc-800 max-w-md mx-auto">
                  <ImageIcon className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-400">
                    No images found in the gallery.
                  </p>
                </div>
              </div>
            ) : (
              images.map((image) => (
                <motion.div
                  key={image.id}
                  layoutId={`image-${image.id}`}
                  className={`relative group overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800/50 cursor-pointer ${
                    viewMode === "grid"
                      ? "col-span-1"
                      : viewMode === "compact"
                        ? "col-span-1 md:col-span-2"
                        : "col-span-full flex flex-col md:flex-row"
                  }`}
                  onClick={() => setSelectedImage(image)}
                >
                  {viewMode === "grid" && (
                    <img
                      src={image.thumbnail_url || image.url}
                      alt={image.title || "Wallpaper"}
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => handleImageError(e, image.url)}
                    />
                  )}
                  {viewMode === "compact" && (
                    <div className="flex flex-col md:flex-row w-full">
                      <img
                        src={image.thumbnail_url || image.url}
                        alt={image.title || "Wallpaper"}
                        className="w-full md:w-2/3 h-48 md:h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => handleImageError(e, image.url)}
                      />
                      <div className="p-4 flex flex-col justify-center flex-1">
                        <p className="text-white font-medium">{image.title}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs text-zinc-300 bg-white/10 backdrop-blur-md px-2 py-1 rounded">
                            HD
                          </span>
                          <span className="text-xs text-zinc-300 bg-white/10 backdrop-blur-md px-2 py-1 rounded">
                            Raw
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {viewMode === "list" && (
                    <div className="flex flex-col md:flex-row w-full p-4 items-center gap-6">
                      <img
                        src={image.thumbnail_url || image.url}
                        alt={image.title || "Wallpaper"}
                        className="w-full md:w-1/4 h-32 object-cover rounded-xl transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => handleImageError(e, image.url)}
                      />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{image.title}</h3>
                        <p className="text-zinc-400 text-sm">
                          High definition wallpaper asset
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(image);
                          }}
                          className="text-zinc-400 hover:text-white p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                          title="Download Original Quality"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hover Overlay for Grid & Compact */}
                  {viewMode !== "list" && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">
                            {image.title}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-zinc-300 bg-white/10 backdrop-blur-md px-2 py-1 rounded">
                              HD
                            </span>
                            <span className="text-xs text-zinc-300 bg-white/10 backdrop-blur-md px-2 py-1 rounded">
                              Raw
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(image);
                            }}
                            className="bg-white/20 hover:bg-white text-white hover:text-black p-2 rounded-full transition-colors"
                            title="Download Original Quality"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(image.id);
                            }}
                            className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-full transition-colors"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
                  src={getOriginalQualityUrl(
                    selectedImage.original_url ||
                      selectedImage.hd_url ||
                      selectedImage.url ||
                      selectedImage.thumbnail_url,
                  )}
                  alt={selectedImage.title}
                  className="max-h-[85vh] w-full object-contain rounded-xl shadow-2xl"
                  onError={(e) =>
                    handleImageError(e, selectedImage.thumbnail_url)
                  }
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
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">
                    {selectedImage.title}
                  </h2>
                  <p className="text-zinc-400">
                    Full Uncompressed Resolution Gallery Asset
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleDownload(selectedImage)}
                    className="flex items-center gap-3 bg-white text-black hover:bg-zinc-200 px-10 py-4 rounded-full font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    <Download className="w-5 h-5" />
                    Download Full Original Quality
                  </button>
                  <button
                    onClick={() => handleDelete(selectedImage.id)}
                    className="flex items-center gap-3 bg-red-600 text-white hover:bg-red-700 px-10 py-4 rounded-full font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Asset
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
              <span className="text-xs font-bold">D</span>
            </div>
            <span className="font-bold">Duffer Wallpapers</span>
          </div>
          <p className="text-zinc-500 text-sm">
            © 2026 Duffer Wallpapers. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-zinc-500 hover:text-white transition-colors"
            >
              Twitter
            </a>
            <a
              href="#"
              className="text-zinc-500 hover:text-white transition-colors"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
