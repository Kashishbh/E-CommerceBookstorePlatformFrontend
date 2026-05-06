import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Wallet as WalletModel, WalletStatement } from '../../core/models';
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
  selector: 'app-wallet',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './wallet.html',
  styleUrl: './wallet.scss'
})
export class Wallet implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly shopService = inject(ShopService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly wallet = signal<WalletModel | null>(null);
  protected readonly statements = signal<WalletStatement[]>([]);
  protected readonly userId = computed(() => this.authService.getCurrentUserId());
  protected readonly info = signal('');
  protected readonly error = signal('');
  protected readonly razorpayOrderId = signal('');
  protected readonly razorpayLoading = signal(false);

  protected readonly topupForm = this.fb.nonNullable.group({
    amount: [500, [Validators.required, Validators.min(1)]],
    remarks: ['Wallet top-up']
  });

  ngOnInit(): void {
    if (!this.userId()) {
      this.router.navigate(['/login']);
      return;
    }
    this.ensureRazorpayScript();
    this.loadWallet();
  }

  protected loadWallet(): void {
    const userId = this.userId();
    if (!userId) {
      this.error.set('Please log in to view your wallet.');
      return;
    }

    this.shopService.getWalletByUser(userId).subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
        this.error.set('');
        this.shopService.getWalletStatements(wallet.walletId).subscribe({
          next: (statements) => this.statements.set(statements),
          error: () => this.error.set('Your wallet statements could not be loaded.')
        });
      },
      error: () => {
        this.shopService.createWallet(userId).subscribe({
          next: (wallet) => {
            this.wallet.set(wallet);
            this.statements.set([]);
            this.error.set('');
          },
          error: (error) => this.error.set(error?.error?.message || 'Your wallet could not be created.')
        });
      }
    });
  }

  protected addMoney(): void {
    const wallet = this.wallet();
    if (!wallet) return;
    const value = this.topupForm.getRawValue();
    this.shopService.addMoney(wallet.walletId, Number(value.amount), value.remarks).subscribe({
      next: () => {
        this.info.set('Wallet top-up successful.');
        this.error.set('');
        this.loadWallet();
      },
      error: (error) => this.error.set(error?.error?.message || 'Top-up failed')
    });
  }

  protected createRazorpayOrder(): void {
    const wallet = this.wallet();
    const user = this.authService.user();
    const amount = Number(this.topupForm.getRawValue().amount);
    const remarks = this.topupForm.getRawValue().remarks;

    if (!wallet) {
      this.error.set('Your wallet is not ready yet.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      this.error.set('Enter a valid amount before opening Razorpay.');
      return;
    }

    this.razorpayLoading.set(true);
    this.shopService.createTopupOrder(wallet.walletId, amount).subscribe({
      next: (response) => {
        this.razorpayOrderId.set(response.razorpayOrderId);
        this.error.set('');
        this.openRazorpayCheckout({
          walletId: wallet.walletId,
          amount,
          remarks,
          keyId: response.keyId,
          razorpayOrderId: response.razorpayOrderId,
          currency: response.currency,
          amountInPaise: response.amount,
          name: user?.fullName ?? 'BookNest user',
          email: user?.email ?? '',
          contact: user?.mobile ?? ''
        });
      },
      error: (error) => {
        this.razorpayLoading.set(false);
        this.error.set(error?.error?.message || 'Razorpay order could not be created.');
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
          name: 'BookNest Wallet Top-up',
          description: config.remarks || 'Add money to your BookNest wallet',
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
                this.razorpayLoading.set(false);
                this.info.set('Razorpay payment successful and your wallet has been updated.');
                this.error.set('');
                this.loadWallet();
              },
              error: (error) => {
                this.razorpayLoading.set(false);
                this.error.set(error?.error?.message || 'Payment succeeded, but wallet verification failed.');
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
}

