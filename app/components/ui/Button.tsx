import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  isLoading?: boolean;
}

export default function Button({ 
  variant = "primary", 
  isLoading, 
  children, 
  className = "", 
  ...props 
}: ButtonProps) {
  const baseStyle = "w-full flex justify-center py-2 px-4 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors cursor-pointer disabled:opacity-50";
  
  const variants = {
    primary: "border-transparent text-white bg-gray-900 hover:bg-gray-800",
    secondary: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50",
    danger: "border-transparent text-white bg-red-600 hover:bg-red-700",
  };

  return (
    <button
      disabled={isLoading || props.disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? "Processing..." : children}
    </button>
  );
}