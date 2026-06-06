import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { pool } from './db.server.js'; // Adjust path if needed

async function runSeeder() {
  console.log("🚀 Starting database initialization and seeding...");

  // 1. Read and execute the structural schema
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  await pool.query(schemaSql);
  console.log("✅ Database schema clean build completed.");

  // 2. Seed Administrative and Mock Users
  const passwordHash = await bcrypt.hash('Password123!', 10);
  
  const userAdmin = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role) 
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['admin@bookstore.co.za', passwordHash, 'Admin', 'User', 'ADMIN']
  );
  
  await seedUsers();

  const testUserId = '4a1b2c3d-e4f5-46a7-b8c9-d0e1f2a3b4c5';

  // 3. Seed Base Categories
  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const res = await pool.query(
      `INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3) RETURNING id`,
      [cat.id, cat.name, cat.slug]
    );
    categoryMap[cat.slug] = res.rows[0].id;
  }
  console.log(`✅ Seeded ${categories.length} generic categories.`);

  // 4. Generate Mass Volume Books (Simulating standard catalog sizing)
  console.log("📚 Generating book records...");
  const sampleDescriptions = [
    "An in-depth guide covering performance architectures, distributed systems, and modern scaling primitives.",
    "A compelling journey through minimalist systems engineering, emphasizing clean architecture over complexity.",
    "A seminal historical text examining modern foundational changes in open source technology implementations."
  ];

  let bookCount = 0;
  // We'll insert a robust batch of rows to make indexes matter during stress test paging
  for (let i = 1; i <= 500; i++) {
    const isCompSci = i % 2 === 0;
    const catId = isCompSci ? categoryMap['computer-science'] : categoryMap['fiction'];
    const title = isCompSci ? `Distributed Engineering Vol. ${i}` : `The Minimalist Mindset Chapter ${i}`;
    const author = isCompSci ? "Dr. E. Dijkstra" : "A. Architectural";
    const price = (199.99 + (i * 0.50)).toFixed(2);
    const stock = 10 + (i % 50);
    const isbn = `978-0-${i}-${100000 + i}`;

    const bookRes = await pool.query(
      `INSERT INTO books (category_id, title, author, description, isbn, price, stock_quantity, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [catId, title, author, sampleDescriptions[i % 3], isbn, price, stock, `https://placehold.co/400x600?text=Book+${i}`]
    );

    // Give some books a default product review to load during /books/:id route benchmarks
    if (i <= 50) {
      await pool.query(
        `INSERT INTO reviews (user_id, book_id, rating, comment) VALUES ($1, $2, $3, $4)`,
        [testUserId, bookRes.rows[0].id, (i % 2 === 0 ? 5 : 4), "Highly practical material for engineering assessments."]
      );
    }
    bookCount++;
  }

  console.log(`\n✅ Successfully seeded ${bookCount} books and mock dependencies.`);
  console.log("Setup complete. Close terminal session or continue.");
  process.exit(0);
}

runSeeder().catch((err) => {
  console.error("❌ Critical seeding failure occurred:", err);
  process.exit(1);
});

