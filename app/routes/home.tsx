import type { Route } from "./+types/home";
import { useLoaderData, Link } from "react-router";
import { pool } from "../lib/db.server";
import StarRating from "../components/ui/StarRating";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Home" },
    { name: "description", content: "Welcome to Morrari Books!" },
  ];
}

export async function loader() {
  // Fetch a quick slice of recent books to act as featured titles
  const featuredQuery =  pool.query(
    `SELECT b.id, b.title, b.author, b.price, b.image_url, c.name as category_name
     FROM books b
     JOIN categories c ON b.category_id = c.id
     ORDER BY b.created_at DESC LIMIT 4`
  );

  // Example: Pulling books with high click rates or mock order items counts
const popularQuery = pool.query(
    `SELECT b.id, b.title, b.author, b.price, b.image_url, b.review_count, b.average_rating, c.name as category_name 
      FROM books b
      JOIN categories c ON b.category_id = c.id
      ORDER BY b.review_count DESC, b.title ASC
      LIMIT 6`
);

  // Example: Joining with a reviews table to calculate mathematical averages
  const topReviewedQuery = pool.query(
    `SELECT b.id, b.title, b.author, b.price, b.image_url, b.review_count, b.average_rating, c.name as category_name
      FROM books b
      JOIN categories c ON b.category_id = c.id
      WHERE b.review_count >= 100 -- Optional filter to ensure credible averages
      ORDER BY b.average_rating DESC, b.review_count DESC
      LIMIT 6`
  );

  const [featuredRes, popularRes, topReviewedRes] = await Promise.all([
    featuredQuery,
    popularQuery,
    topReviewedQuery
  ]);

  return {
    featuredBooks: featuredRes.rows,
    popularBooks: popularRes.rows,
    topReviewedBooks: topReviewedRes.rows
  };
}

export default function Home() {
  const { featuredBooks, popularBooks, topReviewedBooks } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-16 py-4">
      {/* Hero Announcement Shell */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-8">
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
          Read! <br />
          <span className="text-blue-600 font-medium">Let's put the phones down and bring back reading. Actual Reading.</span>
        </h1>

        <div className="pt-2">
          <Link to="/books" className="inline-flex bg-gray-900 text-white rounded-md px-6 py-3 text-sm font-semibold hover:bg-gray-800 transition-all shadow-md">
            Explore Full Repository Catalog &rarr;
          </Link>
        </div>
      </section>

      {/* Featured Book Showcase Grid */}
      <section className="space-y-6">
        <div className="border-b border-gray-200 pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Recent Catalog Acquisitions</h2>
            <p className="text-xs text-gray-400">Check out our recently acquired books</p>
          </div>
          <Link to="/books" className="text-xs font-semibold text-blue-500 hover:underline">View All Books &rarr;</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {featuredBooks.map((book: any) => (
            <div key={book.id} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col shadow-xs hover:shadow-md transition-all">
              <div className="aspect-[128/215] w-full bg-gray-50 rounded-lg overflow-hidden mb-4 border border-gray-50">
                <img src={book.image_url || "https://placehold.co/400x600?text=Book"} alt={book.title} className="w-full h-full object-cover" />
              </div>
              <span className="text-[9px] font-bold tracking-widest text-blue-500 uppercase mb-1">{book.category_name}</span>
              <h3 className="font-bold text-gray-900 line-clamp-1 text-sm">{book.title}</h3>
              <p className="text-xs text-gray-400 mb-4">by {book.author}</p>
              <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-center">
                <span className="text-sm font-bold font-mono text-gray-900">R {book.price}</span>
                <Link to={`/books/${book.id}`} className="text-[11px] font-medium text-gray-600 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded bg-gray-50">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
{/* 2. Trending Popular Grid */}
      <section className="space-y-6">
        <div className="border-b border-gray-200 pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Trending</h2>
            <p className="text-xs text-gray-400">Most requested books</p>
          </div>
          <Link to="/books" className="text-xs font-semibold text-blue-500 hover:underline">View All Books &rarr;</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {popularBooks.map((book: any) => (
            <BookGridCard key={book.id} book={book} />
          ))}
        </div>
      </section>
      <section className="space-y-6">
        <div className="border-b border-gray-200 pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Top Customer Reviewed</h2>
            <p className="text-xs text-gray-400">Highly rated books</p>
          </div>
          <Link to="/books" className="text-xs font-semibold text-blue-500 hover:underline">View All Books &rarr;</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {topReviewedBooks.map((book: any) => (
            <BookGridCard key={book.id} book={book} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BookGridCard({ book }: { book: any }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col shadow-xs hover:shadow-md transition-all">
      <div className="aspect-[128/215] w-full bg-gray-50 rounded-lg overflow-hidden mb-4 border border-gray-50">
        <img 
          src={book.image_url || "https://placehold.co/400x600?text=Book"} 
          alt={book.title} 
          className="w-full h-full object-cover" 
        />
      </div>
      <span className="mb-1">
       <StarRating rating={book.average_rating} reviewCount={book.review_count} />
      </span>
      <h3 className="font-bold text-gray-900 line-clamp-1 text-sm">{book.title}</h3>
      <p className="text-xs text-gray-400 mb-4">by {book.author}</p>
      <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-center">
        <span className="text-sm font-bold font-mono text-gray-900">
          R {parseFloat(book.price).toFixed(2)}
        </span>
        <Link 
            to={`/books/${book.id}`} 
            className="text-[11px] font-medium text-gray-600 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded bg-gray-50"
          >
            View 
        </Link>
      </div>
    </div>
  );
}
