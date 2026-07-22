require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearGallery() {
  console.log('Clearing gallery...');
  
  // Fetch all image IDs
  const { data: images, error: fetchError } = await supabase
    .from('images')
    .select('id');

  if (fetchError) {
    console.error('Error fetching images:', fetchError);
    process.exit(1);
  }

  if (!images || images.length === 0) {
    console.log('Gallery is already empty.');
    return;
  }

  const ids = images.map(img => img.id);
  const chunkSize = 100;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error: deleteError } = await supabase
      .from('images')
      .delete()
      .in('id', chunk);

    if (deleteError) {
      console.error(`Error deleting chunk starting at ${i}:`, deleteError);
      process.exit(1);
    }
  }

  console.log(`Successfully cleared gallery.`);
}

clearGallery();
