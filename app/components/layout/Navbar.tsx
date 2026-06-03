import { Link } from "react-router";

interface NavbarProps {
  user?: {
    id: string;
    email: string;
    role: "CUSTOMER" | "ADMIN";
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo Brand */}
          <div className="flex">
            <Link to="/" className="text-xl font-bold tracking-tight text-gray-900">
              MORRARI <span className="text-xs font-light text-gray-400">BOOKS</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link to="/books" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Browse Books
            </Link>
            
            <Link to="/cart" className="text-sm font-medium text-gray-600 hover:text-gray-900 relative">
              Cart
            </Link>

            <span className="h-4 w-px bg-gray-200" aria-hidden="true" />

            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === "ADMIN" && (
                  <Link 
                    to="/admin/dashboard" 
                    className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                  >
                    Admin Console
                  </Link>
                )}
                <Link to="/account/orders" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  My Orders
                </Link>
                <form action="/auth/logout" method="post" className="inline">
                  <button 
                    type="submit" 
                    className="text-sm font-medium text-red-500 hover:text-red-600 cursor-pointer"
                  >
                    Logout
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Sign In
                </Link>
                <Link 
                  to="/auth/register" 
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}