import { Link, useLocation } from "react-router-dom";
import { WalletConnect } from "../wallet/WalletConnect";


export function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="bg-linear-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent font-bold text-lg tracking-tight group-hover:from-violet-300 group-hover:to-indigo-300 transition-all duration-200">
              PayAgent
            </span>
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
                  ? "bg-violet-600/30 text-violet-300 ring-1 ring-violet-500/40"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              Agent
            </Link>
          </div>
        </div>
        <WalletConnect />
      </div>
    </nav>
  );
}
