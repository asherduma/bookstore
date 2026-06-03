import { useLoaderData, Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/index";
import { query } from "../../lib/db.server";
import { requireUser } from "../../lib/auth.server";
import Button from "../../components/ui/Button";

export async function loader({ request }: Route.LoaderArgs) {
  // Enforce authentication to isolate specific user scopes
  const user = await requireUser(request);

  const res = await query(
    `SELECT c.id, c.quantity, b.id as book_id, b.title, b.author, b.price, b.image_url
     FROM cart_items c
     JOIN books b ON c.book_id = b.id
     WHERE c.user_id = $1 
     ORDER BY c.created_at DESC`,
    [user.id]
  );

  // Compute standard checkout math on the server side
  const items = res.rows;
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  return { items, subtotal: subtotal.toFixed(2) };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  const actionType = formData.get("intent") as string;
  const cartItemId = formData.get("cartItemId") as string;

  if (actionType === "update") {
    const quantity = parseInt(formData.get("quantity") as string, 10);
    if (quantity > 0) {
      await query(
        "UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3",
        [quantity, cartItemId, user.id]
      );
    }
  } else if (actionType === "delete") {
    await query(
      "DELETE FROM cart_items WHERE id = $1 AND user_id = $2",
      [cartItemId, user.id]
    );
  }

  return { success: true };
}

export default function CartIndex() {
  const { items, subtotal } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isUpdating = navigation.state === "submitting";

  if (items.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-xl border border-gray-100 max-w-2xl mx-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your selection basket is empty</h2>
        <p className="text-sm text-gray-500 mb-6">Explore the catalog to add core computing resources.</p>
        <Link to="/books" className="inline-flex bg-gray-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors">
          Browse Book Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 shadow-xs">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-8">Your Cart Selection</h1>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 sm:gap-6 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
            <div className="w-16 h-24 bg-gray-50 rounded overflow-hidden shrink-0 border border-gray-100">
              <img src={item.image_url || "https://placehold.co/400x600?text=Book"} alt={item.title} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h3>
              <p className="text-xs text-gray-500 mb-2">by {item.author}</p>
              <span className="text-sm font-mono font-medium text-gray-900">R {item.price}</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Dynamic Update Form */}
              <Form method="post" className="flex items-center gap-2">
                <input type="hidden" name="cartItemId" value={item.id} />
                <input type="hidden" name="intent" value="update" />
                <select
                  name="quantity"
                  defaultValue={item.quantity}
                  disabled={isUpdating}
                  onChange={(e) => e.target.form?.requestSubmit()}
                  className="rounded border border-gray-300 py-1 px-2 text-xs focus:ring-gray-500 text-gray-700 h-8"
                >
                  {[1, 2, 3, 4, 5, 10].map((num) => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </Form>

              {/* Direct Removal Form */}
              <Form method="post">
                <input type="hidden" name="cartItemId" value={item.id} />
                <input type="hidden" name="intent" value="delete" />
                <button type="submit" className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer">
                  Remove
                </button>
              </Form>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Layout & Transaction Link */}
      <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col items-end">
        <div className="w-full sm:w-80 space-y-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal Calculated</span>
            <span className="font-mono text-gray-900 font-semibold">R {subtotal}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-4 text-base font-bold text-gray-900">
            <span>Estimated Total</span>
            <span className="font-mono">R {subtotal}</span>
          </div>
          <div className="pt-2">
            <Link to="/cart/checkout">
              <Button type="button">Proceed to Checkout Verification &rarr;</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}