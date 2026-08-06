require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkDb() {
  console.log('Checking database connection...');
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Database error:', error.message);
    if (error.code === '42P01') {
      console.error('The "students" table does not exist. Please run the SQL schema in your Supabase dashboard.');
    }
  } else {
    console.log('✅ Connection successful. The "students" table exists.');
  }
}

checkDb();
