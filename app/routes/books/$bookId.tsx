import { useLoaderData, Form, useNavigation, useActionData } from "react-router";
import type { Route } from "./+types/$bookId";
import { query } from "../../lib/db.server";
import { getSession } from "../../lib/session.server";
import Button from "../../components/ui/Button";

export async function loader({ params }: Route.LoaderArgs) {
  const { bookId } = params;

  // Fetch book entry details with Category metadata using a standard relational join
  const bookRes = await query(
    `SELECT b.*, c.name as category_name 
     FROM books b 
     JOIN categories c ON b.category_id = c.id 
     WHERE b.id = $1 LIMIT 1`,
    [bookId]
  );

  if (bookRes.rows.length === 0) {
    throw new Response("Book Not Found", { status: 404 });
  }

  // Fetch all existing customer reviews for this specific book
  const reviewsRes = await query(
    `SELECT r.*, u.first_name, u.last_name 
     FROM reviews r 
     JOIN users u ON r.user_id = u.id 
     WHERE r.book_id = $1 
     ORDER BY r.created_at DESC`,
    [bookId]
  );

  return {
    book: bookRes.rows[0],
    reviews: reviewsRes.rows
  };
}

// Action handles adding items directly to the persistent Cart Items table
export async function action({ request, params }: Route.ActionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");

  if (!userId) {
    return { error: "You must be authenticated to adjust a basket." };
  }

  const formData = await request.formData();
  const bookId = params.bookId;
  const quantity = parseInt(formData.get("quantity") as string, 10) || 1;

  try {
    // Perform an atomic upsert statement on the cart items table
    await query(
      `INSERT INTO cart_items (user_id, book_id, quantity) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, book_id) 
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [userId, bookId, quantity]
    );
    return { success: true };
  } catch (error) {
    return { error: "Failed to allocate item to your cart." };
  }
}

export default function BookDetails() {
  const { book, reviews } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Book Image */}
        <div className="aspect-[3/4] bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center max-w-sm mx-auto w-full border border-gray-100">
          <img 
            src={book.image_url || "https://placehold.co/400x600?text=Book"} 
            alt={book.title} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Book Meta Details & Purchase Logic */}
        <div className="flex flex-col">
          <span className="text-xs font-bold text-blue-600 tracking-widest uppercase mb-2">
            {book.category_name}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-1">
            {book.title}
          </h1>
          <p className="text-md text-gray-500 mb-6">by <span className="font-medium text-gray-700">{book.author}</span></p>
          
          <div className="text-2xl font-black text-gray-900 mb-6">
            R {book.price}
          </div>

          <div className="border-t border-b border-gray-100 py-4 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Abstract</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{book.description}</p>
          </div>

          <div className="mt-auto">
            <Form method="post" className="space-y-3">
              {actionData?.success && (
                <div className="p-3 bg-green-50 text-green-700 text-xs rounded border border-green-200 font-medium">
                  Item successfully appended to your personal cart!
                </div>
              )}
              {actionData?.error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                  {actionData.error}
                </div>
              )}

              <div className="flex gap-4">
                <div className="w-24">
                  <select
                    id="quantity"
                    name="quantity"
                    className="block w-full rounded-md border-gray-300 py-2 text-base focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm border px-2 h-10"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <Button type="submit" isLoading={isSubmitting} className="h-10">
                    Add to Selection Basket
                  </Button>
                </div>
              </div>
            </Form>
            <p className="text-[11px] text-gray-400 mt-2 font-mono">SKU ID: {book.id}</p>
          </div>
        </div>
      </div>

      {/* Product Reviews Section */}
      <div className="mt-16 pt-8 border-t border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-6">
          Peer Reviews & Feedback ({reviews.length})
        </h2>
        
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No formal system reviews have been cataloged for this work yet.</p>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-800">
                    {review.first_name} {review.last_name}
                  </span>
                  <span className="text-xs text-yellow-500 font-bold">
                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 font-light leading-relaxed">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}