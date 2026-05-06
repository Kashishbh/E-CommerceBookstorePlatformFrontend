# BookNest Backend Service Flow Explanation

Important note: this workspace contains the Angular frontend only. The actual backend source files are not present here. This explanation is based on the frontend service files that call the backend APIs:

- `src/app/core/services/auth.ts`
- `src/app/core/services/books.ts`
- `src/app/core/services/shop.ts`
- `src/app/core/models.ts`
- `src/environments/environment.ts`
- `src/app/app.routes.ts`
- `src/app/core/guards/auth.guard.ts`
- `src/app/core/guards/admin.guard.ts`

The frontend shows that BookNest is designed as a microservice-style backend. The normal entry point is an API gateway on `http://localhost:8080`. If the gateway call fails, some frontend methods fall back to direct service ports.

## 1. Overall Architecture

### English

BookNest is an online bookstore application. The frontend is Angular, and it communicates with multiple backend services through HTTP APIs.

The main backend entry point is:

```text
API Gateway: http://localhost:8080
```

The frontend also contains fallback service URLs:

```text
Auth Service:         http://localhost:8081
Catalog/Book Service: http://localhost:8082
Cart Service:         http://localhost:8083
Wishlist Service:     http://localhost:8084
Wallet Service:       http://localhost:8085
Order Service:        http://localhost:8086
Review Service:       http://localhost:8087
Notification Service: http://localhost:8088
```

Normal flow:

```text
Angular Component -> Angular Service -> API Gateway -> Backend Microservice -> Database
```

Fallback flow:

```text
Angular Component -> Angular Service -> Direct Backend Service Port -> Database
```

Authentication uses JWT. After login or registration, the backend returns a token and user object. The frontend saves them in `localStorage` and sends the token in the `Authorization: Bearer <token>` header for protected APIs.

### Hinglish

BookNest ek online bookstore app hai. Frontend Angular me hai, aur backend ke multiple microservices se HTTP API ke through baat karta hai.

Main backend entry point:

```text
API Gateway: http://localhost:8080
```

Agar gateway fail ho jaye, frontend direct service port par fallback karta hai, jaise auth ke liye `8081`, books ke liye `8082`, cart ke liye `8083`, etc.

Normal flow:

```text
Angular Component -> Angular Service -> API Gateway -> Backend Microservice -> Database
```

JWT authentication use hota hai. Login/register ke baad backend token aur user details bhejta hai. Frontend token ko `localStorage` me save karta hai aur protected API calls me `Authorization: Bearer <token>` header bhejta hai.

## 2. Environment File

File: `src/environments/environment.ts`

### English

This file stores the common API base URL:

```ts
export const environment = {
  apiBaseUrl: 'http://localhost:8080'
};
```

Meaning: most services first try to call the API gateway at port `8080`.

### Hinglish

Ye file common backend gateway URL store karti hai:

```text
http://localhost:8080
```

Matlab frontend pehle API gateway ko call karega. Agar kuch methods me fallback diya hai aur gateway fail hota hai, tab direct service port call hota hai.

## 3. Models File

File: `src/app/core/models.ts`

### English

This file defines TypeScript interfaces. These are frontend-side shapes of backend data.

Main models:

- `User`: logged-in user details like `userId`, `fullName`, `email`, `role`, `active`.
- `AuthResponse`: login/register response containing `token`, `user`, and `message`.
- `Book`: book details like `bookId`, `title`, `author`, `price`, `stock`, `rating`.
- `Cart` and `CartItem`: user's cart and selected books.
- `Wishlist` and `WishlistItem`: saved books.
- `Wallet` and `WalletStatement`: wallet balance and transaction history.
- `Order` and `OrderAddress`: placed order and delivery address.
- `NotificationItem`: user notification message.
- `RazorpayOrderResponse`: response needed to open Razorpay checkout.
- `ReviewItem`: review/rating for a book.
- `PaymentReceipt`: receipt data stored on frontend after online payment.

These interfaces do not run business logic. They help TypeScript understand what response format is expected from backend APIs.

