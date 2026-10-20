# Disaster Relief Resource Allocation and Coordination System

A web-based disaster relief management system for tracking relief requests, managing resource inventory, and allocating supplies across relief centres.

## Overview

During disasters, coordinating requests, available supplies, and relief centres can be challenging. This project aims to provide a centralized platform to manage these activities and improve visibility into resource availability and allocation status.

## Features

- User authentication with role-based access
- Create and track relief requests
- Manage relief centres and their locations
- Track inventory by resource category, unit, quantity, and centre
- Allocate available resources to compatible relief requests
- Dashboard summaries for requests, inventory, centres, and allocations
- Interactive map using Leaflet and OpenStreetMap (planned/in progress)
- Road-route visualization using OSRM (planned/in progress)

> Update the map and routing descriptions after those features are implemented and tested.

## Technology Stack

### Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript
- MongoDB with Mongoose
- JWT authentication
- bcryptjs for password hashing

### Maps and Routing
- Leaflet
- OpenStreetMap
- OSRM (planned/in progress)

## Project Structure

```text
disaster-relief-system/
├── frontend/       # Next.js frontend
├── backend/        # Express + TypeScript API
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js and npm
- MongoDB Community Server running locally, or a MongoDB connection string
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/disaster-relief-system.git
cd disaster-relief-system
```

Replace `YOUR_USERNAME` with the GitHub account that owns the repository.

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/disaster_relief
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
```

Use your own strong secret for `JWT_SECRET`. Never commit `.env` or real API keys to Git.

Start the backend using the script defined in `backend/package.json`. If a `dev` script exists:

```bash
npm run dev
```

The API is expected to run at `http://localhost:5000`.

### 3. Configure the frontend

Open a separate terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

> If the available npm scripts differ, check the `scripts` section in each `package.json`.

## API Overview

The backend includes or is being developed around these endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a field user |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Get the authenticated user |
| GET | `/api/centres` | List relief centres |
| POST | `/api/centres` | Create a relief centre |
| GET | `/api/resources` | List resource inventory |
| POST | `/api/resources` | Add inventory |
| GET | `/api/requests` | List accessible relief requests |
| POST | `/api/requests` | Create a relief request |
| GET | `/api/allocations` | View allocations (authorized roles) |
| POST | `/api/allocations` | Allocate resources (authorized roles) |
| GET | `/api/dashboard/stats` | Retrieve dashboard statistics (authorized roles) |

Protected endpoints require authentication and may enforce role-based permissions. Check the backend routes and controllers for exact permissions and request/response formats.

## Git Workflow for Contributors

The project uses separate branches for team members and a stable `main` branch.

- `main` — stable, reviewed changes
- `aryan` — Aryan's development branch
- `ravinder` — Ravinder's development branch
- `priyanshu` — Priyanshu's development branch

### Daily workflow

```bash
# Check your current branch
git branch

# Switch to your own branch (replace with your branch name)
git switch aryan

# Check changes
git status

# Commit and push your work
git add .
git commit -m "feat: describe your change"
git push
```

Replace `aryan` with your own branch name. Open a Pull Request to merge changes into `main`; review and test changes before merging.

## Security Notes

- Keep `.env` and `.env.local` out of Git.
- Never commit JWT secrets, database credentials, or API keys.
- Do not use production credentials in local development.
- The current frontend token handling is intended for a student prototype and should be reviewed before production use.
- Validate permissions and input data on the backend; frontend checks alone are not security controls.

## Current Limitations

- Map and route features may still be under development.
- Allocation workflow and partial-allocation handling need further validation.
- Local MongoDB must be running unless a remote connection string is configured.
- This is an academic/student project and is not represented as a production-ready emergency response system.

## Future Improvements

- Interactive map of relief centres and requests
- Road-route visualization with OSRM
- Allocation status workflow (allocated, dispatched, delivered)
- Improved validation and audit history
- Automated tests and deployment configuration

## Contributors

- Aryan — project development
- Ravinder — project development
- Priyanshu — project development

## License

No license has been selected yet. Add a `LICENSE` file if you want to specify how others may use, modify, and distribute this project.
