import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Order, PaymentReceipt } from '../../core/models';
import { AuthService } from '../../core/services/auth';
import { ShopService } from '../../core/services/shop';

@Component({
  selector: 'app-orders',
  imports: [CommonModule],
  templateUrl: './orders.html',
  styleUrl: './orders.scss'
})
export class Orders implements OnInit {
  private readonly shopService = inject(ShopService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly orders = signal<Order[]>([]);
  protected readonly userId = computed(() => this.authService.getCurrentUserId());
  protected readonly info = signal('');
  protected readonly error = signal('');
  private readonly receiptHistory = signal<PaymentReceipt[]>(this.readReceiptHistory());

  ngOnInit(): void {
    if (!this.userId()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadOrders();
  }

  protected loadOrders(): void {
    const userId = this.userId();
    if (!userId) {
      this.error.set('Please log in to view your orders.');
      return;
    }

    this.shopService.getOrders(userId).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.error.set('');
      },
      error: (error) => this.error.set(error?.error?.message || 'Your orders could not be loaded.')
    });
  }

  protected cancel(orderId: number): void {
    this.shopService.updateOrderStatus(orderId, 'CANCELLED').subscribe({
      next: () => {
        this.info.set(`Order ${orderId} cancelled.`);
        this.error.set('');
        this.loadOrders();
      },
      error: (error) => this.error.set(error?.error?.message || 'This order could not be cancelled.')
    });
  }

  protected writeReview(order: Order): void {
    this.router.navigate(['/books', order.productId], {
      queryParams: {
        review: 'true',
        orderId: order.orderId
      }
    });
  }

  protected downloadReceipt(order: Order): void {
    const storedReceipt = this.receiptHistory().find((item) => item.orderId === order.orderId);
    const receipt: PaymentReceipt = storedReceipt ?? {
      orderId: order.orderId,
      razorpayOrderId: 'Recorded with Razorpay',
      razorpayPaymentId: 'Available in payment gateway record',
      amountPaid: order.amountPaid,
      customerName: order.address?.fullName || 'BookNest customer',
      customerEmail: this.authService.user()?.email || '',
      customerMobile: order.address?.mobileNumber || '',
      address: order.address
        ? `${order.address.flatNumber}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}`
        : 'Address not available',
      productName: order.productName,
      quantity: order.quantity,
      paymentDate: order.orderDate
    };

    const receiptHtml = `
      <html>
        <head>
          <title>BookNest Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #16213e; }
            .card { max-width: 760px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; }
            h1 { margin: 0 0 8px; }
            .status { margin: 0 0 18px; color: #15803d; font-weight: 700; }
            .row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .row strong { min-width: 220px; }
            .total { font-size: 22px; font-weight: 700; color: #0f766e; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>BookNest Payment Receipt</h1>
            <p class="status">Payment Success Receipt</p>
            <div class="row"><strong>Order ID</strong><span>#${receipt.orderId}</span></div>
            <div class="row"><strong>Order Status</strong><span>${order.orderStatus}</span></div>
            <div class="row"><strong>Razorpay Order ID</strong><span>${receipt.razorpayOrderId}</span></div>
            <div class="row"><strong>Razorpay Payment ID</strong><span>${receipt.razorpayPaymentId}</span></div>
            <div class="row"><strong>Customer Name</strong><span>${receipt.customerName}</span></div>
            <div class="row"><strong>Email</strong><span>${receipt.customerEmail || '-'}</span></div>
            <div class="row"><strong>Mobile</strong><span>${receipt.customerMobile}</span></div>
            <div class="row"><strong>Book</strong><span>${receipt.productName}</span></div>
            <div class="row"><strong>Quantity</strong><span>${receipt.quantity}</span></div>
            <div class="row"><strong>Payment Mode</strong><span>${order.modeOfPayment}</span></div>
            <div class="row"><strong>Delivery Address</strong><span>${receipt.address}</span></div>
            <div class="row"><strong>Payment Date</strong><span>${new Date(receipt.paymentDate).toLocaleString()}</span></div>
            <div class="row total"><strong>Amount Paid</strong><span>₹${receipt.amountPaid}</span></div>
          </div>
        </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'width=920,height=720');
    if (!popup) {
      this.error.set('Please allow popups to download your receipt.');
      return;
    }

    popup.document.open();
    popup.document.write(receiptHtml);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  private readReceiptHistory(): PaymentReceipt[] {
    const raw = localStorage.getItem('booknest_payment_receipts');
    return raw ? JSON.parse(raw) as PaymentReceipt[] : [];
  }
}