### Hinglish

Ye file backend se aane wale data ka structure define karti hai. Isme business logic nahi hota, sirf data ka format hota hai.

Example:

- `User` batata hai user object me kya fields aayengi.
- `Book` batata hai book object me title, author, price, stock jaise fields honge.
- `Cart` me cart id, user id, total price aur items hote hain.
- `Wallet` me wallet id, user id aur balance hota hai.
- `Order` me order id, payment mode, status, product details aur address hota hai.

Mentor ko bol sakte ho: "`models.ts` frontend ka contract hai backend responses ke saath. Backend jo JSON bhejta hai, frontend usko in interfaces ke according use karta hai."

## 4. Auth Service

Frontend file: `src/app/core/services/auth.ts`

Backend service expected: Auth Service on `http://localhost:8081`

### Purpose

### English

`AuthService` handles user authentication, session storage, Google login, admin user management, and JWT headers.

### Hinglish

`AuthService` login, register, logout, Google login, profile fetch, admin user management aur JWT header create karne ka kaam karta hai.

### Important properties

```ts
private readonly authBaseUrl = 'http://localhost:8081';
private readonly userSignal = signal<User | null>(this.readUser());
private readonly tokenSignal = signal<string | null>(localStorage.getItem('booknest_token'));
```

### English

- `authBaseUrl` points directly to auth service.
- `userSignal` stores the currently logged-in user in Angular signal state.
- `tokenSignal` stores JWT token in Angular signal state.
- Data is initialized from `localStorage`, so login survives page refresh.

### Hinglish

- `authBaseUrl` auth backend service ka URL hai.
- `userSignal` current logged-in user ko memory me rakhta hai.
- `tokenSignal` JWT token ko memory me rakhta hai.
- Page refresh ke baad bhi login rahe, isliye data `localStorage` se read hota hai.

### Auth APIs

#### Login

```ts
login(payload)
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:

```json
{
  "token": "jwt-token",
  "user": {},
  "message": "Login successful"
}
```

English flow:

1. Login page sends email and password.
2. Backend validates credentials.
3. Backend returns JWT token and user details.
4. Frontend calls `storeSession`.
5. Token and user are stored in `localStorage`.
6. User is navigated to app pages.

Hinglish flow:

1. Login page email/password bhejta hai.
2. Backend credentials validate karta hai.
3. Backend JWT token aur user details return karta hai.
4. Frontend `storeSession` call karta hai.
5. Token aur user `localStorage` me save hote hain.
6. User protected pages access kar sakta hai.

#### Register

```ts
register(payload)
POST /api/v1/auth/register
```

Request:

```json
{
  "fullName": "User Name",
  "email": "user@example.com",
  "password": "password",
  "mobile": "9999999999"
}
```

Flow is same as login. Backend creates user, returns token and user, frontend stores session.

Hinglish: Register me backend naya user create karta hai, phir login ki tarah token aur user return karta hai.

#### Profile

```ts
getProfile()
GET /api/v1/auth/profile
Header: Authorization: Bearer <token>
```

Used after Google OAuth success to fetch user details from token.

Hinglish: Google login ke baad token milta hai, phir profile API se user details fetch hoti hain.

#### Google Login

```ts
startGoogleLogin()
Redirects to /oauth2/authorization/google
```

English:

The browser is redirected to backend Google OAuth endpoint. Backend handles Google authentication and redirects back to frontend, usually with a token.

Hinglish:

Frontend browser ko backend ke Google OAuth endpoint par redirect karta hai. Backend Google se authentication karwata hai aur token ke saath frontend par wapas bhejta hai.

#### Logout

```ts
logout()
```

English:

Removes token and user from `localStorage`, clears signals, and navigates to `/login`.

Hinglish:

Token aur user data clear hota hai, signals null hote hain, aur user `/login` page par chala jata hai.

#### Admin User APIs

```text
GET    /api/v1/auth/admin/users
PUT    /api/v1/auth/admin/users/{userId}/suspend
PUT    /api/v1/auth/admin/users/{userId}/activate
DELETE /api/v1/auth/admin/users/{userId}
```

English:

These APIs are used in the admin dashboard to view users, suspend users, activate users, and delete users.

Hinglish:

Ye APIs admin dashboard me use hoti hain. Admin users list dekh sakta hai, user suspend/activate/delete kar sakta hai.

## 5. Books / Catalog Service

Frontend file: `src/app/core/services/books.ts`

Backend service expected: Catalog/Book Service on `http://localhost:8082`

