import { useLoaderData, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/index";
import { query } from "../../lib/db.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const currentCategory = url.searchParams.get("category") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  
  const limit = 12; // 12 items per page
  const offset = (page - 1) * limit;

  // 1. Fetch categories to display in the filter sidebar
  const categoriesRes = await query(
    "SELECT id, name, slug FROM categories ORDER BY name ASC"
  );

  // 2. Build the dynamic books query based on category presence
  let booksQuery = `
    SELECT b.id, b.title, b.author, b.price, b.image_url, c.name as category_name 
    FROM books b
    JOIN categories c ON b.category_id = c.id
  `;
  let countQuery = `SELECT COUNT(*) FROM books b JOIN categories c ON b.category_id = c.id`;
  const queryParams: any[] = [];

  if (currentCategory) {
    booksQuery += ` WHERE c.slug = $1`;
    countQuery += ` WHERE c.slug = $1`;
    queryParams.push(currentCategory);
  }

  // Add order, limit, and offset parameters
  booksQuery += ` ORDER BY b.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  
  const booksParams = [...queryParams, limit, offset];

  // Run both calls in parallel to keep execution time small
  const [booksRes, countRes] = await Promise.all([
    query(booksQuery, booksParams),
    query(countQuery, queryParams)
  ]);

  const totalBooks = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(totalBooks / limit);

  return {
    books: booksRes.rows,
    categories: categoriesRes.rows,
    currentCategory,
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

export default function BookCatalog() {
  const { books, categories, currentCategory, pagination } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleCategoryChange = (slug: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (slug) {
      newParams.set("category", slug);
    } else {
      newParams.delete("category");
    }
    newParams.set("page", "1"); // Reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Category Sidebar Filter */}
      <aside className="w-full md:w-64 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
          Filter By Category
        </h2>
        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => handleCategoryChange("")}
            className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap text-left transition-colors cursor-pointer ${
              !currentCategory ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            All Disciplines
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap text-left transition-colors cursor-pointer ${
                currentCategory === cat.slug ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Catalog Display Grid */}
      <div className="flex-1">
        {books.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-lg border border-gray-100">
            <p className="text-gray-500">No books found in this catalog slice.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => (
                <div key={book.id} className="bg-white border border-gray-100 rounded-lg overflow-hidden flex flex-col group shadow-xs">
                  <div className="aspect-[4/5] bg-gray-50 relative overflow-hidden flex items-center justify-center border-b border-gray-50">
                    <img 
                      src={book.image_url || "https://placehold.co/400x600?text=Book"} 
                      alt={book.title} 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                      {book.category_name}
                    </span>
                    <h3 className="font-semibold text-gray-900 line-clamp-1 mb-0.5">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">{book.author}</p>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                      <span className="text-sm font-bold text-gray-900">R {book.price}</span>
                      <Link 
                        to={`/books/${book.id}`} 
                        className="text-xs font-semibold bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-800 transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Micro-Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-12 pt-4 border-t border-gray-200">
                <button
                  disabled={!pagination.hasPrevPage}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer disabled:opacity-40"
                >
                  &larr; Previous Page
                </button>
                <span className="text-xs font-mono text-gray-500">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer disabled:opacity-40"
                >
                  Next Page &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}