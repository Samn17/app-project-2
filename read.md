# MediCare Plus

## Project Overview
MediCare Plus is a hospital management system built as a mobile-first React Native (Expo) frontend with a Python Flask backend and MySQL database. The app supports three user roles — admin, doctor, and patient — and includes features such as appointment booking, doctor discovery, prescriptions, billing, chat messaging, records, notifications, and analytics.

## Key Features
- Patient-facing booking flow with doctor search and appointment scheduling
- Doctor-facing patient management, prescription creation, schedule management, and chat
- Admin capabilities for managing doctors, patients, appointments, and billing
- Real-time messaging and notification support via Flask-SocketIO
- Persistent MySQL backend with schema and sample admin seed data
- Expo-powered React Native frontend that communicates with backend API routes

## Architecture
- Frontend: `App.js` using Expo and React Native
- Backend: `backend/app.py` with Flask, Flask-CORS, and Flask-SocketIO
- Database: MySQL schema in `backend/schema.sql`
- Database helper: `backend/database.py`
- Backend configuration: `backend/config.py`
- Database setup script: `backend/setup_db.py`
- API routes: `backend/routes/*.py`

## Repository Structure
- `App.js` — main React Native application file
- `app.json`, `babel.config.js` — Expo and Babel configuration
- `package.json` — frontend dependencies and Expo scripts
- `styles.css` — optional shared styles (likely web view)
- `backend/` — Flask backend service
  - `app.py` — Flask application entry point
  - `config.py` — database and secret configuration
  - `database.py` — MySQL query helpers and serialization
  - `setup_db.py` — script to create schema and stored procedures
  - `schema.sql` — MySQL schema definition and seed admin user
  - `routes/` — blueprint modules for each API domain

## Backend Setup
1. Install Python dependencies for the backend.
2. Install and run MySQL locally.
3. Update credentials in `backend/config.py` if needed.
   - `host`, `user`, `password`, `database`
4. Create and initialize the database:
   - `python backend/setup_db.py`
5. Start the backend server:
   - `python backend/app.py`

### Backend Configuration Notes
- Default database connection uses `mysql.connector`
- The app sets `app.secret_key` using `Config.SECRET_KEY`
- Socket.IO runs with `async_mode='threading'` and allows cross-origin requests
- Frontend sends `X-User-Id` and `X-User-Role` headers to persist session data

## Frontend Setup
1. Install dependencies with npm or yarn:
   - `npm install`
   - or `yarn install`
2. Start Expo:
   - `npm run start`
   - or `yarn start`
3. Run on a device/emulator:
   - `npm run android`
   - `npm run ios`
   - `npm run web`

### Frontend Endpoint Configuration
- Default API base URL is `http://localhost:5000/api`
- Override with environment variable:
  - `REACT_NATIVE_API_URL=http://<backend-ip>:5000/api`
- For mobile devices on the same network, use the machine IP or Expo tunnel if `localhost` is unavailable.

## Running the System
1. Start MySQL and verify it is reachable.
2. Run `python backend/setup_db.py` to ensure the schema exists.
3. Run `python backend/app.py` to launch the Flask API on port 5000.
4. Run `npx expo start` from the project root to launch Expo.
5. Open the app in Expo Go, an emulator, or a web browser.

## API Notes
- Base API path: `/api`
- Main backend blueprints and endpoints:
  - `/api/login`, `/api/register`, `/api/logout`, `/api/user`
  - `/api/doctors/*`
  - `/api/patients/*`
  - `/api/appointments/*`
  - `/api/prescriptions/*`
  - `/api/bills/*`
  - `/api/notifications/*`
  - `/api/records/*`
  - `/api/messages/*`
  - `/api/stats/*`
  - `/api/schedules/*`
  - `/api/search/*`
  - `/api/contact/*`

## Notes for Developers
- The app currently uses a local MySQL user password in `backend/config.py`; change it before deploying.
- The admin seed user is inserted in `backend/schema.sql`.
- The backend is configured with permissive CORS to support Expo development.
- Session state is loaded from custom request headers and not just cookies.

## Recommended Improvements
- Add password hashing and secure authentication flows
- Replace static `SECRET_KEY` with an environment variable
- Add production configuration for CORS and Socket.IO
- Use `.env` or secret management for database credentials
- Add tests for backend routes and frontend API integration

## Contact
For further development, inspect the `backend/routes/` blueprint modules and the React Native UI logic inside `App.js`.
