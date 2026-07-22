<!-- # 🚀 PrepMentor - AI Interview Preparation Platform

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
- Clean Folder Structure -->


<div align="center">

# 🚀 PrepMentor
### AI Powered Interview Preparation Platform

<img src="https://img.shields.io/badge/Status-In%20Development-orange" />
<img src="https://img.shields.io/badge/Backend-Node.js-success" />
<img src="https://img.shields.io/badge/Frontend-React-blue" />
<img src="https://img.shields.io/badge/Database-MongoDB-green" />
<img src="https://img.shields.io/badge/Language-TypeScript-blue" />

---

### 🎯 Prepare • Practice • Improve

An AI Powered Interview Preparation Platform that helps candidates prepare for technical interviews through AI-generated interviews, feedback, analytics and performance tracking.

</div>

---

# 📑 Table of Contents

- Project Overview
- Features
- Tech Stack
- Project Structure
- System Architecture
- Backend Flow
- Frontend Flow
- Authentication Flow
- Folder Structure
- Current Progress
- Future Scope

---

# 📌 Project Overview

PrepMentor is a Full Stack AI Interview Preparation Platform designed to help students practice technical interviews in a real interview environment.

The application allows users to

- 👤 Register/Login
- 🎤 Attend AI Interviews
- 🤖 Receive AI Feedback
- 📊 Track Interview Analytics
- 📈 Monitor Improvement
- 📝 View Previous Interviews

The project follows a **Layered Architecture** to keep the code modular, scalable and maintainable.

---

# 🚀 Current Features

## ✅ Backend

- User Authentication
- Password Hashing
- JWT Authentication
- Protected Routes
- Global Error Handling
- Response Helpers
- MongoDB Integration

---

## ✅ Frontend

- React + TypeScript
- TanStack Router
- Zustand Authentication Store
- Axios Service Layer
- Login Page
- Signup Page
- Dashboard Layout
- Sidebar Component

---

# 🛠 Tech Stack

## Frontend

| Technology | Purpose |
|------------|----------|
| React | UI Development |
| TypeScript | Type Safety |
| Tailwind CSS | Styling |
| Zustand | Global State Management |
| Axios | API Calls |
| TanStack Router | Routing |
| Vite | Development Environment |

---

## Backend

| Technology | Purpose |
|------------|----------|
| Node.js | Runtime |
| Express.js | Backend Framework |
| TypeScript | Type Safety |
| MongoDB | Database |
| Mongoose | ODM |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| dotenv | Environment Variables |

---

# 📂 Project Structure

```
Interview Platform
│
├── client
│     │
│     ├── src
│     │     ├── components
│     │     ├── pages
│     │     ├── routes
│     │     ├── services
│     │     ├── store
│     │     ├── types
│     │     └── utils
│     │
│     └── public
│
├── server
│     │
│     ├── src
│     │     ├── config
│     │     ├── controllers
│     │     ├── middlewares
│     │     ├── models
│     │     ├── routes
│     │     ├── utils
│     │     ├── app.ts
│     │     └── server.ts
│     │
│     └── package.json
│
└── README.md
```

---

# 🏛 High Level Architecture

```text
                        ┌────────────────────┐
                        │      React UI      │
                        └─────────┬──────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │   Zustand Auth Store     │
                    └─────────┬────────────────┘
                              │
                              ▼
                    ┌──────────────────────────┐
                    │      Auth Service        │
                    └─────────┬────────────────┘
                              │
                              ▼
                    ┌──────────────────────────┐
                    │        Axios API         │
                    └─────────┬────────────────┘
                              │
                              ▼
                    ┌──────────────────────────┐
                    │      Express Server      │
                    └─────────┬────────────────┘
                              │
          ┌───────────────────┼────────────────────┐
          ▼                   ▼                    ▼
 ┌───────────────┐   ┌────────────────┐   ┌────────────────┐
 │ Auth Routes   │   │ Interview APIs │   │ Feedback APIs  │
 └──────┬────────┘   └───────┬────────┘   └───────┬────────┘
        │                    │                    │
        ▼                    ▼                    ▼
 ┌────────────────────────────────────────────────────┐
 │                 Controllers                        │
 └───────────────────────┬────────────────────────────┘
                         │
                         ▼
               ┌───────────────────┐
               │   MongoDB Atlas   │
               └───────────────────┘
```

