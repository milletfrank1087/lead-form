import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-white font-sans">
    <div className="text-center px-6">
      <h1 className="text-4xl font-medium tracking-tight text-zinc-900 mb-3">404</h1>
      <p className="text-zinc-500 mb-6">This page doesn't exist.</p>
      <Link to="/apply" className="text-primary hover:underline">
        Go to the application
      </Link>
    </div>
  </div>
);

export default NotFound;
