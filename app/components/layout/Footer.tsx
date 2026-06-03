export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400">
        <p>&copy; {currentYear} Morari Studios. Developed for cloud architecture benchmarking exploration.</p>
        <p className="mt-2 sm:mt-0 font-mono">Environment Status: Active Telemetry</p>
      </div>
    </footer>
  );
}