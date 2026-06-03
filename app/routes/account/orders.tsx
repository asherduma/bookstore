import { useLoaderData, useSearchParams, Link } from "react-router";
import type { Route } from "./+types/orders";
import { query } from "../../lib/db.server";
import { requireUser } from "../../lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  // Single-trip nested lookup utilizing multiple explicit INNER JOIN operators
  const res = await query(
    `SELECT 
      o.id as order_id, o.total_amount, o.created_at as order_date,
      oi.id as item_id, oi.quantity, oi.unit_price,
      b.title as book_title, b.author as book_author
     FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     JOIN books b ON oi.book_id = b.id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC`,
    [user.id]
  );

  // Group flat relational rows into structured order objects
  const ordersMap: Record<string, any> = {};

  for (const row of res.rows) {
    if (!ordersMap[row.order_id]) {
      ordersMap[row.order_id] = {
        id: row.order_id,
        totalAmount: row.total_amount,
        date: row.order_date,
        items: []
      };
    }
    
    ordersMap[row.order_id].items.push({
      id: row.item_id,
      title: row.book_title,
      author: row.book_author,
      quantity: row.quantity,
      unitPrice: row.unit_price
    });
  }

  return { orders: Object.values(ordersMap) };
}

export default function MyOrders() {
  const { orders } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const showSuccessBanner = searchParams.get("success") === "true";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Transaction Success Banner */}
      {showSuccessBanner && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-2 shadow-xs animate-fade-in">
          <div>
            <h4 className="text-sm font-bold">Transaction Successfully Authorized!</h4>
            <p className="text-xs text-green-600 font-light">The ACID checkout transaction successfully completed execution loops across the database cluster.</p>
          </div>
          <Link to="/books" className="text-xs bg-green-800 text-white font-medium px-3 py-1.5 rounded hover:bg-green-900 w-fit">
            Continue Browsing
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 shadow-xs">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Purchase History</h1>
        <p className="text-xs text-gray-400 font-mono mb-8">Scope: Customer Order Log Summary</p>

        {orders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p className="text-sm text-gray-500 italic">No historical transactions logged for this user profile context.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order: any) => (
              <div key={order.id} className="border border-gray-100 rounded-xl overflow-hidden shadow-xs">
                {/* Order Header Grid */}
                <div className="bg-gray-50 p-4 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block uppercase font-semibold tracking-wider text-[10px]">Date Placed</span>
                    <span className="text-gray-700 font-medium">{new Date(order.date).toLocaleDateString("en-ZA", { dateStyle: "medium" })}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase font-semibold tracking-wider text-[10px]">Total Captured</span>
                    <span className="text-gray-900 font-bold font-mono">R {order.totalAmount}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 sm:text-right">
                    <span className="text-gray-400 block uppercase font-semibold tracking-wider text-[10px]">Order Hash Reference</span>
                    <span className="text-gray-500 font-mono text-[11px] block truncate">{order.id}</span>
                  </div>
                </div>

                {/* Sub-item List */}
                <div className="divide-y divide-gray-50 p-4 bg-white">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center text-sm">
                      <div className="min-w-0 max-w-md">
                        <h4 className="font-semibold text-gray-900 truncate">{item.title}</h4>
                        <p className="text-xs text-gray-400">by {item.author}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-gray-500 font-mono">x{item.quantity}</span>
                        <p className="font-mono text-gray-700 text-xs font-medium">R {item.unitPrice}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}