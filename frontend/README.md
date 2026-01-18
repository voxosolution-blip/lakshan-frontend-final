# Dairy/Yogurt ERP - Frontend

Modern React + TypeScript frontend for the Dairy ERP Management System.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/          # Shared components
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── LoginRoute.tsx
│   │   └── layout/          # Layout components
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── MainLayout.tsx
│   ├── pages/               # Page components
│   │   ├── auth/
│   │   │   └── Login.tsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx
│   │   ├── farmers/
│   │   ├── milk/
│   │   ├── inventory/
│   │   ├── production/
│   │   ├── sales/
│   │   ├── returns/
│   │   ├── payments/
│   │   ├── cheques/
│   │   ├── expenses/
│   │   └── reports/
│   ├── context/
│   │   └── AuthContext.tsx   # Authentication context
│   ├── services/
│   │   └── api.ts            # API service layer
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── App.tsx               # Main app component
│   └── main.tsx              # Entry point
├── index.html
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 🎨 Features

- ✅ Modern UI with Tailwind CSS
- ✅ Responsive sidebar navigation
- ✅ User authentication (JWT)
- ✅ Role-based access control
- ✅ Dashboard with statistics
- ✅ Clean, professional design
- ✅ TypeScript for type safety
- ✅ React Router for navigation

## 🔐 Authentication

The app uses JWT tokens stored in localStorage. After login, tokens are automatically included in API requests.

Default credentials (after running seed):
- Username: `admin`
- Password: `admin123`

## 👥 User Roles

- **ADMIN**: Full access to all modules
- **SALESPERSON**: Sales and related operations
- **ACCOUNTANT**: Payments, cheques, expenses, reports
- **PRODUCTION**: Production and inventory management

## 📱 Pages

- **Dashboard**: Overview with statistics and quick actions
- **Farmers**: Farmer management
- **Milk Collection**: Daily milk collection tracking
- **Inventory**: Stock management
- **Production**: Production batch management
- **Sales**: Sales and invoicing
- **Returns**: Product returns and replacements
- **Payments**: Payment processing
- **Cheques**: Cheque management
- **Expenses**: Expense tracking
- **Reports**: Analytics and reports (Admin/Accountant only)

## 🛠️ Tech Stack

- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **React Router**: Routing
- **Axios**: HTTP client
- **Heroicons**: Icons

## 🎯 Development

- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Preview**: `npm run preview` (after build)

## 🔧 Configuration

### API URL
Set `VITE_API_URL` in `.env` file to point to your backend API.

### Tailwind CSS
Customize colors and styles in `tailwind.config.js`.

## 📝 Notes

- Make sure the backend server is running before starting the frontend
- The frontend expects the backend API to be available at the configured `VITE_API_URL`
- All API requests include JWT tokens automatically via axios interceptors


