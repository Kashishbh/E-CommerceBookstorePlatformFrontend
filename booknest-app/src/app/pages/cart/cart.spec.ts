import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Cart } from './cart';
import { AuthService } from '../../core/services/auth';
import { ShopService } from '../../core/services/shop';

describe('Cart Component', () => {
  let authServiceSpy: {
    getCurrentUserId: jest.Mock;
    user: jest.Mock;
  };
  let shopServiceSpy: {
    getCart: jest.Mock;
    getWalletByUser: jest.Mock;
    createWallet: jest.Mock;
    updateCartQuantity: jest.Mock;
    removeCartItem: jest.Mock;
    clearCart: jest.Mock;
    saveAddress: jest.Mock;
    placeCodOrder: jest.Mock;
    placeOnlineOrder: jest.Mock;
    createTopupOrder: jest.Mock;
    verifyTopup: jest.Mock;
  };
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      getCurrentUserId: jest.fn(),
      user: jest.fn()
    };

    shopServiceSpy = {
      getCart: jest.fn(),
      getWalletByUser: jest.fn(),
      createWallet: jest.fn(),
      updateCartQuantity: jest.fn(),
      removeCartItem: jest.fn(),
      clearCart: jest.fn(),
      saveAddress: jest.fn(),
      placeCodOrder: jest.fn(),
      placeOnlineOrder: jest.fn(),
      createTopupOrder: jest.fn(),
      verifyTopup: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [Cart],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ShopService, useValue: shopServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should redirect to login when user is not authenticated', () => {
    authServiceSpy.getCurrentUserId.mockReturnValue(null);
    authServiceSpy.user.mockReturnValue(null);

    const fixture = TestBed.createComponent(Cart);
    const component = fixture.componentInstance;
    component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should load cart and wallet when user is authenticated', () => {
    authServiceSpy.getCurrentUserId.mockReturnValue(7);
    authServiceSpy.user.mockReturnValue({ fullName: 'Kashish', mobile: '9876543210' });
    shopServiceSpy.getWalletByUser.mockReturnValue(of({ walletId: 8, userId: 7, balance: 1000 }));
    shopServiceSpy.getCart.mockReturnValue(of({
      cartId: 1,
      userId: 7,
      totalPrice: 499,
      items: [{ itemId: 1, bookId: 10, bookTitle: 'Atomic Habits', price: 499, quantity: 1 }]
    }));

    const fixture = TestBed.createComponent(Cart);
    const component = fixture.componentInstance;
    jest.spyOn(component as never, 'ensureRazorpayScript').mockReturnValue(Promise.resolve());

    component.ngOnInit();

    expect(shopServiceSpy.getWalletByUser).toHaveBeenCalledWith(7);
    expect(shopServiceSpy.getCart).toHaveBeenCalledWith(7);
    expect(component['checkoutForm'].getRawValue().fullName).toBe('Kashish');
    expect(component['checkoutForm'].getRawValue().walletId).toBe(8);
  });

  it('should create wallet if wallet lookup fails', () => {
    authServiceSpy.getCurrentUserId.mockReturnValue(7);
    authServiceSpy.user.mockReturnValue({ fullName: 'Kashish', mobile: '9876543210' });
    shopServiceSpy.getWalletByUser.mockReturnValue(throwError(() => new Error('missing')));
    shopServiceSpy.createWallet.mockReturnValue(of({ walletId: 9, userId: 7, balance: 0 }));
    shopServiceSpy.getCart.mockReturnValue(of({
      cartId: 1,
      userId: 7,
      totalPrice: 0,
      items: []
    }));

    const fixture = TestBed.createComponent(Cart);
    const component = fixture.componentInstance;
    jest.spyOn(component as never, 'ensureRazorpayScript').mockReturnValue(Promise.resolve());

    component.ngOnInit();

    expect(shopServiceSpy.createWallet).toHaveBeenCalledWith(7);
    expect(component['checkoutForm'].getRawValue().walletId).toBe(9);
  });

  it('should show error when checkout is attempted with empty cart', () => {
    authServiceSpy.getCurrentUserId.mockReturnValue(7);
    authServiceSpy.user.mockReturnValue({ fullName: 'Kashish', mobile: '9876543210' });
    shopServiceSpy.getWalletByUser.mockReturnValue(of({ walletId: 8, userId: 7, balance: 1000 }));
    shopServiceSpy.getCart.mockReturnValue(of({
      cartId: 1,
      userId: 7,
      totalPrice: 0,
      items: []
    }));

    const fixture = TestBed.createComponent(Cart);
    const component = fixture.componentInstance;
    jest.spyOn(component as never, 'ensureRazorpayScript').mockReturnValue(Promise.resolve());

    component.ngOnInit();
    component['checkout']();

    expect(component['error']()).toBe('Add at least one book before placing your order.');
    expect(shopServiceSpy.saveAddress).not.toHaveBeenCalled();
  });

  it('should show error when checkout form is invalid', () => {
    authServiceSpy.getCurrentUserId.mockReturnValue(7);
    authServiceSpy.user.mockReturnValue({ fullName: '', mobile: '' });
    shopServiceSpy.getWalletByUser.mockReturnValue(of({ walletId: 8, userId: 7, balance: 1000 }));
    shopServiceSpy.getCart.mockReturnValue(of({
      cartId: 1,
      userId: 7,
      totalPrice: 499,
      items: [{ itemId: 1, bookId: 10, bookTitle: 'Atomic Habits', price: 499, quantity: 1 }]
    }));

    const fixture = TestBed.createComponent(Cart);
    const component = fixture.componentInstance;
    jest.spyOn(component as never, 'ensureRazorpayScript').mockReturnValue(Promise.resolve());

    component.ngOnInit();
    component['checkoutForm'].patchValue({
      fullName: '',
      mobileNumber: '',
      flatNumber: '',
      city: '',
      pincode: '',
      state: ''
    });
    component['checkout']();

    expect(component['error']()).toBe('Please complete your checkout details first.');
    expect(shopServiceSpy.saveAddress).not.toHaveBeenCalled();
  });
});
