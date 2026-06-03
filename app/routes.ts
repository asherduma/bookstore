import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("auth/login", "routes/auth/login.tsx"),
    route("auth/register", "routes/auth/register.tsx"),
    route("auth/logout", "routes/auth/logout.tsx"),
    route("books", "routes/books/index.tsx"),
    route("books/:bookId", "routes/books/$bookId.tsx"),
    route("cart", "routes/cart/index.tsx"),
    route("cart/checkout", "routes/cart/checkout.tsx"),
] satisfies RouteConfig;