Gateway URL first: `http://localhost:8080`

Fallback URL: `http://localhost:8082`

### Purpose

### English

`BooksService` handles book catalog operations: add book, get all books, get book by id, update book, update stock, and delete book.

### Hinglish

`BooksService` book catalog ka kaam karta hai: books add karna, list lana, detail lana, update karna, stock update karna, delete karna.

### APIs

#### Add Book

```text
POST /books
```

Used by admin dashboard.

Payload fields:

```text
title, author, isbn, genre, publisher, price, stock, rating,
description, coverImageUrl, publishedDate, featured
```

English: Admin fills book form. Frontend sends book data to backend. Backend saves book and returns created `Book`.

Hinglish: Admin form fill karta hai. Frontend book data backend ko bhejta hai. Backend book save karke created book return karta hai.

#### Get All Books

```text
GET /books
```

Used on home page, books page, and admin dashboard.

English: Backend returns list of all books.

Hinglish: Backend saari books ki list return karta hai.

#### Get Book By ID

```text
GET /books/{bookId}
```

Used on book detail page.

English: Backend returns one book by id.

Hinglish: Backend ek specific book ki details return karta hai.

#### Update Book

```text
PUT /books/{bookId}
```

English: Updates full book information.

Hinglish: Complete book details update karta hai.

#### Update Stock

```text
PUT /books/{bookId}/stock
Payload: { "stock": 10 }
```

Used by admin dashboard.

English: Admin can change available stock quantity.

Hinglish: Admin available stock quantity change kar sakta hai.

#### Delete Book

```text
DELETE /books/{bookId}
```

English: Removes book from catalog.

Hinglish: Catalog se book delete karta hai.

## 6. Shop Service

Frontend file: `src/app/core/services/shop.ts`

### Purpose

### English

`ShopService` is a combined frontend service. It talks to multiple backend services:

- Cart service
- Wishlist service
- Wallet service
- Order service
- Notification service
- Review service

It also attaches JWT headers using `AuthService.getAuthHeaders()`.

### Hinglish

`ShopService` frontend ka combined service hai. Ye multiple backend services ko call karta hai:

- Cart
- Wishlist
- Wallet
- Orders
- Notifications
- Reviews

Protected APIs ke liye ye `AuthService.getAuthHeaders()` se JWT header lagata hai.

## 7. Cart Service

Frontend methods in `ShopService`

Backend service expected: Cart Service on `http://localhost:8083`

### APIs

```text
GET    /cart/{userId}
POST   /cart/{userId}/items
PUT    /cart/{userId}/items/{itemId}
DELETE /cart/{userId}/items/{itemId}
DELETE /cart/{userId}
```

### Working

### English

The cart service stores books selected by a user before checkout.

Main operations:

- `getCart(userId)`: loads current user's cart.
- `addToCart(userId, payload)`: adds a book to cart.
- `updateCartQuantity(userId, itemId, quantity)`: changes quantity.
- `removeCartItem(userId, itemId)`: removes one cart item.
- `clearCart(userId)`: clears full cart after successful order or manual clear.

### Hinglish

Cart service user ke selected books store karta hai checkout se pehle.

Main operations:

- `getCart`: user ka current cart load karta hai.
- `addToCart`: book cart me add karta hai.
- `updateCartQuantity`: quantity change karta hai.
- `removeCartItem`: ek item remove karta hai.
- `clearCart`: pura cart clear karta hai, mostly order place hone ke baad.

