import React from "react";
import { useNavigate } from "react-router-dom";
import Hero from "../components/landing/Hero.jsx";
import TargetInput from "../components/landing/TargetInput.jsx";
import ModuleGrid from "../components/landing/ModuleGrid.jsx";
import StartButton from "../components/landing/StartButton.jsx";
import Footer from "../components/layout/Footer.jsx";
import { useAnalysis } from "../hooks/useAnalysis.jsx";

export default function Landing() {
  const { target, setTarget, selectedModules, toggleModule, startAnalysis, error } = useAnalysis();
  const navigate = useNavigate();

  const canStart = target.trim().length > 0 && selectedModules.length > 0;

  const handleStart = () => {
    const started = startAnalysis();
    if (started) navigate("/dashboard");
  };

  return (
    <div>
      <Hero />
      <TargetInput value={target} onChange={setTarget} error={error?.message} />

      <div className="max-w-6xl mx-auto px-6 mt-14">
        <ModuleGrid selected={selectedModules} onToggle={toggleModule} />
        <StartButton
          disabled={!canStart}
          onClick={handleStart}
          hint="enter a target and select at least one module"
        />
      </div>

      <Footer />
    </div>
  );
}
