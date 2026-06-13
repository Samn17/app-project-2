# 🏥 MediCare Plus – Hospital Management System

MediCare Plus is a modern Hospital Management System designed to digitalize hospital workflows and improve communication between patients, doctors, and administrators. The system provides a centralized platform for appointment booking, patient record management, and hospital administration.

Built with a scalable architecture using a React Native mobile frontend and a secure Flask REST API backend, MediCare Plus helps healthcare organizations streamline operations and improve service delivery.

## 🎯 Objectives

* Digitize hospital operations
* Improve communication between patients, doctors, and administrators
* Centralize patient medical records
* Automate appointment scheduling
* Enhance healthcare efficiency and service quality

## ✨ Features

| Feature                             | Description                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| 🔒 Secure Authentication            | JWT/session-based authentication with role-based access control for secure system access.      |
| 📅 Appointment Booking System       | Patients can book, manage, and track appointments with doctors in real time.                   |
| 👨‍⚕️ Doctor Appointment Management | Doctors can view appointments, manage schedules, and update patient prescriptions.             |
| 📋 Patient Medical Records          | Centralized storage and access to patient medical history, prescriptions, and reports.         |
| 🖥️ Admin Dashboard                 | Complete system control for managing doctors, patients, appointments, and hospital activities. |
| 🔔 Notification System              | Automated notifications for appointments, updates, and important healthcare events.            |
| ✅ Data Validation & Security        | Input validation, secure APIs, and encrypted data handling for data integrity.                 |
| 🎨 User-Friendly Interface          | Modern mobile-first design optimized for usability and accessibility.                          |

## 👥 System Roles

MediCare Plus follows a three-tier role architecture to ensure secure and organized access to system resources.

### 🛡️ Admin

* Manage doctors and patients
* Approve or reject appointment requests
* Monitor overall system activity
* Access complete administrative dashboard
* Maintain hospital records and operations

### 👨‍⚕️ Doctor

* Manage availability and schedules
* View upcoming appointments
* Access patient medical records
* Update prescriptions and treatment reports
* Monitor daily patient workflow

### 👤 Patient

* Register and securely log in
* Browse available doctors
* Book and manage appointments
* View prescriptions and medical history
* Receive appointment notifications and updates

## 💻 Tech Stack

| Layer          | Technology                         |
| -------------- | ---------------------------------- |
| Frontend       | React Native                       |
| Backend        | Python Flask                       |
| Database       | MySQL                              |
| API            | RESTful APIs                       |
| Authentication | JWT / Session-Based Authentication |

## 📂 Project Structure

```text
MediCarePlus/
├── backend/
│   ├── routes/                 # API routes for users, appointments, and records
│   ├── models/                 # Database models
│   ├── app.py                  # Flask application entry point
│   ├── config.py               # Configuration settings
│   ├── database.py             # Database connection utility
│   └── requirements.txt        # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── screens/            # Application screens
│   │   ├── components/         # Reusable UI components
│   │   ├── navigation/         # Navigation configuration
│   │   ├── services/           # API service layer
│   │   └── assets/             # Images and resources
│   │
│   ├── App.js                  # Main React Native application
│   └── package.json            # Node dependencies
│
└── README.md                   # Project documentation
```

## ⚙️ Installation & Setup

### 🔹 Backend Setup (Flask)

```bash
git clone <repository-url>
cd backend

pip install -r requirements.txt

python app.py
```

### 🔹 Frontend Setup (React Native)

```bash
cd frontend

npm install

npx react-native run-android
```

## 🚀 How to Run the Project

1. Start the MySQL server.
2. Configure the database connection.
3. Run the Flask backend server.
4. Launch the React Native application.
5. Connect the frontend with backend APIs.
6. Login as Patient, Doctor, or Admin.

## 🔐 Security Features

* JWT / Session-Based Authentication
* Role-Based Access Control (RBAC)
* Secure REST API Communication
* Encrypted Data Handling
* Protected User Access
* Input Validation and Sanitization

## 📌 Future Enhancements

* Telemedicine and Video Consultation
* Online Payments Integration
* AI-Based Health Assistant
* Electronic Health Record (EHR) Integration
* Advanced Analytics Dashboard
* Multi-Hospital Support