### Cart flow

```text
User clicks Add to Cart
-> Component checks login
-> Component calls ShopService.getCart
-> If book not already present, calls ShopService.addToCart
-> Backend stores item
-> Frontend shows success message
```

Hinglish:

```text
User Add to Cart click karta hai
-> Component login check karta hai
-> Current cart fetch hota hai
-> Agar book already cart me nahi hai to addToCart call hota hai
-> Backend item save karta hai
-> Frontend success message dikhata hai
```

## 8. Wishlist Service

Backend service expected: Wishlist Service on `http://localhost:8084`

### APIs

```text
GET    /wishlist/{userId}
POST   /wishlist/{userId}/items
DELETE /wishlist/{userId}/items/{bookId}
DELETE /wishlist/{userId}
POST   /wishlist/{userId}/move-to-cart/{bookId}
```

### English

Wishlist service stores books that the user wants to save for later.

Operations:

- Load wishlist
- Add book to wishlist
- Remove book from wishlist
- Clear wishlist
- Move wishlist book to cart

### Hinglish

Wishlist service un books ko store karta hai jo user baad me kharidna chahta hai.

Operations:

- Wishlist load karna
- Book wishlist me add karna
- Book wishlist se remove karna
- Full wishlist clear karna
- Wishlist item ko cart me move karna

### Flow

```text
Book Detail Page -> Add to Wishlist -> ShopService.addToWishlist
-> Backend saves wishlist item -> UI shows message
```

## 9. Wallet Service

Backend service expected: Wallet Service on `http://localhost:8085`

### APIs

```text
POST /wallet
GET  /wallet/{walletId}
GET  /wallet/user/{userId}
PUT  /wallet/{walletId}/add-money
GET  /wallet/{walletId}/statements
POST /wallet/{walletId}/topup/create-order
POST /wallet/{walletId}/topup/verify
```

### English

Wallet service manages user wallet balance, wallet creation, statements, manual top-up, and Razorpay top-up verification.

Important flows:

1. When wallet page opens, frontend calls `getWalletByUser(userId)`.
2. If wallet does not exist, frontend calls `createWallet(userId)`.
3. For simple top-up, frontend calls `addMoney(walletId, amount, remarks)`.
4. For Razorpay top-up:
   - Frontend calls `createTopupOrder`.
   - Backend creates Razorpay order and returns `keyId`, `razorpayOrderId`, `currency`, `amount`.
   - Frontend opens Razorpay checkout.
   - After payment success, frontend sends payment id, order id, signature, amount, remarks to `verifyTopup`.
   - Backend verifies signature and updates wallet.
   - Frontend reloads wallet and statements.

### Hinglish

Wallet service user ka balance, wallet creation, transaction statements aur Razorpay top-up handle karta hai.

Flow:

1. Wallet page open hota hai to `getWalletByUser(userId)` call hota hai.
2. Agar wallet nahi milta, `createWallet(userId)` call hota hai.
3. Normal top-up ke liye `addMoney` call hota hai.
4. Razorpay top-up:
   - Frontend `createTopupOrder` call karta hai.
   - Backend Razorpay order create karke details return karta hai.
   - Frontend Razorpay checkout open karta hai.
   - Payment success ke baad frontend `verifyTopup` call karta hai.
   - Backend signature verify karta hai aur wallet balance update karta hai.
   - Frontend wallet balance aur statements reload karta hai.

## 10. Order Service

Backend service expected: Order Service on `http://localhost:8086`

### APIs

```text
POST /orders/address
POST /orders/place
POST /orders/online
GET  /orders/user/{userId}
GET  /orders
PUT  /orders/{orderId}/status
```

### English

Order service handles delivery address, COD orders, online orders, order history, admin order list, and status updates.

COD checkout flow:

```text
Cart Page
-> User fills address
-> saveAddress()
-> placeCodOrder()
-> Backend creates order with payment mode COD
-> Frontend clears cart
```

Online checkout flow:

