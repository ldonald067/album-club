"use client";

import React, { useMemo } from "react";
import { buildSoundtrackCorner } from "@/lib/soundtrack-corner";

export default function SoundtrackCornerFallback({ album, reason }) {
  const corner = useMemo(() => buildSoundtrackCorner(album), [album]);

  return (
    <div className="soundtrack-corner">
      <p className="agent-intro">{corner.intro}</p>
      <div className="soundtrack-corner-actions">
        <a
          href={corner.listenNow.href}
          target="_blank"
          rel="noopener noreferrer"
          className="listen-btn guess-listen-btn soundtrack-listen-btn"
        >
          {corner.listenNow.label}
        </a>
      </div>
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
        <div className="soundtrack-section-title">
          {corner.extraAnglesHeading}
        </div>
        <div className="soundtrack-angle-grid">
          {corner.extraAngles.map((angle) => (
            <div key={angle.key} className="soundtrack-angle-card">
              <div className="soundtrack-angle-label">{angle.label}</div>
              <div className="soundtrack-angle-title">{angle.title}</div>
              <p className="soundtrack-angle-copy">{angle.body}</p>
            </div>
          ))}
        </div>
      </div>
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
        <p className="soundtrack-recommendations-intro">
          {corner.recommendationsIntro}
        </p>
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
                  {recommendation.artist} - {recommendation.year}
                </div>
                <p className="soundtrack-recommendation-reason">
                  {recommendation.reason}
                </p>
                <a
                  href={recommendation.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="soundtrack-recommendation-link"
                >
                  {recommendation.cta}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
