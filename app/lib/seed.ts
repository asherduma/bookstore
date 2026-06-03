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
  
  const customerResult = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role) 
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['customer@bookstore.co.za', passwordHash, 'John', 'Doe', 'CUSTOMER']
  );
  const testUserId = customerResult.rows[0].id;

  // 3. Seed Base Categories
  const categories = [
    { name: 'Computer Science', slug: 'computer-science' },
    { name: 'Fiction', slug: 'fiction' },
    { name: 'Biography', slug: 'biography' },
    { name: 'Mathematics', slug: 'mathematics' }
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const res = await pool.query(
      `INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id`,
      [cat.name, cat.slug]
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