# Smart Disaster Relief Resource Allocation and Tracking System

This repository contains the Smart Disaster Relief System — a full-stack application to coordinate disaster reports, donations, inventory, resource requests, allocations, and transport tracking. It includes an Express/MongoDB backend, a React + Vite frontend, and a small Python ML module for prediction tasks.

**Key features**
- Disaster reporting and needs assessment
- Donation intake and categorization
- Inventory management with package sizing and backfill scripts
- Resource request, allocation, and transport tracking
- Prediction/ML components for demand forecasting

**Repository layout**
- `server/` — Express backend, API controllers, routes, middleware, scripts, and seeds
- `client/` — React + Vite frontend
- `ml/` — Python scripts for training and a prediction API
- `data/` — CSV datasets used for training and analysis
- `models/`, `controllers/`, `services/`, `routes/` — server-side application code
- `scripts/` — utility scripts for backfills and data population

## Quickstart (Development)

Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- MongoDB instance (local or hosted)
- Python 3.10+ for ML tasks (optional)

1. Clone the repo

	git clone <repo-url>
	cd smart-disaster-relief-system

2. Install root / server / client dependencies

	# Install server deps
	cd server
	npm install

	# In another shell, install client deps
	cd ../client
	npm install

3. Configure environment (server)

Create a `.env` file in `server/` with values like:

- `MONGO_URI` — MongoDB connection string
- `PORT` — API port (e.g. 4000)
- `JWT_SECRET` — secret for auth tokens
- `EMAIL_*` — SMTP settings if email is used

4. Run services

	# Start backend (dev)
	cd server
	npm run dev

	# Start frontend (dev)
	cd ../client
	npm run dev

The frontend runs via Vite and will proxy or call the API at the configured server endpoint.

## ML module
The `ml/` folder contains `train_model.py` and `predict_api.py`. To run ML tasks:

	python -m venv .venv
	.\.venv\Scripts\activate    # Windows
	pip install -r ml/requirements.txt   # create this file if needed
	python ml/train_model.py

`predict_api.py` can be used to serve a simple prediction endpoint used by the backend or for experimentation.

## Scripts and utilities
- Backfills and data helpers live in `server/scripts/` (e.g., `populateMockInventory.js`, backfill scripts).
- Tests exist under `server/tests/` (some integration tests use Node's test runner / `supertest`).

Example server scripts

- `npm run start` — start server
- `npm run dev` — start server with `nodemon`
- `npm run populate:inventory` — populate mock inventory

## Testing
Run API tests from `server/`:

	cd server
	npm test    # or run specific test files with node --test

## Contributing
- Open issues for bugs or feature requests.
- Follow existing code patterns and add tests for new backend behavior.

## Notes & Caveats
- Environment variables and secure keys are not committed. Create `.env` locally.
- Some scripts assume MongoDB collections exist or are seeded — use `server/seeds/` utilities as needed.

## License
MIT
