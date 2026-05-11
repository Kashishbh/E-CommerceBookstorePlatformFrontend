import { TestBed } from '@angular/core/testing';
import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ShopService } from './shop';
import { AuthService } from './auth';

describe('ShopService', () => {
  let service: ShopService;
  let httpMock: HttpTestingController;
  let authServiceSpy: Pick<AuthService, 'getAuthHeaders'>;

  beforeEach(() => {
    authServiceSpy = {
      getAuthHeaders: vi.fn(() => new HttpHeaders({ Authorization: 'Bearer test-token' }))
    };

    TestBed.configureTestingModule({
      providers: [
        ShopService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(ShopService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch cart from gateway API', () => {
    const mockCart = {
      cartId: 1,
      userId: 10,
      totalPrice: 499,
      items: [{ itemId: 1, bookId: 100, bookTitle: 'Atomic Habits', price: 499, quantity: 1 }]
    };

    service.getCart(10).subscribe((cart) => {
      expect(cart.userId).toBe(10);
      expect(cart.items.length).toBe(1);
    });

    const req = httpMock.expectOne('http://localhost:8080/cart/10');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush(mockCart);
  });

  it('should fall back to cart service when gateway cart call fails', () => {
    const mockCart = {
      cartId: 2,
      userId: 20,
      totalPrice: 899,
      items: [{ itemId: 2, bookId: 101, bookTitle: 'Deep Work', price: 899, quantity: 1 }]
    };

    service.getCart(20).subscribe((cart) => {
      expect(cart.cartId).toBe(2);
      expect(cart.items[0].bookTitle).toBe('Deep Work');
    });

    const gatewayReq = httpMock.expectOne('http://localhost:8080/cart/20');
    gatewayReq.flush('Gateway failed', { status: 500, statusText: 'Server Error' });

    const fallbackReq = httpMock.expectOne('http://localhost:8083/cart/20');
    expect(fallbackReq.request.method).toBe('GET');
    fallbackReq.flush(mockCart);
  });

  it('should add item to wishlist through gateway API', () => {
    const payload = { bookId: 5, bookTitle: 'Ikigai', bookPrice: 299 };
    const mockWishlist = {
      wishlistId: 3,
      userId: 30,
      items: [{ itemId: 1, ...payload }]
    };

    service.addToWishlist(30, payload).subscribe((wishlist) => {
      expect(wishlist.items[0].bookTitle).toBe('Ikigai');
    });

    const req = httpMock.expectOne('http://localhost:8080/wishlist/30/items');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockWishlist);
  });

  it('should fetch orders from gateway API', () => {
    const mockOrders = [
      {
        orderId: 11,
        userId: 40,
        orderDate: '2026-05-11',
        amountPaid: 599,
        modeOfPayment: 'ONLINE',
        orderStatus: 'PLACED',
        quantity: 1,
        productId: 22,
        productName: 'The Alchemist',
        address: {
          addressId: 1,
          customerId: 40,
          fullName: 'Kashish',
          mobileNumber: '9876543210',
          flatNumber: '12A',
          city: 'Delhi',
          pincode: '110001',
          state: 'Delhi'
        }
      }
    ];

    service.getOrders(40).subscribe((orders) => {
      expect(orders.length).toBe(1);
      expect(orders[0].productName).toBe('The Alchemist');
    });

    const req = httpMock.expectOne('http://localhost:8080/orders/user/40');
    expect(req.request.method).toBe('GET');
    req.flush(mockOrders);
  });

  it('should update order status through gateway API', () => {
    const updatedOrder = {
      orderId: 15,
      userId: 50,
      orderDate: '2026-05-11',
      amountPaid: 799,
      modeOfPayment: 'COD',
      orderStatus: 'DELIVERED',
      quantity: 1,
      productId: 30,
      productName: 'Sapiens',
      address: {
        addressId: 2,
        customerId: 50,
        fullName: 'Kashish',
        mobileNumber: '9876543210',
        flatNumber: '11B',
        city: 'Noida',
        pincode: '201301',
        state: 'UP'
      }
    };

    service.updateOrderStatus(15, 'DELIVERED').subscribe((order) => {
      expect(order.orderStatus).toBe('DELIVERED');
    });

    const req = httpMock.expectOne('http://localhost:8080/orders/15/status');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ orderStatus: 'DELIVERED' });
    req.flush(updatedOrder);
  });
});
