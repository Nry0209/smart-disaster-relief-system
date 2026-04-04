import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logo, slide1, slide2, slide3 } from '../assets/images';
import "./Pages.css";

function LandingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      image: slide1,
      title: 'Emergency Response Teams',
      description: 'Dedicated volunteers providing immediate assistance to affected communities across Sri Lanka.'
    },
    {
      id: 2,
      image: slide2,
      title: 'Relief Supply Distribution',
      description: 'Coordinated delivery of essential supplies including food, water, and medical aid to disaster zones.'
    },
    {
      id: 3,
      image: slide3,
      title: 'Community Support Centers',
      description: 'Temporary shelters and support hubs offering safety and resources for displaced families.'
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-page page-base">
      {/* TOP BAR */}
      <header className="landing-topbar">
        <div className="landing-brand brand-base">
          <img src={logo} alt="System Logo" className="landing-brand-logo brand-logo-base" />
          <div>
            <h2>ReliefLink Lanka</h2>
            <p>Real-time disaster coordination across Sri Lanka</p>
          </div>
        </div>

        <div className="landing-top-actions">
          <button
            className="btn-base btn-light"
            onClick={() => navigate("/public-donation")}
          >
            Donate Now
          </button>

          <button
            className="btn-base btn-primary"
            onClick={() => navigate("/login")}
          >
            Staff Login
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="landing-hero container-grid">
        <div className="landing-hero-left">

          <h1>When every second counts, coordination saves lives.</h1>

          <p className="landing-description">
            ReliefLink Lanka connects emergency responders, government agencies,
            NGOs, and donors to deliver aid faster, reduce duplication, and ensure
            support reaches the most affected communities across the country.
          </p>

          <div className="landing-hero-actions">
            <button
              className="btn-base btn-primary"
              onClick={() => navigate("/login")}
            >
              Access Staff Dashboard
            </button>

            <button
              className="btn-base btn-light"
              onClick={() => navigate("/public-donation")}
            >
              Donate Now
            </button>
          </div>

          {/* FEATURE CARDS */}
          <div className="landing-feature-grid">
            <div className="landing-feature-card card-base">
              <h3>Live Incident Monitoring</h3>
              <p>
                Track ongoing floods, landslides, and emergencies across districts
                with real-time updates from field officers and response teams.
              </p>
            </div>

            <div className="landing-feature-card card-base">
              <h3>Resource Availability Overview</h3>
              <p>
                View available food packs, medical supplies, water, and shelter
                stock across warehouses to avoid shortages and overstocking.
              </p>
            </div>

            <div className="landing-feature-card card-base">
              <h3>Verified Public Contributions</h3>
              <p>
                Donations are reviewed and approved before distribution, ensuring
                quality, transparency, and fair allocation to affected areas.
              </p>
            </div>

            <div className="landing-feature-card card-base">
              <h3>Field Delivery Tracking</h3>
              <p>
                Monitor dispatch vehicles, delivery routes, and real-time updates
                until aid reaches communities safely.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE IMAGE SLIDER */}
        <div className="landing-hero-right">
          <div className="landing-slider">
            <div className="landing-slider-container">
              <div 
                className="landing-slider-track"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {slides.map((slide) => (
                  <div key={slide.id} className="landing-slide">
                    <img src={slide.image} alt={slide.title} />
                    <div className="landing-slide-overlay">
                      <h3 className="landing-slide-title">{slide.title}</h3>
                      <p className="landing-slide-description">{slide.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="landing-slider-controls">
                <button 
                  className="landing-slider-btn"
                  onClick={prevSlide}
                  aria-label="Previous slide"
                >
                  ‹
                </button>
                <button 
                  className="landing-slider-btn"
                  onClick={nextSlide}
                  aria-label="Next slide"
                >
                  ›
                </button>
              </div>

              <div className="landing-slider-indicators">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    className={`landing-slider-dot ${index === currentSlide ? 'active' : ''}`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="landing-stats">
        <div className="landing-stat-card card-base">
          <span>Active Incidents</span>
          <h2>5</h2>
          <p>
            Floods and landslides currently reported in Western and Sabaragamuwa provinces
          </p>
        </div>

        <div className="landing-stat-card card-base">
          <span>Relief Items Available</span>
          <h2>18K+</h2>
          <p>
            Food packs, water bottles, medical kits, and temporary shelter resources
          </p>
        </div>

        <div className="landing-stat-card card-base">
          <span>Ongoing Deliveries</span>
          <h2>12</h2>
          <p>
            Active dispatch vehicles delivering supplies to affected communities
          </p>
        </div>

        <div className="landing-stat-card card-base">
          <span>People Supported</span>
          <h2>14,500+</h2>
          <p>
            Individuals assisted through coordinated disaster response efforts
          </p>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;