---

# 🔥 Backend Request Flow

```text
Client Request
      │
      ▼
Express Server
      │
      ▼
Routes
      │
      ▼
Controllers
      │
      ▼
Business Logic
      │
      ▼
MongoDB
      │
      ▼
Response Helper
      │
      ▼
JSON Response
```

---

# ⚛ Frontend Flow

```text
User
 │
 ▼
React Page
 │
 ▼
handleSubmit()
 │
 ▼
Zustand Store
 │
 ▼
Auth Service
 │
 ▼
Axios
 │
 ▼
Backend API
 │
 ▼
Store Updated
 │
 ▼
UI Re-render
```

---

# 🎯 Why Layered Architecture?

Instead of allowing the UI to communicate directly with the backend, every layer has a single responsibility.

```
Presentation Layer
        │
        ▼
State Management
        │
        ▼
Service Layer
        │
        ▼
API Layer
        │
        ▼
Backend
```

### Benefits

- Cleaner Code
- Reusable Components
- Easy Debugging
- Better Scalability
- Separation of Concerns
- Easy Team Collaboration

---

# 🔐 Authentication Module Architecture

Authentication is the first module implemented in the project.

It provides

- User Registration
- User Login
- Password Hashing
- JWT Authentication
- Protected Routes
- User Session Management

---

# 🔄 Authentication Workflow

```text
                 User
                   │
                   ▼
           Login / Signup Page
                   │
                   ▼
             handleSubmit()
                   │
                   ▼
            Zustand Auth Store
                   │
                   ▼
             Auth Service
                   │
                   ▼
                 Axios
                   │
                   ▼
        POST /api/auth/login
                   │
                   ▼
             Express Route
                   │
                   ▼
            Auth Controller
                   │
                   ▼
             MongoDB User
                   │
         ┌─────────┴─────────┐
         │                   │
     User Exists?          No User
         │                   │
         ▼                   ▼
 Compare Password       Return Error
         │
         ▼
 Password Correct?
         │
         ▼
 Generate JWT Token
         │
         ▼
 Send User + Token
         │
         ▼
 Zustand Stores User
         │
         ▼
 Navigate Dashboard
```

---

# 📦 Signup Flow

```text
User

│

▼

Signup Form

│

▼

Validate Inputs

│

▼

Auth Store

│

▼

Auth Service

│

▼

POST /signup

│

▼

Controller

│

▼

Validate Request

│

▼

Check Existing User

│

▼

Hash Password

│

▼

Save User

│

▼

Response Helper

│

▼

Frontend
```

---

# 🔑 Login Flow

```text
User

│

▼

Login Page

│

▼

handleSubmit()

│

▼

login()

│

▼

Auth Store

│

▼

Auth Service

│

▼

Axios

│

▼

Backend

│

▼

Find User

│

▼

Compare Password

│

▼

Generate JWT

│

▼

Return Token

│

▼

Store Token

│

▼

Navigate Dashboard
```

---

# 🔒 JWT Authentication Flow

```text
                Login Successful

                       │

                       ▼

              Generate JWT Token

                       │

                       ▼

                Send Token

                       │

                       ▼

          Frontend stores Token

                       │

                       ▼

      Protected API Request

                       │

                       ▼

Authorization: Bearer Token

                       │

                       ▼

             Auth Middleware

                       │

                       ▼

            Verify JWT Token

                       │

             ┌─────────┴─────────┐

             │                   │

          Valid              Invalid

             │                   │

             ▼                   ▼

      Next Controller        Return 401
```

---

# 🔐 Password Security

Passwords are never stored directly inside MongoDB.

```text
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

$2b$10$QnA3R8FhGk2...
```

During Login

```text
Entered Password

↓

bcrypt.compare()

↓

Stored Password

↓

Match ?

↓

Generate Token
```

---

# 🧠 Backend Architecture

```text
                Express Server

                       │

        ┌──────────────┼──────────────┐

        ▼              ▼              ▼

     Routes        Middlewares     Config

        │

        ▼

   Controllers

        │

        ▼

   Business Logic

        │

        ▼

      Models

        │

        ▼

    MongoDB Atlas
```

---

# 📂 Backend Components

## Routes

Routes are responsible only for mapping URLs to controllers.

Example

```
POST /login

↓

login()
```

No business logic is written here.

