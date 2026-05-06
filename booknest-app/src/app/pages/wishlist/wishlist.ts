import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Wishlist as WishlistModel } from '../../core/models';
import { AuthService } from '../../core/services/auth';
import { ShopService } from '../../core/services/shop';

@Component({
  selector: 'app-wishlist',
  imports: [CommonModule],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss'
})
export class Wishlist implements OnInit {
  private readonly shopService = inject(ShopService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly wishlist = signal<WishlistModel | null>(null);
  protected readonly userId = computed(() => this.authService.getCurrentUserId());
  protected readonly info = signal('');
  protected readonly error = signal('');

  ngOnInit(): void {
    if (!this.userId()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadWishlist();
  }

  protected loadWishlist(): void {
    const userId = this.userId();
    if (!userId) {
      this.error.set('Please log in to view your wishlist.');
      return;
    }

    this.shopService.getWishlist(userId).subscribe({
      next: (wishlist) => {
        this.wishlist.set(wishlist);
        this.error.set('');
      },
      error: (error) => this.error.set(error?.error?.message || 'Your wishlist could not be loaded.')
    });
  }

  protected removeBook(bookId: number): void {
    const userId = this.userId();
    if (!userId) {
      this.error.set('Please log in to edit your wishlist.');
      return;
    }

    this.shopService.removeWishlistBook(userId, bookId).subscribe({
      next: (wishlist) => {
        this.wishlist.set(wishlist);
        this.info.set('Book removed from your wishlist.');
        this.error.set('');
      },
      error: (error) => this.error.set(error?.error?.message || 'This book could not be removed.')
    });
  }

  protected moveToCart(bookId: number): void {
    const userId = this.userId();
    if (!userId) {
      this.error.set('Please log in to edit your wishlist.');
      return;
    }

    this.shopService.moveWishlistToCart(userId, bookId).subscribe({
      next: (message) => {
        this.info.set(message);
        this.error.set('');
        this.loadWishlist();
      },
      error: (error) => this.error.set(error?.error?.message || 'This book could not be moved to cart.')
    });
  }
}

