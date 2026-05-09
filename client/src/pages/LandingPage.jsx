import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo2 from '../assets/images/logo2.png';
import { slide1, slide2, slide3 } from '../assets/images';
import "./Pages.css";

const FEATURES = [
  {
    icon: '🛰️',
    title: 'Live Incident Monitoring',
    desc: 'Track floods, landslides, and emergencies across all districts with real-time updates from field officers.',
  },
  {
    icon: '📦',
    title: 'Resource Availability',
    desc: 'View food, water, medical supplies, and shelter stock across warehouses to eliminate shortages.',
  },
  {
    icon: '✅',
    title: 'Verified Contributions',
    desc: 'Donations are reviewed before distribution — ensuring quality, transparency, and fair allocation.',
  },
  {
    icon: '🚚',
    title: 'Field Delivery Tracking',
    desc: 'Monitor dispatch vehicles and delivery routes until aid safely reaches communities.',
  },
];

const STATS = [
  { label: 'Active Incidents', value: '5', suffix: '', icon: '🚨', color: '#ef4444' },
  { label: 'Relief Items Ready', value: '18K', suffix: '+', icon: '📦', color: '#3b82f6' },
  { label: 'Ongoing Deliveries', value: '12', suffix: '', icon: '🚚', color: '#10b981' },
  { label: 'People Supported', value: '14,500', suffix: '+', icon: '🤝', color: '#f59e0b' },
];

const SLIDES = [
  { image: slide1, title: 'Emergency Response Teams', desc: 'Dedicated volunteers providing immediate assistance to affected communities across Sri Lanka.' },
  { image: slide2, title: 'Relief Supply Distribution', desc: 'Coordinated delivery of essential supplies including food, water, and medical aid to disaster zones.' },
  { image: slide3, title: 'Community Support Centers', desc: 'Temporary shelters and support hubs offering safety and resources for displaced families.' },
];

function LandingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [visibleStats, setVisibleStats] = useState(false);
  const statsRef = useRef(null);

  const nextSlide = () => setCurrentSlide(p => (p + 1) % SLIDES.length);
  const prevSlide = () => setCurrentSlide(p => (p - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    const interval = setInterval(nextSlide, 5500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleStats(true); },
      { threshold: 0.2 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lp-root">

      {/* ── NAV ── */}
      <header className={`lp-nav${scrolled ? ' lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-brand">
            <img src={logo2} alt="ReliefLink Logo" className="lp-brand-logo" />
            <div className="lp-brand-text">
              <span className="lp-brand-name">ReliefLink Lanka</span>
              <span className="lp-brand-sub">Real-time disaster coordination</span>
            </div>
          </div>
          <nav className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#stats" className="lp-nav-link">Impact</a>
            <button className="lp-btn-login" onClick={() => navigate('/login')}>
              <span>Staff Login</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        {/* Animated gradient blobs */}
        <div className="lp-hero-blob lp-blob-1" />
        <div className="lp-hero-blob lp-blob-2" />
        <div className="lp-hero-blob lp-blob-3" />

        <div className="lp-hero-inner">
          {/* Left copy */}
          <div className="lp-hero-copy">
            <div className="lp-eyebrow">
              <span className="lp-eyebrow-dot" />
              Sri Lanka's Disaster Coordination Platform
            </div>

            <h1 className="lp-hero-heading">
              When every second
              <span className="lp-hero-highlight"> counts,</span>
              <br />coordination saves lives.
            </h1>

            <p className="lp-hero-desc">
              ReliefLink Lanka connects emergency responders, government agencies,
              NGOs, and donors to deliver aid faster — ensuring support reaches the
              most affected communities across the country.
            </p>

            <div className="lp-hero-cta">
              <button className="lp-btn-primary" onClick={() => navigate('/login')}>
                Access Staff Dashboard
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <a href="#features" className="lp-btn-ghost">
                Explore Features
              </a>
            </div>

            {/* Inline micro-stats */}
            <div className="lp-hero-stats">
              {STATS.slice(0, 3).map(s => (
                <div key={s.label} className="lp-hero-stat">
                  <span className="lp-hero-stat-val" style={{ color: s.color }}>{s.value}{s.suffix}</span>
                  <span className="lp-hero-stat-lbl">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right slider */}
          <div className="lp-slider-wrap">
            <div className="lp-slider">
              <div className="lp-slider-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                {SLIDES.map((slide, i) => (
                  <div key={i} className="lp-slide">
                    <img src={slide.image} alt={slide.title} />
                    <div className="lp-slide-overlay">
                      <h3 className="lp-slide-title">{slide.title}</h3>
                      <p className="lp-slide-desc">{slide.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Arrows */}
              <button className="lp-slider-arrow lp-arrow-left" onClick={prevSlide} aria-label="Previous">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="lp-slider-arrow lp-arrow-right" onClick={nextSlide} aria-label="Next">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 4l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>

              {/* Dots */}
              <div className="lp-slider-dots">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    className={`lp-dot${i === currentSlide ? ' active' : ''}`}
                    onClick={() => setCurrentSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div className="lp-slider-badge">
              <span className="lp-badge-pulse" />
              <span>Live coordination active</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="lp-features">
        <div className="lp-section-inner">
          <div className="lp-section-label">Platform Capabilities</div>
          <h2 className="lp-section-heading">Everything you need in a crisis</h2>
          <p className="lp-section-sub">Built for speed and coordination — from the first alert to the last delivery.</p>

          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
                <div className="lp-feature-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats" className="lp-stats-section" ref={statsRef}>
        <div className="lp-stats-bg" />
        <div className="lp-section-inner">
          <div className="lp-section-label lp-label-light">Impact in Numbers</div>
          <h2 className="lp-section-heading lp-heading-light">Measured in lives reached</h2>

          <div className="lp-stats-grid">
            {STATS.map((s, i) => (
              <div key={i} className={`lp-stat-card${visibleStats ? ' lp-stat-visible' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="lp-stat-icon" style={{ background: `${s.color}20` }}>
                  <span>{s.icon}</span>
                </div>
                <div className="lp-stat-value" style={{ color: s.color }}>{s.value}{s.suffix}</div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-glow" />
        <div className="lp-cta-inner">
          <h2 className="lp-cta-heading">Ready to coordinate relief efforts?</h2>
          <p className="lp-cta-sub">Join emergency response officers, NGOs, and inventory managers on the platform.</p>
          <button className="lp-btn-primary lp-cta-btn" onClick={() => navigate('/login')}>
            Sign in to Dashboard
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-brand lp-footer-brand">
            <img src={logo2} alt="logo" className="lp-brand-logo lp-footer-logo" />
            <span className="lp-brand-name">ReliefLink Lanka</span>
          </div>
          <p className="lp-footer-copy">© {new Date().getFullYear()} ReliefLink Lanka. Disaster relief coordination platform.</p>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;