```text
Cart Page
-> User fills address
-> saveAddress()
-> createTopupOrder() from wallet service
-> Razorpay payment
-> verifyTopup() from wallet service
-> placeOnlineOrder()
-> Backend creates paid order
-> Frontend stores receipt
-> Frontend clears cart
```

Admin flow:

```text
Admin Dashboard
-> getAllOrders()
-> Admin changes status
-> updateOrderStatus(orderId, status)
```

### Hinglish

Order service delivery address, COD order, online order, order history aur admin status update handle karta hai.

COD flow:

```text
Cart page
-> User address fill karta hai
-> saveAddress call hota hai
-> placeCodOrder call hota hai
-> Backend COD order create karta hai
-> Frontend cart clear karta hai
```

Online flow:

```text
Cart page
-> User address fill karta hai
-> Address save hota hai
-> Wallet service Razorpay order create karta hai
-> Razorpay payment hoti hai
-> Backend payment verify karta hai
-> Order service online order create karta hai
-> Frontend receipt save karta hai
-> Cart clear hota hai
```

Admin flow:

```text
Admin dashboard
-> Saare orders load hote hain
-> Admin status change karta hai
-> Backend order status update karta hai
```

## 11. Notification Service

Backend service expected: Notification Service on `http://localhost:8088`

### API

```text
GET /notifications/user/{userId}
```

### English

Notification service returns user-specific alerts. The frontend sorts notifications by `createdAt` and displays latest first.

Possible notification examples:

- Order placed
- Payment successful
- Order shipped
- Order delivered
- Wallet updated

### Hinglish

Notification service user-specific alerts return karta hai. Frontend notifications ko date ke according sort karke latest first dikhata hai.

Examples:

- Order placed
- Payment successful
- Order shipped
- Order delivered
- Wallet updated

## 12. Review Service

Backend service expected: Review Service on `http://localhost:8087`

### APIs

```text
GET  /reviews/book/{bookId}
POST /reviews
```

### English

Review service manages book reviews and ratings.

Flow:

1. Book detail page loads book.
2. Frontend calls `getBookReviews(bookId)`.
3. Reviews are shown under book detail.
4. To write a review, frontend first checks user's orders.
5. User can review only if they have a delivered order for that book.
6. Frontend calls `addReview`.

### Hinglish

Review service book reviews aur ratings manage karta hai.

Flow:

1. Book detail page book load karta hai.
2. Frontend `getBookReviews(bookId)` call karta hai.
3. Reviews book detail page par dikhte hain.
4. Review likhne se pehle frontend user ke orders check karta hai.
5. User tabhi review likh sakta hai jab uska order delivered ho.
6. Frontend `addReview` call karta hai.

## 13. API Gateway

Backend expected: Gateway on `http://localhost:8080`

### English

The gateway is the common entry point for most microservices. Instead of frontend remembering every service URL, it calls one gateway URL. The gateway routes requests internally.

Example:

```text
Frontend calls http://localhost:8080/books
Gateway forwards to Catalog Service
Catalog Service returns response
Gateway sends response back to frontend
```

Benefits:

- Single frontend API base URL
- Easier routing
- Central place for CORS/security/rate limiting/logging
- Backend services can change ports without changing frontend

### Hinglish

Gateway ek common entry point hai. Frontend ko har service ka alag URL yaad rakhne ki zarurat nahi. Frontend gateway ko call karta hai, gateway request ko correct microservice tak bhejta hai.

Example:

```text
Frontend http://localhost:8080/books call karta hai
Gateway request Catalog Service ko forward karta hai
Catalog Service response deta hai
Gateway frontend ko response return karta hai
```

Benefits:

- Frontend ke liye single API URL
- Routing easy
- CORS/security/logging central place par
- Backend ports change hone par frontend me kam changes

## 14. Route Guards

Files:

- `src/app/core/guards/auth.guard.ts`
- `src/app/core/guards/admin.guard.ts`

### Auth Guard

### English

`authGuard` protects user-only pages:

- Cart
- Wishlist
- Wallet
- Orders
- Notifications

