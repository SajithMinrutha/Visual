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

async function primeImage(file) {
  const filePath = path.join(OUTPUT_FOLDER, file);
  const title = file.replace(/\.[^/.]+$/, "");
  
  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('images')
      .select('title')
      .eq('title', title)
      .single();
    
    if (existing) {
      console.log(`[Skipping]: ${file} already exists.`);
      return;
    }

    console.log(`Processing: ${file}...`);
    
    // Uploading without fixed width transformation to get full resolution
    const uploadResponse = await cloudinary.uploader.upload(filePath, {
      folder: 'gallery',
      transformation: [{ quality: 'auto' }],
    });

    const fullUrl = uploadResponse.secure_url;
    
    // Manually construct the thumbnail URL (400px wide)
    const thumbUrl = fullUrl.replace(
    /\/(upload\/\w+\/)(.*)\/(.*)\./,
    `/$1w_400,c_fill,q_60/$2/$3`
    );

    const { error } = await supabase
      .from('images')
      .insert([{
        title: title,
        url: fullUrl,
        thumbnail_url: thumbUrl
      }]);

    if (error) throw error;
    console.log(`[Success]: ${file} primed.`);
  } catch (err) {
    console.error(`[Error] Failed to prime ${file}:`, err);
  }
}

async function primeGallery() {
  const files = fs.readdirSync(OUTPUT_FOLDER).filter(file => 
    ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase()) &&
    !file.startsWith('low_') && !file.startsWith('upscaled_')
  );

  console.log(`Found ${files.length} new images to prime.`);

  const concurrency = 10;
  for (let i = 0; i < files.length; i += concurrency) {
    const chunk = files.slice(i, i + concurrency);
    await Promise.all(chunk.map(file => primeImage(file)));
  }

  console.log('\nAll images have been processed!');
}

primeGallery();
