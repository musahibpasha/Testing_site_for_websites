import "./Navbar.css";
import { useTesting } from "../../context/TestingContext";

export default function Navbar() {
  const { status } = useTesting();

  return (
    <header className="wg-navbar">
      <div className="container wg-navbar__inner">
        <div className="wg-navbar__brand">
          <span className="wg-navbar__logo" />
          <h1>
            WEB<span className="glow-text">GUARD</span>
          </h1>
        </div>
        <nav className="wg-navbar__links">
          <a href="#hero">Home</a>
          <a href="#dashboard">Dashboard</a>
          <a href="#report">Report</a>
        </nav>
        <div className={`wg-navbar__status wg-navbar__status--${status}`}>
          <span className="dot" />
          {status.toUpperCase()}
        </div>
      </div>
    </header>
  );
}
