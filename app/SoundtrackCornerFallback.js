"use client";

import React, { useMemo } from "react";
import { buildSoundtrackCorner } from "@/lib/soundtrack-corner";

export default function SoundtrackCornerFallback({ album, reason }) {
  const corner = useMemo(() => buildSoundtrackCorner(album), [album]);

  return (
    <div className="soundtrack-corner">
      <p className="agent-intro">{corner.intro}</p>
      {reason && (
        <div className="agent-status-note" role="status">
          {reason}
        </div>
      )}
      <div className="soundtrack-corner-kicker">{corner.kicker}</div>
      <div className="soundtrack-corner-grid">
        {corner.cards.map((card) => (
          <div key={card.key} className="soundtrack-card">
            <div className="soundtrack-card-meta">
              <span className="soundtrack-card-icon" aria-hidden="true">
                {card.icon}
              </span>
              <span className="soundtrack-card-label">{card.label}</span>
            </div>
            <div className="soundtrack-card-title">{card.title}</div>
            <p className="soundtrack-card-copy">{card.body}</p>
          </div>
        ))}
      </div>
      <div className="soundtrack-corner-note">{corner.bridgeNote}</div>
      <div className="soundtrack-corner-section">
        <div className="soundtrack-section-title">{corner.listenForHeading}</div>
        <ul className="soundtrack-list">
          {corner.listenFor.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="soundtrack-corner-section">
        <div className="soundtrack-section-title">
          {corner.recommendationsHeading}
        </div>
        <div className="soundtrack-recommendations">
          {corner.recommendations.map((recommendation) => (
            <div
              key={`${recommendation.artist}-${recommendation.title}`}
              className="soundtrack-recommendation"
            >
              <span className="soundtrack-recommendation-cover" aria-hidden="true">
                {recommendation.cover}
              </span>
              <div className="soundtrack-recommendation-copy">
                <div className="soundtrack-recommendation-title">
                  {recommendation.title}
                </div>
                <div className="soundtrack-recommendation-meta">
                  {recommendation.artist} · {recommendation.year}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
