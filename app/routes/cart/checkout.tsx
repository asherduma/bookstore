import { Form, useLoaderData, useNavigation, useActionData, redirect, Link } from "react-router";
import type { Route } from "./+types/checkout";
import { query, pool } from "../../lib/db.server";
import { requireUser } from "../../lib/auth.server";
import Button from "../../components/ui/Button";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const res = await query(
    `SELECT c.quantity, b.title, b.price
     FROM cart_items c
     JOIN books b ON c.book_id = b.id
     WHERE c.user_id = $1`,
    [user.id]
  );

  if (res.rows.length === 0) {
    return redirect("/cart");
  }

  const subtotal = res.rows.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  return { 
    items: res.rows, 
    subtotal: subtotal.toFixed(2) 
  };
}

export async function action({ request }: Route.ActionArgs) {
  let userId: string;
  const user = await requireUser(request);
  userId = user.id;
  const client = await pool.connect();
  
  try {
    // Start our atomic transaction isolation loop
    await client.query("BEGIN");

    // Fetch active cart allocations
    let cartRes = await client.query(
      `SELECT c.book_id, c.quantity, b.price 
       FROM cart_items c 
       JOIN books b ON c.book_id = b.id 
       WHERE c.user_id = $1`,
      [userId]
    );

    // 2. High-Frequency Benchmark Auto-Seeding Handler
    if (cartRes.rows.length === 0 && process.env.BENCHMARK_MODE === "true") {
      const fallbackBook = await client.query("SELECT id, price FROM books LIMIT 1");
      if (fallbackBook.rows.length > 0) {
        await client.query(
          `INSERT INTO cart_items (user_id, book_id, quantity) 
           VALUES ($1, $2, 1) ON CONFLICT DO NOTHING`,
          [userId, fallbackBook.rows[0].id]
        );
        // Re-query to populate our memory array context
        cartRes = await client.query(
          `SELECT c.book_id, c.quantity, b.price FROM cart_items c JOIN books b ON c.book_id = b.id WHERE c.user_id = $1`,
          [userId]
        );
      }
    }

    // 3. Graceful User-Facing Empty State Guard
    if (cartRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { 
        success: false, 
        error: "Your shopping cart is currently empty. Add items before checking out." 
      };
    }

    // 4. Calculate Total Financial Exposure
    const totalAmount = cartRes.rows.reduce(
      (sum, item) => sum + (parseFloat(item.price) * item.quantity), 
      0
    );

    // 5. Append Order Summary Ledger Record
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING id`,
      [userId, totalAmount]
    );
    const orderId = orderRes.rows[0].id;

    // 6. Map Line-Items Into Relational Child Records
    for (const item of cartRes.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, book_id, quantity, unit_price) 
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.book_id, item.quantity, item.price]
      );
    }

    // 7. Flush Persistent Cart Sockets For Next Lifecycle
    await client.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
    
    // Commit everything atomically to the database disk
    await client.query("COMMIT");

    // 8. Differentiate Client Response Engine Patterns
    if (process.env.BENCHMARK_MODE === "true") {
      return { success: true, transaction: "COMMITTED" };
    }

    return redirect("/account/orders?success=true");

  } catch (error) {
    // Safeguard data structure states from half-executed writes
    await client.query("ROLLBACK");
    console.error("[CRITICAL TRANSACTION BREAKUP]:", error);
    return { error: "Infrastructure database bottleneck halted execution transaction loops." };
  } finally {
    // Release client back to pool immediately
    client.release();
  }
}

export default function CheckoutPage() {
  const { items, subtotal } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-100 p-6 sm:p-8 shadow-xs">
      <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-6">
        Order Finalization & System Simulation
      </h1>

      {actionData?.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {actionData.error}
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Items Awaiting Processing Allocation
        </h3>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-600 truncate max-w-sm">
                {item.title} <span className="text-xs text-gray-400 font-mono">x{item.quantity}</span>
              </span>
              <span className="font-mono text-gray-900 font-medium">R {(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-bold text-gray-900 text-base">
          <span>Aggregate Cost</span>
          <span className="font-mono">R {subtotal}</span>
        </div>
      </div>

      <Form method="post" className="space-y-4">
        <p className="text-xs text-gray-400 font-light leading-relaxed">
          *Notice: Clicking place order executes a raw atomic transaction script tracking sequential inserts across related database entities inside isolated execution contexts.
        </p>
        <div className="flex gap-4">
          <Link to="/cart" className="w-1/3">
            <Button type="button" variant="secondary">Modify Basket</Button>
          </Link>
          <div className="flex-1">
            <Button type="submit" isLoading={isSubmitting}>
              Place Simulation Order
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}