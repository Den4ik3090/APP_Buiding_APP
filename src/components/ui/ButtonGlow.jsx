import React from "react";
import { ArrowRight } from "lucide-react";
import "./ButtonGlow.scss"; // Импортируем созданный файл

export const ButtonGlow = ({ text = "Отправить отчет", onClick }) => {
  return (
    <div className="btn-glow-container" onClick={onClick}>
      {/* Слой свечения */}
      <div className="btn-glow-effect"></div>
      
      <button type="button" className="btn-glow-body">
        {text}
        <ArrowRight className="btn-glow-icon" />
      </button>
    </div>
  );
};