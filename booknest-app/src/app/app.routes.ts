import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { Home } from './pages/home/home';
import { Books } from './pages/books/books';
import { BookDetail } from './pages/book-detail/book-detail';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Cart } from './pages/cart/cart';
import { Wishlist } from './pages/wishlist/wishlist';
import { Wallet } from './pages/wallet/wallet';
import { Orders } from './pages/orders/orders';
import { Notifications } from './pages/notifications/notifications';
import { OauthSuccess } from './pages/oauth-success/oauth-success';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'books', component: Books },
  { path: 'books/:id', component: BookDetail },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'oauth-success', component: OauthSuccess },
  { path: 'cart', component: Cart, canActivate: [authGuard] },
  { path: 'wishlist', component: Wishlist, canActivate: [authGuard] },
  { path: 'wallet', component: Wallet, canActivate: [authGuard] },
  { path: 'orders', component: Orders, canActivate: [authGuard] },
  { path: 'notifications', component: Notifications, canActivate: [authGuard] },
  { path: 'admin', component: AdminDashboard, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' }
];
