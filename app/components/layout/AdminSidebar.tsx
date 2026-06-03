import { Link, useLocation } from "react-router";

export default function AdminSidebar() {
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard Overview", href: "/admin/dashboard" },
    { name: "Manage Book Catalog", href: "/admin/books" },
    { name: "Create New Book", href: "/admin/books/create" },
    { name: "Manage Categories", href: "/admin/categories" },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 min-h-[calc(100vh-4rem)] p-4">
      <div className="mb-6 px-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Management Console
        </h2>
      </div>
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t border-gray-200 pt-4 px-2">
        <Link to="/" className="text-xs text-blue-500 hover:underline">
          &larr; Back to Public Facing Store
        </Link>
      </div>
    </aside>
  );
}