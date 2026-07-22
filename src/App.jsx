import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Loader2,
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
  const [viewMode, setViewMode] = useState("grid"); // 'grid', 'compact', 'list'

  // Fetch images & set up Realtime auto-update
  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("images")
          .select("*")
          .order("created_at", { ascending: false, nullsFirst: false })
          .order("id", { ascending: false });

        if (error) throw error;
        if (data) setImages(data);
      } catch (error) {
        console.error("Error fetching images:", error);
        toast.error("Failed to load gallery");
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();

    // Supabase Realtime Subscription for automatic updates
    const channel = supabase
      .channel("public:images")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "images" },
        (payload) => {
          setImages((prevImages) => [payload.new, ...prevImages]);
          toast.success("New wallpaper added!");
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "images" },
        (payload) => {
          setImages((prevImages) =>
            prevImages.filter((img) => img.id !== payload.old.id),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Smooth scroll functions
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  // Fixed delete function
  const handleDelete = async (e, id) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    if (!window.confirm("Are you sure you want to delete this image?")) return;

    const toastId = toast.loading("Deleting image...");

    try {
      const { error, count } = await supabase
        .from("images")
        .delete({ count: "exact" })
        .eq("id", id);

      if (error) throw error;

      if (count === 0) {
        toast.error("No record was found matching that ID.", { id: toastId });
        return;
      }

      setImages((prev) => prev.filter((img) => img.id !== id));

      if (selectedImage?.id === id) {
        setSelectedImage(null);
      }

      toast.success("Image deleted successfully", { id: toastId });
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error(`Delete failed: ${error.message || "Unknown error"}`, {
        id: toastId,
      });
    }
  };

  // Convert raw URLs into lightweight 450px preview images
  const getLowResPreviewUrl = (rawUrl) => {
    if (!rawUrl) return "";
    let url = rawUrl;
    if (url.includes("/storage/v1/object/public/")) {
      return (
        url.replace(
          "/storage/v1/object/public/",
          "/storage/v1/render/image/public/",
        ) + "?width=400&quality=50&resize=contain"
      );
    }
    if (url.includes("res.cloudinary.com") && !url.includes("/w_")) {
      return url.replace("/upload/", "/upload/w_450,q_auto:low,f_auto/");
    }
    if (url.includes("zedge") && !url.includes("/crop/")) {
      url = url.replace("/image/", "/crop/10/250/250/0/");
    }
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set("w", "450");
      urlObj.searchParams.set("q", "50");
      urlObj.searchParams.set("auto", "format");
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  // Get full resolution asset (used strictly in Lightbox & Downloads)
  const getOriginalQualityUrl = (rawUrl) => {
    if (!rawUrl) return "";
    let url = rawUrl;
    url = url.replace(/\/crop\/\d+\/\d+\/\d+\/\d+\//i, "/image/");
    url = url.replace(/\/crop\/\d+\/\d+\//i, "/image/");
    url = url.replace(
      "/storage/v1/render/image/public/",
      "/storage/v1/object/public/",
    );
    url = url
      .replace(/\/c_scale,[^/]+\//i, "/")
      .replace(/\/w_\d+[^/]*\//i, "/");
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
      const highResUrl = getOriginalQualityUrl(rawTargetUrl);
      let response = await fetch(highResUrl, { cache: "reload" });
      if (!response.ok)
        response = await fetch(rawTargetUrl, { cache: "reload" });
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
      window.open(getOriginalQualityUrl(rawTargetUrl), "_blank");
      toast.success("Opened original asset in new tab", { id: toastId });
    }
  };

  // Fallback handler that ensures we stay on low-resolution previews on the grid
  const handleImageError = (e, fallbackUrl) => {
    const lowResFallback = getLowResPreviewUrl(fallbackUrl);
    if (fallbackUrl && e.target.src !== lowResFallback) {
      e.target.src = lowResFallback;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-blue-500/30 font-sans">
      <Toaster position="bottom-right" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
              <span className="text-xl font-bold tracking-tight">
                Duffer Wallpapers
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTop();
                }}
                className="text-sm font-medium text-white hover:text-blue-400 transition-colors cursor-pointer"
              >
                Gallery
              </a>
            </div>
          </div>
        </div>
      </nav>

      <header className="pt-32 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-white"
          >
            Premium Wallpapers
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Explore our curated collection of high-definition wallpapers,
            capturing moments from around the globe in stunning detail.
          </motion.p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 w-fit">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-white"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === "compact"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-white"
              }`}
              title="Compact View"
            >
              <Shrink className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-white"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <p className="text-zinc-500 text-sm font-medium">
            Showing {images.length} items
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="text-zinc-500 text-sm font-medium">
              Curating your experience...
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                : viewMode === "compact"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 max-w-4xl mx-auto"
            }`}
          >
            {images.length === 0 ? (
              <div className="col-span-full text-center py-40">
                <div className="bg-zinc-900/50 p-12 rounded-3xl border border-zinc-800/50 max-w-md mx-auto">
                  <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-400 font-medium">
                    No images found in the gallery.
                  </p>
                </div>
              </div>
            ) : (
              images.map((image) => (
                <motion.div
                  key={image.id}
                  layoutId={`image-${image.id}`}
                  onClick={() => setSelectedImage(image)}
                  className={`relative group overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/50 cursor-pointer transition-all hover:border-zinc-700 ${
                    viewMode === "list"
                      ? "flex flex-col sm:flex-row items-center p-3 gap-6"
                      : ""
                  }`}
                >
                  {/* GRID VIEW */}
                  {viewMode === "grid" && (
                    <div className="aspect-[4/5] w-full overflow-hidden">
                      <img
                        src={getLowResPreviewUrl(
                          image.thumbnail_url || image.url,
                        )}
                        alt={image.title || "Wallpaper"}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => handleImageError(e, image.url)}
                      />
                    </div>
                  )}

                  {/* COMPACT VIEW */}
                  {viewMode === "compact" && (
                    <div className="flex flex-col h-full">
                      <div className="aspect-video w-full overflow-hidden border-b border-zinc-800/50">
                        <img
                          src={getLowResPreviewUrl(
                            image.thumbnail_url || image.url,
                          )}
                          alt={image.title || "Wallpaper"}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => handleImageError(e, image.url)}
                        />
                      </div>
                      <div className="p-4 flex flex-col flex-1 bg-zinc-900/50">
                        <p className="text-white font-medium truncate">
                          {image.title || "Untitled Asset"}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md">
                            HD
                          </span>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md">
                            Raw
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LIST VIEW */}
                  {viewMode === "list" && (
                    <>
                      <div className="w-full sm:w-48 aspect-video overflow-hidden rounded-xl shrink-0">
                        <img
                          src={getLowResPreviewUrl(
                            image.thumbnail_url || image.url,
                          )}
                          alt={image.title || "Wallpaper"}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => handleImageError(e, image.url)}
                        />
                      </div>
                      <div className="flex-1 min-w-0 w-full sm:w-auto text-center sm:text-left">
                        <h3 className="text-lg font-bold text-white truncate">
                          {image.title || "Untitled Asset"}
                        </h3>
                        <p className="text-zinc-500 text-sm mt-1">
                          High definition wallpaper asset
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(image);
                          }}
                          className="text-zinc-400 hover:text-white p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-700 transition-colors"
                          title="Download Original Quality"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, image.id)}
                          className="text-zinc-400 hover:text-red-500 p-3 rounded-xl bg-zinc-800/50 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  )}

                  {/* HOVER OVERLAY (Grid & Compact) */}
                  {viewMode !== "list" && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5">
                      <div className="flex justify-between items-end translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="text-white font-medium truncate mb-2">
                            {image.title || "Untitled"}
                          </p>
                          <div className="flex gap-2">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400 bg-blue-400/20 backdrop-blur-md px-2 py-1 rounded-md">
                              HD
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(image);
                            }}
                            className="bg-white/10 hover:bg-white text-white hover:text-black p-2.5 rounded-full backdrop-blur-md transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, image.id)}
                            className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2.5 rounded-full backdrop-blur-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Floating Scroll Controls */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-2">
        <button
          onClick={scrollToTop}
          className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white p-3 rounded-full border border-zinc-800/80 backdrop-blur-md shadow-lg transition-all active:scale-95"
          title="Scroll to Top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={scrollToBottom}
          className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white p-3 rounded-full border border-zinc-800/80 backdrop-blur-md shadow-lg transition-all active:scale-95"
          title="Scroll to Bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Lightbox Overlay (Only here does full original quality load) */}
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
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="max-w-6xl w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full flex items-center justify-center">
                <img
                  src={getOriginalQualityUrl(
                    selectedImage.original_url ||
                      selectedImage.hd_url ||
                      selectedImage.url ||
                      selectedImage.thumbnail_url,
                  )}
                  alt={selectedImage.title}
                  className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
                  onError={(e) =>
                    handleImageError(e, selectedImage.thumbnail_url)
                  }
                />
                <button
                  className="absolute -top-12 right-0 md:top-0 md:-right-16 text-zinc-500 hover:text-white bg-zinc-900 md:bg-transparent p-2 rounded-full transition-colors"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="mt-8 flex flex-col items-center gap-6 w-full max-w-2xl text-center">
                <div>
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">
                    {selectedImage.title || "Untitled Asset"}
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Full Uncompressed Resolution Gallery Asset
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4 w-full">
                  <button
                    onClick={() => handleDownload(selectedImage)}
                    className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-white text-black hover:bg-zinc-200 px-8 py-3.5 rounded-full font-semibold transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    <Download className="w-5 h-5" />
                    Download Original
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, selectedImage.id)}
                    className="flex-none flex justify-center items-center gap-2 bg-zinc-900 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-8 py-3.5 rounded-full font-semibold transition-all duration-200 active:scale-95"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-zinc-800/50 py-8 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-sm text-white">
              Duffer Wallpapers
            </span>
          </div>
          <p className="text-zinc-500 text-sm">
            © 2026 Duffer Wallpapers. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-zinc-500 text-sm hover:text-white transition-colors"
            >
              Twitter
            </a>
            <a
              href="#"
              className="text-zinc-500 text-sm hover:text-white transition-colors"
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
