import { Link, useLocation } from "react-router-dom";
import { WalletConnect } from "./WalletConnect";

export function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-mono text-sm font-semibold tracking-widest text-violet-400 uppercase hover:text-violet-300 transition">
            PayAgent
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                pathname === "/"
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              Overview
            </Link>
            <Link
              to="/app"
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                pathname === "/app"
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              App
            </Link>
          </div>
        </div>
        <WalletConnect />
      </div>
    </nav>
  );
}
