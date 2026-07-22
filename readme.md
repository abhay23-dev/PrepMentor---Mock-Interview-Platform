# 🚀 PrepMentor - AI Interview Preparation Platform

## 📌 Project Overview

PrepMentor is an AI-powered Interview Preparation Platform that helps students prepare for technical interviews through AI-generated interview sessions, performance analysis, and personalized feedback.

This document describes the architecture implemented so far, focusing on the **Authentication Module**, which forms the foundation of the application.

---

# 🏗️ Tech Stack

## Backend

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose
- JWT (JSON Web Token)
- bcryptjs
- dotenv

## Frontend

- React
- TypeScript
- Vite
- TanStack Router
- Zustand
- Axios
- Tailwind CSS

---

# 📂 Backend Folder Structure

```
src
│
├── config
│     └── db.ts
│
├── controllers
│     └── authControllers.ts
│
├── middlewares
│     ├── authMiddleware.ts
│     └── errorHandler.ts
│
├── models
│     └── User.ts
│
├── routes
│     └── authRoutes.ts
│
├── utils
│     ├── responseHelpers.ts
│     └── tokenHelpers.ts
│
├── app.ts
└── server.ts
```

---

# 🏗️ Backend Flow

```
Client Request

        │

        ▼

Express Server

        │

        ▼

Routes

        │

        ▼

Controller

        │

        ▼

Database (MongoDB)

        │

        ▼

Response Helper

        │

        ▼

Client
```

Every request follows this flow.

The controller never directly communicates with the frontend.

Instead,

Controller → Response Helper → Client

This keeps responses consistent across the project.

---

# 🔐 Authentication Module

The Authentication module currently supports

- User Signup
- User Login
- JWT Token Generation
- Protected Routes
- Current Logged-in User

---

## Signup Flow

```
Frontend

↓

POST /api/auth/signup

↓

Auth Route

↓

Signup Controller

↓

Input Validation

↓

Check Existing User

↓

Hash Password (bcrypt)

↓

Save User

↓

Return Success Response
```

---

### Password Security

Passwords are never stored directly.

Flow:

```
User Password

↓

bcrypt.hash()

↓

Encrypted Password

↓

MongoDB
```

Example

```
Abhay@123

↓

$2b$10$asdadadadadad...
```

---

## Login Flow

```
Frontend

↓

POST /api/auth/login

↓

Find User

↓

Compare Password

↓

Generate JWT

↓

Return User + Token
```

---

### JWT Generation

After successful login

```
User ID

↓

generateToken()

↓

JWT Token

↓

Frontend
```

The frontend stores the token inside Local Storage.

---

## Protected Route Flow

```
Client Request

↓

Authorization Header

↓

Auth Middleware

↓

Verify JWT

↓

Extract userId

↓

Next Controller

↓

Database

↓

Return User
```

---

# 🧠 Error Handling

The project uses centralized error handling.

Instead of writing

```
res.status(...).json(...)
```

inside every controller,

controllers simply throw

```ts
throw new AppError("Message",400);
```

The Error Middleware catches every error and formats the response.

Benefits

- Cleaner Controllers
- Centralized Logic
- Consistent Error Response
- Easier Debugging

---

# 📦 Response Helper

Every successful response is returned using

```ts
sendSuccess()
```

instead of manually writing

```ts
res.status(...).json(...)
```

Benefits

- Consistent API Response
- Less Repeated Code
- Easy Maintenance

---

# 🛡 Authentication Middleware

Protected routes use

```ts
requireAuth
```

Flow

```
Incoming Request

↓

Read Authorization Header

↓

Verify JWT

↓

Extract User ID

↓

Attach userId to Request

↓

Next()
```

Controllers don't need to verify JWT again.

---

# 🖥 Frontend Folder Structure

```
src

├── components
│
├── pages
│     ├── LandingPage
│     ├── LoginPage
│     ├── SignupPage
│     └── DashboardPage
│
├── routes
│     ├── __root.tsx
│     ├── index.tsx
│     ├── login.tsx
│     ├── signup.tsx
│     └── dashboard.tsx
│
├── services
│     ├── api.ts
│     └── authService.ts
│
├── store
│     └── authStore.ts
│
└── types
```

---

# 🌐 Frontend Architecture

The frontend follows a layered architecture.

```
UI

↓

Zustand Store

↓

Service Layer

↓

Axios

↓

Backend
```

Pages never directly communicate with the backend.

---

# Why Zustand?

Pages only call

```ts
login()
signup()
logout()
```

The store is responsible for

- State Management
- Local Storage
- API Calls
- Authentication State

This keeps components clean.

---

# Authentication Flow (Frontend)

```
Login Page

↓

User Clicks Login

↓

handleSubmit()

↓

login()

↓

Auth Store

↓

Auth Service

↓

Axios

↓

Backend
```

---

# Auth Service

The Auth Service contains all HTTP requests.

Responsibilities

- Signup Request
- Login Request
- Current User Request

UI components never use Axios directly.

---

# Zustand Store

Responsibilities

- Store User
- Store JWT Token
- Authentication State
- Loading State
- Logout
- Initialize User

---

# Routing

The project uses

TanStack Router

Current Routes

```
/

↓

Landing Page

/login

↓

Login Page

/signup

↓

Signup Page

/dashboard

↓

Dashboard
```

---

# Layout Architecture

Upcoming Dashboard Layout

```
AppLayout

│

├── Sidebar

├── TopNavbar

└── Page Content
```

Every authenticated page will reuse this layout.

---

# Current Progress

## Backend

- Database Connection
- User Model
- Authentication APIs
- JWT Authentication
- Password Hashing
- Protected Routes
- Global Error Handling
- Response Helpers

---

## Frontend

- React Setup
- TanStack Router
- Zustand Authentication Store
- Axios Service Layer
- Login Page
- Signup Page
- Dashboard Skeleton
- Sidebar Component
- App Layout Structure

---

# Current Development Workflow

```
Frontend

↓

Store

↓

Service

↓

Axios

↓

Backend Routes

↓

Controllers

↓

MongoDB
```

---

# Future Modules

- AI Interview Session
- Question Management
- Feedback Generation
- Analytics Dashboard
- Interview History
- User Profile
- Admin Panel

---

# Project Design Principles

- Separation of Concerns
- Reusable Components
- Layered Architecture
- Centralized Error Handling
- Reusable API Responses
- Authentication using JWT
- State Management using Zustand
- Component-based UI
- Clean Folder Structure