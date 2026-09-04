import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { CustomerLayout } from '../layouts/CustomerLayout.js';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { CheckoutLayout } from '../layouts/CheckoutLayout.js';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute.js';
import { GuestRoute } from '../features/auth/components/GuestRoute.js';
import { AdminRoute } from '../features/auth/components/AdminRoute.js';
import { PageLoadingFallback } from '../components/common/PageLoadingFallback.js';

// Page-level code splitting using React.lazy()
// Customer Pages
const HomePage = lazy(() =>
  import('../pages/home/HomePage.js').then(m => ({ default: m.HomePage })),
);
const ShopPage = lazy(() =>
  import('../pages/shop/ShopPage.js').then(m => ({ default: m.ShopPage })),
);
const ProductDetailsPage = lazy(() =>
  import('../pages/product/ProductDetailsPage.js').then(m => ({ default: m.ProductDetailsPage })),
);
const CartPage = lazy(() =>
  import('../pages/cart/CartPage.js').then(m => ({ default: m.CartPage })),
);
const WishlistPage = lazy(() =>
  import('../pages/wishlist/WishlistPage.js').then(m => ({ default: m.WishlistPage })),
);
const AccountPage = lazy(() =>
  import('../pages/account/AccountPage.js').then(m => ({ default: m.AccountPage })),
);
const OrderListPage = lazy(() =>
  import('../pages/orders/OrderListPage.js').then(m => ({ default: m.OrderListPage })),
);
const OrderDetailsPage = lazy(() =>
  import('../pages/orders/OrderDetailsPage.js').then(m => ({ default: m.OrderDetailsPage })),
);
const OrderTrackingPage = lazy(() =>
  import('../pages/orders/OrderTrackingPage.js').then(m => ({ default: m.OrderTrackingPage })),
);

// Checkout Pages
const CheckoutPage = lazy(() =>
  import('../pages/checkout/CheckoutPage.js').then(m => ({ default: m.CheckoutPage })),
);
const CheckoutSuccessPage = lazy(() =>
  import('../pages/checkout/CheckoutSuccessPage.js').then(m => ({
    default: m.CheckoutSuccessPage,
  })),
);
const CheckoutFailurePage = lazy(() =>
  import('../pages/checkout/CheckoutFailurePage.js').then(m => ({
    default: m.CheckoutFailurePage,
  })),
);
const DemoPaymentPage = lazy(() =>
  import('../pages/checkout/DemoPaymentPage.js').then(m => ({ default: m.DemoPaymentPage })),
);