If user is logged in, route opens. Otherwise user is redirected to `/login`.

### Hinglish

`authGuard` protected user pages ko secure karta hai. Agar user logged in hai to page open hota hai, warna `/login` par redirect hota hai.

### Admin Guard

### English

`adminGuard` protects `/admin`.

Flow:

1. If user is not logged in, redirect to `/login`.
2. If user is logged in and role is `ROLE_ADMIN`, allow access.
3. Otherwise redirect to home page.

### Hinglish

`adminGuard` `/admin` route ko protect karta hai.

Flow:

1. User logged in nahi hai to `/login`.
2. User logged in hai aur role `ROLE_ADMIN` hai to access allow.
3. Warna home page par redirect.

## 15. Application Routes

File: `src/app/app.routes.ts`

### English

Routes connect URLs to pages:

```text
/                 Home
/books            Books list
/books/:id        Book detail
/login            Login
/register         Register
/oauth-success    OAuth success
/cart             Cart, protected
/wishlist         Wishlist, protected
/wallet           Wallet, protected
/orders           Orders, protected
/notifications    Notifications, protected
/admin            Admin dashboard, admin protected
```

### Hinglish

Routes decide karte hain ki kaunsa URL kaunsa page kholega.

Protected pages jaise cart, wishlist, wallet, orders, notifications login ke bina open nahi honge. Admin page sirf admin user ke liye hai.

## 16. Page-Level Backend Flows

### Login Page

English:

```text
Login form -> AuthService.login -> Auth backend -> token/user stored -> navigate
```

Hinglish:

```text
Login form submit -> AuthService.login -> Backend credentials check -> token/user save -> app access
```

### Register Page

English:

```text
Register form -> AuthService.register -> user created -> token/user stored
```

Hinglish:

```text
Register form -> backend naya user banata hai -> token/user save hota hai
```

### Home / Books Page

English:

```text
Page loads -> BooksService.getBooks -> display catalog
Add to cart -> ShopService.getCart -> ShopService.addToCart
```

Hinglish:

```text
Page load -> books backend se catalog aata hai
Add to cart -> cart check hota hai -> book cart me add hoti hai
```

### Book Detail Page

English:

```text
Route /books/:id -> BooksService.getBookById
-> ShopService.getBookReviews
-> ShopService.getOrders checks review eligibility
```

Hinglish:

```text
Book detail page book id se details lata hai
Reviews load karta hai
User delivered order check karke review permission deta hai
```

### Cart Page

English:

```text
Load cart -> Load or create wallet
Checkout -> Save address
If COD -> place order -> clear cart
If ONLINE -> create Razorpay order -> verify payment -> place online order -> clear cart -> store receipt
```

Hinglish:

```text
Cart load hota hai -> wallet load/create hota hai
Checkout me address save hota hai
COD hai to direct order place hota hai
ONLINE hai to Razorpay payment, verification, order create, receipt save, cart clear
```

### Wallet Page

English:

```text
Load wallet by user
If not found, create wallet
Load wallet statements
Top-up either direct addMoney or Razorpay create-order + verify
```

Hinglish:

```text
User ka wallet load hota hai
Agar nahi hai to create hota hai
Statements load hote hain
Top-up direct ya Razorpay verification ke through hota hai
```

### Orders Page

English:

```text
Orders page -> ShopService.getOrders(userId) -> show user's order history
```

Hinglish:

```text
Orders page userId se backend se order history laata hai
```

### Notifications Page

English:

```text
Notifications page -> ShopService.getNotifications(userId) -> sort latest first -> display
```

Hinglish:

```text
Notifications page user ke alerts load karta hai aur latest first dikhata hai
```

### Admin Dashboard

English:

```text
Admin opens dashboard
-> AuthService.getAllUsers
-> BooksService.getBooks
-> ShopService.getAllOrders
Admin can add/delete books, update stock, suspend/activate/delete users, update order status
```

Hinglish:

