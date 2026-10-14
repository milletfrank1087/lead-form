import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Apply from "@/pages/Apply";
import LegalPlaceholder from "@/pages/LegalPlaceholder";
import NotFound from "@/pages/NotFound";

/** This project only contains the /apply page, so "/" forwards there (keeping ?campaign=...). */
const RedirectToApply = () => {
  const { search } = useLocation();
  return <Navigate to={`/apply${search}`} replace />;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<RedirectToApply />} />
      <Route path="/apply" element={<Apply />} />
      <Route path="/terms" element={<LegalPlaceholder title="Terms" />} />
      <Route path="/privacy" element={<LegalPlaceholder title="Privacy Policy" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
