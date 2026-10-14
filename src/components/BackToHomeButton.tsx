import { Link } from "react-router-dom";

const SIZES = {
  sm: {
    label: "pl-5 pr-2.5 py-2 text-sm",
    circle: "w-6 h-6 mr-1.5",
    icon: "w-3 h-3",
  },
  md: {
    label: "pl-6 pr-3 py-3 text-base",
    circle: "w-7 h-7 mr-2",
    icon: "w-3.5 h-3.5",
  },
} as const;

type Props = { size: keyof typeof SIZES };

/** Blue pill link with a white circular arrow badge that nudges left on hover. */
export const BackToHomeButton = ({ size }: Props) => {
  const s = SIZES[size];

  return (
    <Link
      to="/"
      className="group/btn inline-flex items-center rounded-2xl bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300"
    >
      <span className={`relative z-10 ${s.label} font-medium font-sans text-white`}>Back to Home</span>
      <span
        className={`relative z-10 flex items-center justify-center ${s.circle} rounded-full bg-white shrink-0 shadow-sm group-hover/btn:shadow-md transition-all duration-300`}
      >
        <svg
          className={`${s.icon} text-primary group-hover/btn:-translate-x-0.5 transition-transform duration-200`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </span>
    </Link>
  );
};