```text
Admin dashboard users, books aur orders load karta hai
Admin books add/delete kar sakta hai, stock update kar sakta hai,
users suspend/activate/delete kar sakta hai, orders ka status update kar sakta hai
```

## 17. Complete User Journey

### English

1. User registers or logs in.
2. Auth service returns JWT token and user data.
3. User browses books from catalog service.
4. User opens book detail and checks reviews.
5. User adds book to cart or wishlist.
6. Cart service stores selected books.
7. At checkout, order service saves address.
8. If COD, order service directly places order.
9. If online, wallet service creates Razorpay order.
10. Razorpay payment happens in browser.
11. Wallet service verifies payment signature.
12. Order service creates online paid order.
13. Cart is cleared.
14. Notifications and orders can be viewed.
15. After delivery, user can review the book.

### Hinglish

1. User register ya login karta hai.
2. Auth service JWT token aur user data return karta hai.
3. User catalog service se books browse karta hai.
4. User book detail page par reviews dekhta hai.
5. User book cart ya wishlist me add karta hai.
6. Cart service selected books store karta hai.
7. Checkout par order service address save karta hai.
8. COD hai to order directly place hota hai.
9. Online payment hai to wallet service Razorpay order create karta hai.
10. Browser me Razorpay payment hoti hai.
11. Wallet service payment signature verify karta hai.
12. Order service online paid order create karta hai.
13. Cart clear hota hai.
14. User notifications aur orders dekh sakta hai.
15. Delivery ke baad user book review kar sakta hai.

## 18. Mentor Explanation Script

### English

"BookNest uses an Angular frontend and a microservice-style backend. The frontend mainly calls an API gateway at port 8080. The backend appears to have separate services for authentication, catalog, cart, wishlist, wallet, orders, reviews, and notifications. Authentication returns a JWT token, which the frontend stores in localStorage. Protected APIs use this token through the Authorization header.

The catalog service manages books. The cart and wishlist services manage user shopping data. The wallet service manages balance and Razorpay payment verification. The order service saves addresses, places COD or online orders, and allows admin status updates. The review service allows users to review delivered books. The notification service shows user alerts. Admin routes are protected by role checking, specifically ROLE_ADMIN."

### Hinglish

"BookNest me Angular frontend hai aur backend microservice style me divided hai. Frontend mostly API gateway `8080` ko call karta hai. Backend me alag services hain: auth, catalog/books, cart, wishlist, wallet, orders, reviews aur notifications. Login/register ke baad auth service JWT token return karta hai, frontend us token ko localStorage me save karta hai. Protected APIs me wahi token Authorization header me bheja jata hai.

Catalog service books manage karti hai. Cart aur wishlist services user shopping data manage karti hain. Wallet service balance aur Razorpay payment verification handle karti hai. Order service address save, COD/online order placement aur admin status updates handle karti hai. Review service delivered orders ke baad review allow karti hai. Notification service user alerts dikhati hai. Admin route role check se protected hai, jahan role `ROLE_ADMIN` hona chahiye."

## 19. What Is Missing For True Backend File-by-File Explanation

### English

To explain every backend file exactly, the backend repository is needed. This frontend tells us the API contract and expected services, but it does not show backend controller, service, repository, entity, DTO, security config, gateway config, or database code.

If backend code is added, explain each service using this structure:

```text
Controller: receives HTTP request
DTO: request/response shape
Service: business logic
Repository: database access
Entity/Model: database table mapping
Config: security, CORS, gateway, payment settings
Exception handling: error responses
```

### Hinglish

Actual backend ke har file ka exact explanation dene ke liye backend repository chahiye. Is frontend se hume API contract aur expected services ka idea milta hai, lekin backend ke controller, service, repository, entity, DTO, security config, gateway config aur database code yahan nahi hai.

Backend code milne ke baad har service ko aise explain karna:

```text
Controller: HTTP request receive karta hai
DTO: request/response ka format
Service: business logic
Repository: database se baat
Entity/Model: database table mapping
Config: security, CORS, gateway, payment settings
Exception handling: errors ka response
```