//OTHER FUNCTIONS
async function seedUsers() {
  console.log("🌱 Starting user seed...");
  
  try {
    // Loop through each user and execute the query
    for (const user of users) {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`, // Prevent errors if you run the script twice
        [user.id, user.email, user.password_hash, user.first_name, user.last_name, user.role]
      );
    }
    
    console.log(`✅ Successfully seeded ${users.length} users!`);
  } catch (error) {
    console.error("❌ Error seeding users:", error);
  } finally {
    // Close the pool connection when done so the script exits smoothly
    await pool.end();
  }
}

//DATA USED
//-------------------------------------------------------------------------------------------
// CATEGORIES
  const categories = [
  { "id": "51fa23e5-9d21-4d1c-b258-0051e5e01001", "name": "Biography", "slug": "biography" },
  { "id": "7ab243e6-8c41-47cb-b062-1162f6f11002", "name": "Religion & Spirituality", "slug": "religion-spirituality" },
  { "id": "2c9e47a1-3b52-4fd2-a071-2273a7a22003", "name": "Fiction", "slug": "fiction" },
  { "id": "8df328b4-4e63-4a12-8193-3384b8b33004", "name": "Social Science", "slug": "social-science" },
  { "id": "4e1c59c2-5f74-4b23-9204-4495c9c44005", "name": "Reference", "slug": "reference" },
  { "id": "a0b368d3-6a85-4c34-a315-55a6d0d55006", "name": "Children & YA", "slug": "children-ya" },
  { "id": "3f2d79e4-7b96-4d45-b426-66b7e1e66007", "name": "Technology", "slug": "technology" },
  { "id": "d1c48af5-8c07-4e56-bc37-77c8f2f77008", "name": "History", "slug": "history" },
  { "id": "6e5b9bf6-9d18-4f67-cd48-88d903f88009", "name": "Health & Medicine", "slug": "health-medicine" },
  { "id": "f2a60cf7-0e29-4078-de59-99ea14f99010", "name": "Cooking & Lifestyle", "slug": "cooking-lifestyle" },
  { "id": "1b371df8-1f3a-4189-ef60-aae025fa0011", "name": "Philosophy", "slug": "philosophy" },
  { "id": "5c482ef9-2f4b-429a-fa71-bbf136fb1012", "name": "Other", "slug": "other" },
  { "id": "9d593f0a-3f5c-43ab-0b82-cc0247fc2013", "name": "Sports & Recreation", "slug": "sports-recreation" },
  { "id": "0e6a4f1b-4f6d-44bc-1c93-dd1358fd3014", "name": "Arts & Music", "slug": "arts-music" },
  { "id": "4f7b5f2c-5f7e-45cd-2d04-ee2469fe4015", "name": "Education", "slug": "education" },
  { "id": "8f8c6f3d-6f8f-46de-3d15-ff357aff5016", "name": "Science & Nature", "slug": "science-nature" },
  { "id": "cf9d7f4e-7faf-47df-4d26-00468b006017", "name": "Business & Economics", "slug": "business-economics" },
  { "id": "2fae8f5f-8fbf-48ef-5d37-11579c117018", "name": "Mathematics", "slug": "mathematics" },
  { "id": "6fbf9f60-9fcf-49f0-6d48-2268ad228019", "name": "Comics & Humor", "slug": "comics-humor" },
  { "id": "0fcf0f71-0fdf-4af1-7d59-3379be339020", "name": "Travel", "slug": "travel" }
];

//USERS
const users = [
  { "id": "4a1b2c3d-e4f5-46a7-b8c9-d0e1f2a3b4c5", "email": "john.smith@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "John", "last_name": "Smith", "role": "CUSTOMER" },
  { "id": "5b2c3d4e-f5a6-47b8-c9d0-e1f2a3b4c5d6", "email": "sarah.johnson@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Sarah", "last_name": "Johnson", "role": "CUSTOMER" },
  { "id": "6c3d4e5f-a6b7-48c9-d0e1-f2a3b4c5d6e7", "email": "michael.brown@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Michael", "last_name": "Brown", "role": "CUSTOMER" },
  { "id": "7d4e5f6a-b7c8-49d0-e1f2-a3b4c5d6e7f8", "email": "emily.davis@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Emily", "last_name": "Davis", "role": "CUSTOMER" },
  { "id": "8e5f6a7b-c8d9-4ae0-f1f2-a3b4c5d6e7f8", "email": "david.miller@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "David", "last_name": "Miller", "role": "CUSTOMER" },
  { "id": "9f6a7b8c-d9e0-4bf1-a2b3-c4d5e6f7a8b9", "email": "jessica.wilson@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Jessica", "last_name": "Wilson", "role": "CUSTOMER" },
  { "id": "a0b1c2d3-e4f5-46a7-b8c9-d0e1f2a3b4c5", "email": "james.moore@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "James", "last_name": "Moore", "role": "CUSTOMER" },
  { "id": "b1c2d3e4-f5a6-47b8-c9d0-e1f2a3b4c5d6", "email": "amanda.taylor@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Amanda", "last_name": "Taylor", "role": "CUSTOMER" },
  { "id": "c2d3e4f5-a6b7-48c9-d0e1-f2a3b4c5d6e7", "email": "robert.anderson@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Robert", "last_name": "Anderson", "role": "CUSTOMER" },
  { "id": "d3e4f5a6-b7c8-49d0-e1f2-a3b4c5d6e7f8", "email": "megan.thomas@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Megan", "last_name": "Thomas", "role": "CUSTOMER" },
  { "id": "e4f5a6b7-c8d9-4ae0-f1f2-a3b4c5d6e7f8", "email": "william.jackson@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "William", "last_name": "Jackson", "role": "CUSTOMER" },
  { "id": "f5a6b7c8-d9e0-4bf1-a2b3-c4d5e6f7a8b9", "email": "ashley.white@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Ashley", "last_name": "White", "role": "CUSTOMER" },
  { "id": "1a2b3c4d-5e6f-47a8-b9c0-d1e2f3a4b5c6", "email": "brian.harris@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Brian", "last_name": "Harris", "role": "CUSTOMER" },
  { "id": "2b3c4d5e-6f7a-48b9-c0d1-e2f3a4b5c6d7", "email": "stephanie.martin@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Stephanie", "last_name": "Martin", "role": "CUSTOMER" },
  { "id": "3c4d5e6f-7a8b-49c0-d1e2-f3a4b5c6d7e8", "email": "kevin.thompson@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Kevin", "last_name": "Thompson", "role": "CUSTOMER" },
  { "id": "4d5e6f7a-8b9c-40d1-e2f3-a4b5c6d7e8f9", "email": "rachel.garcia@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Rachel", "last_name": "Garcia", "role": "CUSTOMER" },
  { "id": "5e6f7a8b-9c0d-41e2-f3a4-b5c6d7e8f9a0", "email": "jason.martinez@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Jason", "last_name": "Martinez", "role": "CUSTOMER" },
  { "id": "6f7a8b9c-0d1e-42f3-a4b5-c6d7e8f9a0b1", "email": "nicole.robinson@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Nicole", "last_name": "Robinson", "role": "CUSTOMER" },
  { "id": "7a8b9c0d-1e2f-43a4-b5c6-d7e8f9a0b1c2", "email": "jeffrey.clark@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Jeffrey", "last_name": "Clark", "role": "CUSTOMER" },
  { "id": "8b9c0d1e-2f3a-44b5-c6d7-e8f9a0b1c2d3", "email": "christine.rodriguez@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Christine", "last_name": "Rodriguez", "role": "CUSTOMER" },
  { "id": "9b8a7c6d-5e4f-43a2-b1c0-d9e8f7a6b5c4", "email": "matthew.lewis@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Matthew", "last_name": "Lewis", "role": "CUSTOMER" },
  { "id": "0a1b2c3d-4e5f-46a7-b8c9-d0e1f2a3b4c6", "email": "crystal.lee@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Crystal", "last_name": "Lee", "role": "CUSTOMER" },
  { "id": "1b2c3d4e-5f6a-47b8-c9d0-e1f2a3b4c5d7", "email": "andrew.walker@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Andrew", "last_name": "Walker", "role": "CUSTOMER" },
  { "id": "2c3d4e5f-6a7b-48c9-d0e1-f2a3b4c5d6e8", "email": "heather.hall@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Heather", "last_name": "Hall", "role": "CUSTOMER" },
  { "id": "3d4e5f6a-7b8c-49d0-e1f2-a3b4c5d6e7f9", "email": "ryan.allen@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Ryan", "last_name": "Allen", "role": "CUSTOMER" },
  { "id": "4e5f6a7b-8c9d-4ae0-f1f2-a3b4c5d6e7f0", "email": "amber.young@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Amber", "last_name": "Young", "role": "CUSTOMER" },
  { "id": "5f6a7b8c-9d0e-4bf1-a2b3-c4d5e6f7a8b0", "email": "justin.king@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Justin", "last_name": "King", "role": "CUSTOMER" },
  { "id": "6a7b8c9d-0e1f-42f3-a4b5-c6d7e8f9a0b2", "email": "danielle.wright@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Danielle", "last_name": "Wright", "role": "CUSTOMER" },
  { "id": "7b8c9d0e-1f2g-43a4-b5c6-d7e8f9a0b1c3", "email": "ethan.lopez@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Ethan", "last_name": "Lopez", "role": "CUSTOMER" },
  { "id": "8c9d0e1f-2f3a-44b5-c6d7-e8f9a0b1c2d4", "email": "megan.hill@example.com", "password_hash": "$2b$10$I0oVrLppcWmLfk9hOo2/OOdWMQFqMYBw49ApILSjDnnNJbDNY/EXu", "first_name": "Megan", "last_name": "Hill", "role": "CUSTOMER" }
];