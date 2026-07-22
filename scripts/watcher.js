import dotenv from 'dotenv';
import chokidar from 'chokidar';
import cloudinary from 'cloudinary';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OUTPUT_FOLDER = path.join(process.cwd(), 'output');

console.log(`Watching folder: ${OUTPUT_FOLDER}...`);

const watcher = chokidar.watch(OUTPUT_FOLDER, {
  persistent: true,
  ignoreInitial: true,
});

watcher.on('add', async (filePath) => {
  console.log(`New file detected: ${filePath}`);

  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    console.log(`Skipping non-image file: ${filePath}`);
    return;
  }

  try {
    const fileName = path.basename(filePath);
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'gallery',
      public_id: fileName.replace(/\.[^/.]+$/, ""),
    });

    const { public_id, secure_url } = result;

    // Construct URLs
    // Thumbnail: 400px wide, quality 60, centered fill
    const thumbnailUrl = result.secure_url.replace(
      /\/(upload\/\w+\/)(.*)\/(.*)\./,
      `/$1w_400,c_fill,q_60/$2/$3`
    );

    // Insert into Supabase
    const { data, error } = await supabase
      .from('images')
      .insert([
        {
          title: fileName.split('.')[0].replace(/[-_]/g, ' '),
          url: secure_url,
          thumbnail_url: thumbnailUrl,
        },
      ])
      .select();

    if (error) throw error;

    console.log(`Successfully uploaded and synced: ${fileName}`);
    console.log(`Supabase Data:`, data);

  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
});

watcher.on('error', (error) => console.error(`Watcher error: ${error}`));