// Auth Pages
const LoginPage = lazy(() =>
  import('../pages/auth/LoginPage.js').then(m => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('../pages/auth/RegisterPage.js').then(m => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('../pages/auth/ForgotPasswordPage.js').then(m => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('../pages/auth/ResetPasswordPage.js').then(m => ({ default: m.ResetPasswordPage })),
);
const VerifyEmailPage = lazy(() =>
  import('../pages/auth/VerifyEmailPage.js').then(m => ({ default: m.VerifyEmailPage })),
);
// Admin Pages
const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminDashboardPage.js').then(m => ({ default: m.AdminDashboardPage })),
);
const AdminProductsPage = lazy(() =>
  import('../pages/admin/AdminProductsPage.js').then(m => ({ default: m.AdminProductsPage })),
);
const AdminProductFormPage = lazy(() =>
  import('../pages/admin/AdminProductFormPage.js').then(m => ({ default: m.AdminProductFormPage })),
);
const AdminProductDetailsPage = lazy(() =>
  import('../pages/admin/AdminProductDetailsPage.js').then(m => ({ default: m.AdminProductDetailsPage })),
);
const AdminOrdersPage = lazy(() =>
  import('../pages/admin/AdminOrdersPage.js').then(m => ({ default: m.AdminOrdersPage })),
);
const AdminOrderDetailsPage = lazy(() =>
  import('../pages/admin/AdminOrderDetailsPage.js').then(m => ({ default: m.AdminOrderDetailsPage })),
);
const AdminCustomersPage = lazy(() =>
  import('../pages/admin/AdminCustomersPage.js').then(m => ({ default: m.AdminCustomersPage })),
);
const AdminCustomerDetailPage = lazy(() => import('../pages/admin/AdminCustomerDetailPage.js').then(m => ({ default: m.AdminCustomerDetailPage })));
const AdminInventoryPage = lazy(() =>
  import('../pages/admin/AdminInventoryPage.js').then(m => ({ default: m.AdminInventoryPage })),
);
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminOperationsPages.js').then(m => ({ default: m.AdminCategoriesPage })));
const AdminVariantsPage = lazy(() => import('../pages/admin/AdminOperationsPages.js').then(m => ({ default: m.AdminVariantsPage })));
const AdminMovementsPage = lazy(() => import('../pages/admin/AdminOperationsPages.js').then(m => ({ default: m.AdminMovementsPage })));
const AdminReservationsPage = lazy(() => import('../pages/admin/AdminOperationsPages.js').then(m => ({ default: m.AdminReservationsPage })));
const AdminCouponsPage = lazy(() => import('../pages/admin/AdminOperationsPages.js').then(m => ({ default: m.AdminCouponsPage })));
const AdminAuditLogsPage = lazy(() => import('../pages/admin/AdminOperationsPages.js').then(m => ({ default: m.AdminAuditLogsPage })));

// Admin Layout
const AdminLayout = lazy(() =>
  import('../layouts/AdminLayout.js').then(m => ({ default: m.AdminLayout })),
);

// 404 Page
const NotFoundPage = lazy(() =>
  import('../pages/common/NotFoundPage.js').then(m => ({ default: m.NotFoundPage })),
);

function withSuspense(component: React.ReactNode) {
  return <Suspense fallback={<PageLoadingFallback />}>{component}</Suspense>;
}

export const router = createBrowserRouter([
  // Customer Route Group (CustomerLayout)
  {
    path: '/',
    element: <CustomerLayout />,
    children: [
      {
        index: true,
        element: withSuspense(<HomePage />),
      },
      {
        path: 'shop',
        element: withSuspense(<ShopPage />),
      },
      {
        path: 'shirts',
        element: withSuspense(<ShopPage />),
      },
      {
        path: 'shirts/:productId',
        element: withSuspense(<ProductDetailsPage />),
      },
      {
        path: 'categories',
        element: withSuspense(<ShopPage />),
      },
      {
        path: 'new-arrivals',
        element: withSuspense(<ShopPage defaultNewArrivalsOnly />),
      },
      {
        path: 'deals',
        element: withSuspense(<ShopPage defaultDealsOnly />),
      },
      {
        path: 'cart',
        element: withSuspense(<CartPage />),
      },
      {
        path: 'wishlist',
        element: withSuspense(<WishlistPage />),
      },
      {
        path: 'account',
        element: <ProtectedRoute>{withSuspense(<AccountPage />)}</ProtectedRoute>,
      },
      {
        path: 'account/orders',
        element: <ProtectedRoute>{withSuspense(<OrderListPage />)}</ProtectedRoute>,
      },
      {
        path: 'account/orders/:orderId',
        element: <ProtectedRoute>{withSuspense(<OrderDetailsPage />)}</ProtectedRoute>,
      },
      {
        path: 'account/orders/:orderId/tracking',
        element: <ProtectedRoute>{withSuspense(<OrderTrackingPage />)}</ProtectedRoute>,
      },
      {
        path: '*',
        element: withSuspense(<NotFoundPage />),
      },
    ],
  },

  // Checkout Route Group (CheckoutLayout - Protected)
  {
    path: '/checkout',
    element: (
      <ProtectedRoute>
        <CheckoutLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: withSuspense(<CheckoutPage />),
      },
      {
        path: 'success',
        element: withSuspense(<CheckoutSuccessPage />),
      },
      {
        path: 'failure',
        element: withSuspense(<CheckoutFailurePage />),
      },
      {
        path: 'payment',
        element: withSuspense(<DemoPaymentPage />),
      },
    ],
  },

  // Auth Route Group (AuthLayout)
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/auth/login" replace />,
      },
      {
        path: 'login',
        element: <GuestRoute>{withSuspense(<LoginPage />)}</GuestRoute>,
      },
      {
        path: 'register',
        element: <GuestRoute>{withSuspense(<RegisterPage />)}</GuestRoute>,
      },
      {
        path: 'forgot-password',
        element: <GuestRoute>{withSuspense(<ForgotPasswordPage />)}</GuestRoute>,
      },
      {
        path: 'reset-password',
        element: <GuestRoute>{withSuspense(<ResetPasswordPage />)}</GuestRoute>,
      },
      {
        path: 'verify-email',
        element: withSuspense(<VerifyEmailPage />),
      },
    ],
  },

  // Admin Route Group (AdminLayout - Step 11)
  {
    path: '/admin',
    element: <AdminRoute>{withSuspense(<AdminLayout />)}</AdminRoute>,
    children: [
      {
        index: true,
        element: withSuspense(<AdminDashboardPage />),
      },
      {
        path: 'products',
        element: withSuspense(<AdminProductsPage />),
      },
      {
        path: 'products/new',
        element: withSuspense(<AdminProductFormPage />),
      },
      {
        path: 'products/:productId',
        element: withSuspense(<AdminProductDetailsPage />),
      },
      {
        path: 'products/:productId/edit',
        element: withSuspense(<AdminProductFormPage />),
      },
      {
        path: 'orders',
        element: withSuspense(<AdminOrdersPage />),
      },
      {
        path: 'orders/:orderId',
        element: withSuspense(<AdminOrderDetailsPage />),
      },
      {
        path: 'customers',
        element: withSuspense(<AdminCustomersPage />),
      },
      { path: 'customers/:customerId', element: withSuspense(<AdminCustomerDetailPage />) },
      { path: 'categories', element: withSuspense(<AdminCategoriesPage />) },
      { path: 'variants', element: withSuspense(<AdminVariantsPage />) },
      { path: 'inventory/movements', element: withSuspense(<AdminMovementsPage />) },
      { path: 'inventory/reservations', element: withSuspense(<AdminReservationsPage />) },
      { path: 'coupons', element: withSuspense(<AdminCouponsPage />) },
      { path: 'audit-logs', element: withSuspense(<AdminAuditLogsPage />) },
      {
        path: 'inventory',
        element: withSuspense(<AdminInventoryPage />),
      },
    ],
  },
]);
