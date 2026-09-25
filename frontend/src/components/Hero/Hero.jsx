import { motion } from "framer-motion";
import Assistant3D from "../Assistant3D/Assistant3D";
import URLInput from "../URLInput/URLInput";
import "./Hero.css";

export default function Hero() {
  return (
    <section id="hero" className="wg-hero container">
      <div className="wg-hero__copy">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Your AI co-pilot for
          <span className="glow-text"> website quality</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          WebGuard crawls your site, probes functionality, performance and UI,
          and hands your team a developer-ready bug report — explained in plain English.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <URLInput />
        </motion.div>
      </div>
      <motion.div
        className="wg-hero__visual"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <Assistant3D />
      </motion.div>
    </section>
  );
}
