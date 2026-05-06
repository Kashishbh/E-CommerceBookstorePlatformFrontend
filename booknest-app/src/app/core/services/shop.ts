import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Cart,
  NotificationItem,
  Order,
  OrderAddress,
  RazorpayOrderResponse,
  ReviewItem,
  Wallet,
  WalletStatement,
  Wishlist
} from '../models';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly cartBaseUrl = 'http://localhost:8083';
  private readonly wishlistBaseUrl = 'http://localhost:8084';
  private readonly walletBaseUrl = 'http://localhost:8085';
  private readonly orderBaseUrl = 'http://localhost:8086';
  private readonly reviewBaseUrl = 'http://localhost:8087';
  private readonly notificationBaseUrl = 'http://localhost:8088';

  getCart(userId: number): Observable<Cart> {
    return this.http.get<Cart>(`${this.apiBaseUrl}/cart/${userId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.get<Cart>(`${this.cartBaseUrl}/cart/${userId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  addToCart(userId: number, payload: { bookId: number; bookTitle: string; price: number; quantity: number }): Observable<Cart> {
    return this.http.post<Cart>(`${this.apiBaseUrl}/cart/${userId}/items`, payload, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.post<Cart>(`${this.cartBaseUrl}/cart/${userId}/items`, payload, { headers: this.authService.getAuthHeaders() }))
    );
  }

  updateCartQuantity(userId: number, itemId: number, quantity: number): Observable<Cart> {
    return this.http.put<Cart>(`${this.apiBaseUrl}/cart/${userId}/items/${itemId}`, { quantity }, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.put<Cart>(`${this.cartBaseUrl}/cart/${userId}/items/${itemId}`, { quantity }, { headers: this.authService.getAuthHeaders() }))
    );
  }

  removeCartItem(userId: number, itemId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${this.apiBaseUrl}/cart/${userId}/items/${itemId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.delete<Cart>(`${this.cartBaseUrl}/cart/${userId}/items/${itemId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  clearCart(userId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${this.apiBaseUrl}/cart/${userId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.delete<Cart>(`${this.cartBaseUrl}/cart/${userId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  getWishlist(userId: number): Observable<Wishlist> {
    return this.http.get<Wishlist>(`${this.apiBaseUrl}/wishlist/${userId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.get<Wishlist>(`${this.wishlistBaseUrl}/wishlist/${userId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  addToWishlist(userId: number, payload: { bookId: number; bookTitle: string; bookPrice: number }): Observable<Wishlist> {
    return this.http.post<Wishlist>(`${this.apiBaseUrl}/wishlist/${userId}/items`, payload, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.post<Wishlist>(`${this.wishlistBaseUrl}/wishlist/${userId}/items`, payload, { headers: this.authService.getAuthHeaders() }))
    );
  }

  removeWishlistBook(userId: number, bookId: number): Observable<Wishlist> {
    return this.http.delete<Wishlist>(`${this.apiBaseUrl}/wishlist/${userId}/items/${bookId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.delete<Wishlist>(`${this.wishlistBaseUrl}/wishlist/${userId}/items/${bookId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  clearWishlist(userId: number): Observable<Wishlist> {
    return this.http.delete<Wishlist>(`${this.apiBaseUrl}/wishlist/${userId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.delete<Wishlist>(`${this.wishlistBaseUrl}/wishlist/${userId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  moveWishlistToCart(userId: number, bookId: number): Observable<string> {
    return this.http.post(`${this.apiBaseUrl}/wishlist/${userId}/move-to-cart/${bookId}`, {}, { headers: this.authService.getAuthHeaders(), responseType: 'text' }).pipe(
      catchError(() => this.http.post(`${this.wishlistBaseUrl}/wishlist/${userId}/move-to-cart/${bookId}`, {}, { headers: this.authService.getAuthHeaders(), responseType: 'text' }))
    );
  }

  createWallet(userId: number): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.apiBaseUrl}/wallet`, { userId }, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.post<Wallet>(`${this.walletBaseUrl}/wallet`, { userId }, { headers: this.authService.getAuthHeaders() }))
    );
  }

  getWallet(walletId: number): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.apiBaseUrl}/wallet/${walletId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.get<Wallet>(`${this.walletBaseUrl}/wallet/${walletId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  getWalletByUser(userId: number): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.apiBaseUrl}/wallet/user/${userId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.get<Wallet>(`${this.walletBaseUrl}/wallet/user/${userId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  addMoney(walletId: number, amount: number, remarks: string): Observable<Wallet> {
    return this.http.put<Wallet>(`${this.apiBaseUrl}/wallet/${walletId}/add-money`, { amount, remarks }, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.put<Wallet>(`${this.walletBaseUrl}/wallet/${walletId}/add-money`, { amount, remarks }, { headers: this.authService.getAuthHeaders() }))
    );
  }

  getWalletStatements(walletId: number): Observable<WalletStatement[]> {
    return this.http.get<WalletStatement[]>(`${this.apiBaseUrl}/wallet/${walletId}/statements`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.get<WalletStatement[]>(`${this.walletBaseUrl}/wallet/${walletId}/statements`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  createTopupOrder(walletId: number, amount: number): Observable<RazorpayOrderResponse> {
    return this.http.post<RazorpayOrderResponse>(`${this.apiBaseUrl}/wallet/${walletId}/topup/create-order`, { amount, currency: 'INR', receipt: `wallet_topup_${walletId}_${Date.now()}` }, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.post<RazorpayOrderResponse>(`${this.walletBaseUrl}/wallet/${walletId}/topup/create-order`, { amount, currency: 'INR', receipt: `wallet_topup_${walletId}_${Date.now()}` }, { headers: this.authService.getAuthHeaders() }))
    );
  }

  verifyTopup(walletId: number, payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    amount: number;
    remarks: string;
  }): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.apiBaseUrl}/wallet/${walletId}/topup/verify`, payload, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.post<Wallet>(`${this.walletBaseUrl}/wallet/${walletId}/topup/verify`, payload, { headers: this.authService.getAuthHeaders() }))
    );
  }

  saveAddress(payload: Omit<OrderAddress, 'addressId'>): Observable<OrderAddress> {
    return this.http.post<OrderAddress>(`${this.apiBaseUrl}/orders/address`, payload, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.post<OrderAddress>(`${this.orderBaseUrl}/orders/address`, payload, { headers: this.authService.getAuthHeaders() }))
    );
  }

  placeCodOrder(payload: { userId: number; amountPaid: number; quantity: number; productId: number; addressId: number }): Observable<Order> {
    return this.http.post<Order>(`${this.apiBaseUrl}/orders/place`, payload, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.post<Order>(`${this.orderBaseUrl}/orders/place`, payload, { headers: this.authService.getAuthHeaders() }))
    );
  }

  placeOnlineOrder(payload: { userId: number; amountPaid: number; quantity: number; productId: number; addressId: number; walletId: number }): Observable<Order> {
    return this.http.post<Order>(`${this.apiBaseUrl}/orders/online`, payload, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.post<Order>(`${this.orderBaseUrl}/orders/online`, payload, { headers: this.authService.getAuthHeaders() }))
    );
  }

  getOrders(userId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiBaseUrl}/orders/user/${userId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.get<Order[]>(`${this.orderBaseUrl}/orders/user/${userId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiBaseUrl}/orders`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.get<Order[]>(`${this.orderBaseUrl}/orders`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  updateOrderStatus(orderId: number, orderStatus: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiBaseUrl}/orders/${orderId}/status`, { orderStatus }, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.put<Order>(`${this.orderBaseUrl}/orders/${orderId}/status`, { orderStatus }, { headers: this.authService.getAuthHeaders() }))
    );
  }

  getNotifications(userId: number): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.apiBaseUrl}/notifications/user/${userId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.get<NotificationItem[]>(`${this.notificationBaseUrl}/notifications/user/${userId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  getBookReviews(bookId: number): Observable<ReviewItem[]> {
    return this.http.get<ReviewItem[]>(`${this.apiBaseUrl}/reviews/book/${bookId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.get<ReviewItem[]>(`${this.reviewBaseUrl}/reviews/book/${bookId}`, { headers: this.authService.getAuthHeaders() }))
    );
  }

  addReview(payload: { bookId: number; userId: number; rating: number; comment: string; verified?: boolean }): Observable<ReviewItem> {
    return this.http.post<ReviewItem>(`${this.apiBaseUrl}/reviews`, payload, { headers: this.authService.getAuthHeaders() }).pipe(
      catchError(() => this.http.post<ReviewItem>(`${this.reviewBaseUrl}/reviews`, payload, { headers: this.authService.getAuthHeaders() }))
    );
  }
}
