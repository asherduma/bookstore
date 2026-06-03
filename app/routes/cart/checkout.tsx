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
  const user = await requireUser(request);
  
  // Acquired standard client context out of the active connection pool
  const client = await pool.connect();
  
  try {
    // 1. Begin the native isolated ACID Transaction
    await client.query("BEGIN");

    // 2. Read latest item payloads within transaction boundary
    const cartRes = await client.query(
      `SELECT c.book_id, c.quantity, b.price 
       FROM cart_items c 
       JOIN books b ON c.book_id = b.id 
       WHERE c.user_id = $1`,
      [user.id]
    );

    if (cartRes.rows.length === 0) {
      throw new Error("Empty cart state detected.");
    }

    const totalAmount = cartRes.rows.reduce(
      (sum, item) => sum + (parseFloat(item.price) * item.quantity), 0
    );

    // 3. Inject Master Order Header record
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, total_amount) 
       VALUES ($1, $2) 
       RETURNING id`,
      [user.id, totalAmount]
    );
    const orderId = orderRes.rows[0].id;

    // 4. Batch items systematically into Order_Items table structures
    for (const item of cartRes.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, book_id, quantity, unit_price) 
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.book_id, item.quantity, item.price]
      );
    }

    // 5. Clear Cart dependencies to finalize checkout state cleanly
    await client.query("DELETE FROM cart_items WHERE user_id = $1", [user.id]);

    // 6. Safely commit modifications across database disks
    await client.query("COMMIT");
    
    return redirect("/account/orders?success=true");
  } catch (error) {
    // If a connection breaks or drops mid-flight, safely roll back state
    await client.query("ROLLBACK");
    console.error("[CRITICAL TRANSACTION BREAKUP]:", error);
    return { error: "Infrastructure bottleneck halted checkout transaction execution." };
  } finally {
    // Release the pool slot immediately for upcoming traffic loops
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