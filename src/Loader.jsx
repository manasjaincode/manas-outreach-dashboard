import loaderAnimation from "./loader.json"; // Lottie JSON yahin daal do same folder mein
import Lottie from "lottie-react";

export function Loader({ size = 60, fullPage = false, label = "" }) {
  const spinner = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <Lottie animationData={loaderAnimation} loop={true} style={{ width: size, height: size }} />
      {label && <div style={{ fontSize: 12, color: "#6B7280" }}>{label}</div>}
    </div>
  );

  if (!fullPage) return spinner;

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(255,255,255,0.7)", zIndex: 5000,
    }}>
      {spinner}
    </div>
  );
}