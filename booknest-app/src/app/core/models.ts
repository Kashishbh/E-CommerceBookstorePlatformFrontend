export interface User {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  provider?: string;
  mobile?: string;
  active: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

export interface Book {
  bookId: number;
  title: string;
  author: string;
  isbn: string;
  genre?: string;
  publisher?: string;
  price: number;
  stock: number;
  rating?: number;
  description?: string;
  coverImageUrl?: string;
  publishedDate?: string;
  featured?: boolean;
}

export interface CartItem {
  itemId: number;
  bookId: number;
  bookTitle: string;
  price: number;
  quantity: number;
}

export interface Cart {
  cartId: number;
  userId: number;
  totalPrice: number;
  items: CartItem[];
}

export interface WishlistItem {
  itemId: number;
  bookId: number;
  bookTitle: string;
  bookPrice: number;
}

export interface Wishlist {
  wishlistId: number;
  userId: number;
  createdAt?: string;
  items: WishlistItem[];
}

export interface Wallet {
  walletId: number;
  userId: number;
  balance: number;
}

export interface WalletStatement {
  statementId: number;
  amount: number;
  type: string;
  orderId?: number;
  remarks?: string;
  transactionDate: string;
}

export interface OrderAddress {
  addressId: number;
  customerId: number;
  fullName: string;
  mobileNumber: string;
  flatNumber: string;
  city: string;
  pincode: string;
  state: string;
}

export interface Order {
  orderId: number;
  userId: number;
  orderDate: string;
  amountPaid: number;
  modeOfPayment: string;
  orderStatus: string;
  quantity: number;
  productId: number;
  productName: string;
  walletId?: number;
  address: OrderAddress;
}

export interface NotificationItem {
  notificationId: number;
  userId: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface RazorpayOrderResponse {
  keyId: string;
  razorpayOrderId: string;
  currency: string;
  amount: number;
}

export interface ReviewItem {
  reviewId: number;
  bookId: number;
  userId: number;
  rating: number;
  comment: string;
  reviewDate?: string;
  verified?: boolean;
}

export interface PaymentReceipt {
  orderId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaid: number;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  address: string;
  productName: string;
  quantity: number;
  paymentDate: string;
}
