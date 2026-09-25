import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import Dashboard from "./components/Dashboard/Dashboard";
import Report from "./components/Report/Report";
import ErrorBanner from "./components/ErrorBanner/ErrorBanner";

export default function App() {
  return (
    <div className="wg-app">
      <Navbar />
      <Hero />
      <ErrorBanner />
      <Dashboard />
      <Report />
    </div>
  );
}