---

## Controllers

Controllers contain the application's business logic.

Responsibilities

- Validate Request
- Query Database
- Hash Password
- Compare Password
- Generate JWT
- Return Response

---

## Models

Models define MongoDB collections.

Example

```
User

Interview

Question

Answer
```

Mongoose is used for interacting with MongoDB.

---

## Middlewares

Current Middlewares

```
Auth Middleware

↓

Verify JWT

↓

Attach userId

↓

Next()
```

```
Error Handler

↓

Catch Errors

↓

Return Proper Response
```

---

## Utils

Utility functions used throughout the project.

```
generateToken()

↓

Create JWT
```

```
sendSuccess()

↓

Standard Response Format
```

```
asyncHandler()

↓

Catch Async Errors
```

---

# 🔄 Request Lifecycle

```text
Frontend

↓

Axios

↓

Express

↓

Routes

↓

Middleware

↓

Controller

↓

Database

↓

Controller

↓

sendSuccess()

↓

Frontend
```

---

# ⚛ Frontend Architecture

```text
React Components

│

▼

TanStack Router

│

▼

Page

│

▼

Zustand Store

│

▼

Service Layer

│

▼

Axios

│

▼

Backend
```

---

# 📂 Frontend Components

## Pages

Current Pages

```
Landing Page

Login Page

Signup Page

Dashboard Page
```

---

## Zustand Store

Responsibilities

- Store User
- Store Token
- Store Authentication State
- Store Loading State
- Store Error State
- Login
- Signup
- Logout
- Initialize Authentication

---

## Service Layer

The Service Layer communicates with the backend.

Responsibilities

```
signup()

login()

getCurrentUser()
```

No UI logic is written here.

---

## Axios

Axios is responsible only for making HTTP requests.

Example

```
POST /login

↓

Response

↓

Return Data
```

---

# 🧩 Why We Use Zustand?

Instead of every component making API requests

```
Component

↓

Backend
```

we use

```
Component

↓

Store

↓

Service

↓

Backend
```

Benefits

- Single Source of Truth
- Better Reusability
- Cleaner Components
- Easy Debugging
- Centralized Authentication

---

# 🗂 Current Authentication Routes

| Method | Route | Description |
|---------|-------|-------------|
| POST | /api/auth/signup | Register User |
| POST | /api/auth/login | Login User |
| GET | /api/auth/me | Get Current User |

---

# 📌 Current Progress

## Backend

- [x] MongoDB Connection
- [x] User Model
- [x] Authentication Routes
- [x] Signup API
- [x] Login API
- [x] JWT Generation
- [x] Password Hashing
- [x] Global Error Handler
- [x] Protected Routes
- [x] Response Helpers

---

## Frontend

- [x] React Setup
- [x] Tailwind Setup
- [x] TanStack Router
- [x] Zustand Store
- [x] Axios Service Layer
- [x] Login Page
- [x] Signup Page
- [x] Dashboard Layout
- [x] Sidebar Component

---

# 🚀 Upcoming Features

- AI Interview Generation
- Interview Scheduling
- Voice Recording
- AI Feedback
- Interview Analytics
- Performance Dashboard
- Resume Upload
- Question Bank
- Mock Interview Sessions
- Admin Dashboard

---

# 🎯 Project Design Principles

✔ Layered Architecture

✔ Separation of Concerns

✔ Reusable Components

✔ Centralized Error Handling

✔ Clean Folder Structure

✔ Scalable Backend

✔ Secure Authentication

✔ Maintainable Code

✔ Type Safety

✔ Team Collaboration

---

# 👨‍💻 Team Workflow

```
Feature Planning
        │
        ▼
Backend Development
        │
        ▼
API Testing (Postman)
        │
        ▼
Frontend Integration
        │
        ▼
UI Testing
        │
        ▼
Git Commit
        │
        ▼
Push to GitHub
```

---

# 📖 Learning Outcomes

Through this project we are learning:

- Full Stack Development
- REST API Design
- Authentication using JWT
- MongoDB Data Modeling
- State Management with Zustand
- React Routing
- Error Handling
- Layered Architecture
- Clean Code Practices
- Team Collaboration using Git & GitHub

---

<div align="center">

## 🚀 Built with ❤️ using MERN + TypeScript

**PrepMentor - Learn • Practice • Improve**

</div>