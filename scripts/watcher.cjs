require('dotenv').config();
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const { createClient } = require('@supabase/supabase-js');

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Supabase Config
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const OUTPUT_FOLDER = path.join(__dirname, '../output');

console.log(`Watching folder: ${OUTPUT_FOLDER}`);

const watcher = chokidar.watch(OUTPUT_FOLDER, {
  persistent: true,
  ignoreInitial: true,
});

watcher.on('add', async (filePath) => {
  const fileName = path.basename(filePath);
  if (['.DS_Store', 'thumbs.db'].includes(fileName)) return;

  console.log(`\n[New Image Detected]: ${fileName}`);

  try {
    // 1. Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(filePath, {
      folder: 'gallery',
    });

    console.log(`[Cloudinary Upload Success]: ${uploadResponse.secure_url}`);

    // 2. Generate a low-quality thumbnail URL automatically
    const thumbUrl = uploadResponse.secure_url.replace('/upload/', '/upload/w_400,c_fill,q_60/');

    // 3. Save to Supabase
    const { data, error } = await supabase
      .from('images')
      .insert([{
        title: fileName.replace(/\.[^/.]+$/, ""),
        url: uploadResponse.secure_url,
        thumbnail_url: thumbUrl
      }])
      .select();

    if (error) throw error;
    
    console.log(`[Supabase Database Success]: Image added to gallery.`);
    console.log('-----------------------------------------------------------');
  } catch (err) {
    console.error(`[Error] Failed to process ${fileName}:`, err);
  }
});

watcher.on('error', (error) => console.error(`Watcher error: ${error}`));
