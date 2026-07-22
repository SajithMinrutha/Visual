require('dotenv').config();
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

async function primeGallery() {
  const files = fs.readdirSync(OUTPUT_FOLDER).filter(file => 
    ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase()) &&
    !file.startsWith('low_') && !file.startsWith('upscaled_')
  );

  console.log(`Found ${files.length} new images to prime.`);

  for (const file of files) {
    const filePath = path.join(OUTPUT_FOLDER, file);
    try {
      console.log(`Processing: ${file}...`);
      
      const uploadResponse = await cloudinary.uploader.upload(filePath, {
        folder: 'gallery',
        transformation: [{ width: 800, crop: 'limit', quality: 'auto' }],
      });

      const thumbUrl = uploadResponse.secure_url.replace(
      /\/(upload\/\w+\/)(.*)\/(.*)\./,
      `/$1w_400,c_fill,q_60/$2/$3`
    );

      const { error } = await supabase
        .from('images')
        .insert([{
          title: file.replace(/\.[^/.]+$/, ""),
          url: uploadResponse.secure_url,
          thumbnail_url: thumbUrl
        }]);

      if (error) throw error;
      console.log(`[Success]: ${file} primed.`);
    } catch (err) {
      console.error(`[Error] Failed to prime ${file}:`, err);
    }
  }

  console.log('\nAll images have been primed!');
}

primeGallery();
