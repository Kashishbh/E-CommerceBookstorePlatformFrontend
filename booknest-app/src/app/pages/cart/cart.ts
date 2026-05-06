import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Cart as CartModel, Order as OrderModel, PaymentReceipt, Wallet as WalletModel } from '../../core/models';
import { AuthService } from '../../core/services/auth';
import { ShopService } from '../../core/services/shop';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (eventName: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

@Component({
  selector: 'app-cart',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss'
})
export class Cart implements OnInit {
  private readonly shopService = inject(ShopService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly cart = signal<CartModel | null>(null);
  protected readonly wallet = signal<WalletModel | null>(null);
  protected readonly error = signal('');
  protected readonly info = signal('');
  protected readonly loading = signal(true);
  protected readonly razorpayLoading = signal(false);
  protected readonly removeBusyItemId = signal<number | null>(null);
  protected readonly latestReceipt = signal<PaymentReceipt | null>(this.readStoredReceipt());
  protected readonly userId = computed(() => this.authService.getCurrentUserId());

  protected readonly checkoutForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    mobileNumber: ['', Validators.required],
    flatNumber: ['', Validators.required],
    city: ['', Validators.required],
    pincode: ['', Validators.required],
    state: ['', Validators.required],
    paymentMethod: ['ONLINE' as 'ONLINE' | 'COD', Validators.required],
    walletId: [0, Validators.required]
  });

  ngOnInit(): void {
    const user = this.authService.user();
    if (!this.userId()) {
      this.router.navigate(['/login']);
      return;
    }
    this.checkoutForm.patchValue({
      fullName: user?.fullName ?? '',
      mobileNumber: user?.mobile ?? ''
    });
    this.ensureRazorpayScript();
    this.loadWallet();
    this.loadCart();
  }

  protected loadCart(): void {
    const userId = this.userId();
    if (!userId) {
      this.error.set('Please log in to view your cart.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.shopService.getCart(userId).subscribe({
      next: (cart) => {
        this.cart.set(cart);
        this.error.set('');
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error?.error?.message || 'Your cart could not be loaded right now.');
        this.loading.set(false);
      }
    });
  }

  protected loadWallet(): void {
    const userId = this.userId();
    if (!userId) {
      return;
    }

    this.shopService.getWalletByUser(userId).subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
        this.checkoutForm.patchValue({ walletId: wallet.walletId });
      },
      error: () => {
        this.shopService.createWallet(userId).subscribe({
          next: (wallet) => {
            this.wallet.set(wallet);
            this.checkoutForm.patchValue({ walletId: wallet.walletId });
          },
          error: () => this.error.set('Your wallet could not be prepared for checkout.')
        });
      }
    });
  }

  protected updateQuantity(itemId: number, quantity: string): void {
    const userId = this.userId();
    const nextQuantity = Number(quantity);
    if (!userId || !Number.isFinite(nextQuantity) || nextQuantity < 1) {
      this.error.set('Please choose a valid quantity.');
      return;
    }

    this.shopService.updateCartQuantity(userId, itemId, nextQuantity).subscribe({
      next: (cart) => {
        this.cart.set(cart);
        this.info.set('Cart updated.');
        this.error.set('');
      },
      error: (error) => this.error.set(error?.error?.message || 'Quantity could not be updated.')
    });
  }

  protected removeItem(itemId: number): void {
    const userId = this.userId();
    const currentCart = this.cart();
    if (!userId) {
      this.error.set('Please log in to edit your cart.');
      return;
    }
    if (this.removeBusyItemId() === itemId) {
      return;
    }

    this.removeBusyItemId.set(itemId);
    if (currentCart) {
      const remainingItems = currentCart.items.filter((item) => item.itemId !== itemId);
      const recalculatedTotal = remainingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      this.cart.set({
        ...currentCart,
        items: remainingItems,
        totalPrice: recalculatedTotal
      });
    }

    this.shopService.removeCartItem(userId, itemId).subscribe({
      next: () => {
        this.removeBusyItemId.set(null);
        this.info.set('Book removed from your cart.');
        this.error.set('');
        this.loadCart();
      },
      error: (error) => {
        this.removeBusyItemId.set(null);
        this.cart.set(currentCart);
        this.error.set(error?.error?.message || 'This item could not be removed.');
      }
    });
  }

  protected clearCart(): void {
    const userId = this.userId();
    if (!userId) {
      this.error.set('Please log in to edit your cart.');
      return;
    }

    this.shopService.clearCart(userId).subscribe({
      next: (cart) => {
        this.cart.set(cart);
        this.info.set('Your cart has been cleared.');
        this.error.set('');
      },
      error: (error) => this.error.set(error?.error?.message || 'Your cart could not be cleared.')
    });
  }

  protected checkout(): void {
    const userId = this.userId();
    const currentCart = this.cart();
    if (!userId) {
      this.error.set('Please log in to place your order.');
      return;
    }
    if (!currentCart?.items.length) {
      this.error.set('Add at least one book before placing your order.');
      return;
    }
    if (this.checkoutForm.invalid) {
      this.error.set('Please complete your checkout details first.');
      return;
    }

    const firstItem = currentCart.items[0];
    const formValue = this.checkoutForm.getRawValue();
    const isOnlinePayment = formValue.paymentMethod === 'ONLINE';

    this.shopService.saveAddress({
      customerId: userId,
      fullName: formValue.fullName,
      mobileNumber: formValue.mobileNumber,
      flatNumber: formValue.flatNumber,
      city: formValue.city,
      pincode: formValue.pincode,
      state: formValue.state
    }).subscribe({
      next: (address) => isOnlinePayment
        ? this.startRazorpayCheckout(
            userId,
            currentCart,
            firstItem,
            address.addressId,
            Number(formValue.walletId),
            {
              fullName: formValue.fullName,
              mobileNumber: formValue.mobileNumber,
              flatNumber: formValue.flatNumber,
              city: formValue.city,
              pincode: formValue.pincode,
              state: formValue.state
            }
          )
        : this.placeCodOrder(userId, currentCart, firstItem, address.addressId),
      error: (error) => this.error.set(error?.error?.message || 'Your address could not be saved.')
    });
  }

  private placeCodOrder(
    userId: number,
    currentCart: CartModel,
    firstItem: CartModel['items'][number],
    addressId: number
  ): void {
    this.shopService.placeCodOrder({
      userId,
      amountPaid: currentCart.totalPrice,
      quantity: firstItem.quantity,
      productId: firstItem.bookId,
      addressId
    }).subscribe({
      next: () => this.finishSuccessfulOrder(userId, currentCart, 'Your cash on delivery order has been placed successfully and your cart is now empty.', 'Your cash on delivery order has been placed successfully.'),
      error: (error) => this.error.set(error?.error?.message || 'Your order could not be placed.')
    });
  }

  private startRazorpayCheckout(
    userId: number,
    currentCart: CartModel,
    firstItem: CartModel['items'][number],
    addressId: number,
    walletId: number,
    customerDetails: {
      fullName: string;
      mobileNumber: string;
      flatNumber: string;
      city: string;
      pincode: string;
      state: string;
    }
  ): void {
    const user = this.authService.user();
    const remarks = `Order payment for ${firstItem.bookTitle}`;

    this.razorpayLoading.set(true);
    this.shopService.createTopupOrder(walletId, currentCart.totalPrice).subscribe({
      next: (response) => {
        this.error.set('');
        this.openRazorpayCheckout({
          walletId,
          amount: currentCart.totalPrice,
          remarks,
          keyId: response.keyId,
          razorpayOrderId: response.razorpayOrderId,
          currency: response.currency,
          amountInPaise: response.amount,
          name: user?.fullName ?? 'BookNest user',
          email: user?.email ?? '',
          contact: user?.mobile ?? '',
          onVerified: (payment) => {
            this.shopService.placeOnlineOrder({
              userId,
              amountPaid: currentCart.totalPrice,
              quantity: firstItem.quantity,
              productId: firstItem.bookId,
              addressId,
              walletId
            }).subscribe({
              next: (order) => {
                this.storeReceipt({
                  order,
                  payment,
                  amountPaid: currentCart.totalPrice,
                  customerName: customerDetails.fullName,
                  customerEmail: user?.email ?? '',
                  customerMobile: customerDetails.mobileNumber,
                  address: `${customerDetails.flatNumber}, ${customerDetails.city}, ${customerDetails.state} - ${customerDetails.pincode}`,
                  productName: firstItem.bookTitle,
                  quantity: firstItem.quantity
                });
                this.finishSuccessfulOrder(userId, currentCart, 'Your Razorpay payment was successful and your order has been placed.', 'Your order has been placed successfully.');
              },
              error: (error) => {
                this.razorpayLoading.set(false);
                this.error.set(error?.error?.message || 'Payment was completed, but the order could not be placed.');
                this.loadWallet();
              }
            });
          }
        });
      },
      error: (error) => {
        this.razorpayLoading.set(false);
        this.error.set(error?.error?.message || 'Razorpay checkout could not be started.');
      }
    });
  }

  private finishSuccessfulOrder(userId: number, currentCart: CartModel, successMessage: string, fallbackMessage: string): void {
    this.shopService.clearCart(userId).subscribe({
      next: (cart) => {
        this.cart.set(cart);
        this.info.set(successMessage);
        this.error.set('');
        this.razorpayLoading.set(false);
        this.loadWallet();
      },
      error: () => {
        this.cart.set({ ...(currentCart ?? { cartId: 0, userId, totalPrice: 0, items: [] }), totalPrice: 0, items: [] });
        this.info.set(fallbackMessage);
        this.error.set('');
        this.razorpayLoading.set(false);
        this.loadWallet();
      }
    });
  }

  private ensureRazorpayScript(): Promise<void> {
    if (window.Razorpay) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-razorpay-checkout="true"]') as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Razorpay SDK could not be loaded.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset['razorpayCheckout'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Razorpay SDK could not be loaded.'));
      document.body.appendChild(script);
    });
  }

  private openRazorpayCheckout(config: {
    walletId: number;
    amount: number;
    remarks: string;
    keyId: string;
    razorpayOrderId: string;
    currency: string;
    amountInPaise: number;
    name: string;
    email: string;
    contact: string;
    onVerified: (payment: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => void;
  }): void {
    this.ensureRazorpayScript()
      .then(() => {
        if (!window.Razorpay) {
          throw new Error('Razorpay checkout is not available right now.');
        }

        const razorpay = new window.Razorpay({
          key: config.keyId,
          amount: config.amountInPaise,
          currency: config.currency,
          name: 'BookNest Online Payment',
          description: config.remarks,
          order_id: config.razorpayOrderId,
          prefill: {
            name: config.name,
            email: config.email,
            contact: config.contact
          },
          theme: {
            color: '#ff7a59'
          },
          modal: {
            ondismiss: () => {
              this.razorpayLoading.set(false);
              this.info.set('');
            }
          },
          handler: (payment: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            this.shopService.verifyTopup(config.walletId, {
              razorpayOrderId: payment.razorpay_order_id,
              razorpayPaymentId: payment.razorpay_payment_id,
              razorpaySignature: payment.razorpay_signature,
              amount: config.amount,
              remarks: config.remarks
            }).subscribe({
              next: () => {
                this.info.set('Payment successful. Confirming your order...');
                this.error.set('');
                config.onVerified(payment);
              },
              error: (error) => {
                this.razorpayLoading.set(false);
                this.error.set(error?.error?.message || 'Payment succeeded, but verification failed.');
              }
            });
          }
        });

        razorpay.on('payment.failed', (response) => {
          this.razorpayLoading.set(false);
          this.error.set(response?.error?.description || 'Razorpay payment failed.');
        });

        this.info.set('Opening Razorpay checkout...');
        razorpay.open();
      })
      .catch((error: Error) => {
        this.razorpayLoading.set(false);
        this.error.set(error.message || 'Razorpay could not be started.');
      });
  }

  protected downloadReceipt(): void {
    const receipt = this.latestReceipt();
    if (!receipt) {
      return;
    }

    const receiptHtml = `
      <html>
        <head>
          <title>BookNest Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #16213e; }
            .card { max-width: 720px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; }
            h1 { margin: 0 0 16px; }
            .row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .row strong { min-width: 180px; }
            .total { font-size: 22px; font-weight: 700; color: #0f766e; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>BookNest Payment Receipt</h1>
            <div class="row"><strong>Order ID</strong><span>#${receipt.orderId}</span></div>
            <div class="row"><strong>Razorpay Order ID</strong><span>${receipt.razorpayOrderId}</span></div>
            <div class="row"><strong>Razorpay Payment ID</strong><span>${receipt.razorpayPaymentId}</span></div>
            <div class="row"><strong>Customer</strong><span>${receipt.customerName}</span></div>
            <div class="row"><strong>Email</strong><span>${receipt.customerEmail || '-'}</span></div>
            <div class="row"><strong>Mobile</strong><span>${receipt.customerMobile}</span></div>
            <div class="row"><strong>Book</strong><span>${receipt.productName}</span></div>
            <div class="row"><strong>Quantity</strong><span>${receipt.quantity}</span></div>
            <div class="row"><strong>Delivery Address</strong><span>${receipt.address}</span></div>
            <div class="row"><strong>Payment Date</strong><span>${new Date(receipt.paymentDate).toLocaleString()}</span></div>
            <div class="row total"><strong>Amount Paid</strong><span>₹${receipt.amountPaid}</span></div>
          </div>
        </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) {
      this.error.set('Please allow popups to generate your receipt.');
      return;
    }

    popup.document.open();
    popup.document.write(receiptHtml);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  private storeReceipt(data: {
    order: OrderModel;
    payment: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    };
    amountPaid: number;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    address: string;
    productName: string;
    quantity: number;
  }): void {
    const receipt: PaymentReceipt = {
      orderId: data.order.orderId,
      razorpayOrderId: data.payment.razorpay_order_id,
      razorpayPaymentId: data.payment.razorpay_payment_id,
      amountPaid: data.amountPaid,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerMobile: data.customerMobile,
      address: data.address,
      productName: data.productName,
      quantity: data.quantity,
      paymentDate: new Date().toISOString()
    };

    const history = this.readReceiptHistory().filter((item) => item.orderId !== receipt.orderId);
    history.unshift(receipt);
    localStorage.setItem('booknest_payment_receipts', JSON.stringify(history));
    localStorage.setItem('booknest_latest_receipt', JSON.stringify(receipt));
    this.latestReceipt.set(receipt);
  }

  private readStoredReceipt(): PaymentReceipt | null {
    const raw = localStorage.getItem('booknest_latest_receipt');
    return raw ? JSON.parse(raw) as PaymentReceipt : null;
  }

  private readReceiptHistory(): PaymentReceipt[] {
    const raw = localStorage.getItem('booknest_payment_receipts');
    return raw ? JSON.parse(raw) as PaymentReceipt[] : [];
  }
}

