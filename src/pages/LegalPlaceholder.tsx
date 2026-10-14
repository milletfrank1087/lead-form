import { Link } from "react-router-dom";

type Props = { title: string };

/**
 * Stand-in for the Terms / Privacy pages. The original site's legal text is deliberately not copied;
 * write your own (and have it reviewed) before collecting real applications.
 */
const LegalPlaceholder = ({ title }: Props) => (
  <div className="min-h-screen bg-white text-zinc-900 font-sans">
    <main className="max-w-2xl mx-auto px-6 py-20">
      <h1 className="text-3xl font-medium tracking-tight mb-4">{title}</h1>
      <p className="text-zinc-500 mb-8">
        Placeholder page. Add your own {title.toLowerCase()} text here.
      </p>
      <Link to="/apply" className="text-primary hover:underline">
        Back to the application
      </Link>
    </main>
  </div>
);

export default LegalPlaceholder;
