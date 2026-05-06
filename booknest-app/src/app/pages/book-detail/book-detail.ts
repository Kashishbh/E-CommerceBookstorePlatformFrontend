import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Book, ReviewItem } from '../../core/models';
import { AuthService } from '../../core/services/auth';
import { BooksService } from '../../core/services/books';
import { ShopService } from '../../core/services/shop';

@Component({
  selector: 'app-book-detail',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './book-detail.html',
  styleUrl: './book-detail.scss'
})
export class BookDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly booksService = inject(BooksService);
  private readonly shopService = inject(ShopService);
  private readonly authService = inject(AuthService);

  protected readonly book = signal<Book | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly actionMessage = signal('');
  protected readonly actionBusy = signal(false);
  protected readonly canWriteReview = signal(false);
  protected readonly reviewMode = signal(false);
  protected readonly reviewBusy = signal(false);
  protected readonly reviewRating = signal(5);
  protected readonly reviewComment = signal('');
  protected readonly reviews = signal<ReviewItem[]>([]);
  protected readonly description = computed(() => this.book()?.description || 'No description available for this book yet.');

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.reviewMode.set(params.get('review') === 'true' && this.canWriteReview());
    });

    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!id) {
        this.error.set('Book not found.');
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      this.booksService.getBookById(id).subscribe({
        next: (book) => {
          this.book.set(book);
          this.checkReviewEligibility(book.bookId);
          this.loadReviews(book.bookId);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('This book could not be loaded.');
          this.loading.set(false);
        }
      });
    });
  }

  protected orderNow(): void {
    const book = this.book();
    const userId = this.authService.getCurrentUserId();
    if (!book) return;
    if (!userId) {
      this.actionMessage.set('Please login first to continue.');
      this.router.navigate(['/login']);
      return;
    }
    if (this.actionBusy()) {
      return;
    }

    this.actionBusy.set(true);

    this.shopService.getCart(userId).subscribe({
      next: (cart) => {
        const existing = cart.items.find((item) => item.bookId === book.bookId);
        if (existing) {
          this.actionBusy.set(false);
          this.router.navigate(['/cart']);
          return;
        }

        this.shopService.addToCart(userId, {
          bookId: book.bookId,
          bookTitle: book.title,
          price: book.price,
          quantity: 1
        }).subscribe({
          next: () => {
            this.actionBusy.set(false);
            this.router.navigate(['/cart']);
          },
          error: (err) => {
            this.actionBusy.set(false);
            console.error('Order now failed', err);
            this.actionMessage.set(err?.error?.message || 'Could not continue to order right now.');
          }
        });
      },
      error: () => {
        this.shopService.addToCart(userId, {
          bookId: book.bookId,
          bookTitle: book.title,
          price: book.price,
          quantity: 1
        }).subscribe({
          next: () => {
            this.actionBusy.set(false);
            this.router.navigate(['/cart']);
          },
          error: (err) => {
            this.actionBusy.set(false);
            console.error('Order now failed', err);
            this.actionMessage.set(err?.error?.message || 'Could not continue to order right now.');
          }
        });
      }
    });
  }

  protected addToCart(): void {
    const book = this.book();
    const userId = this.authService.getCurrentUserId();
    if (!book) return;
    if (!userId) {
      this.actionMessage.set('Please login first to add books to your cart.');
      this.router.navigate(['/login']);
      return;
    }
    if (this.actionBusy()) {
      return;
    }

    this.actionBusy.set(true);

    this.shopService.getCart(userId).subscribe({
      next: (cart) => {
        const existing = cart.items.find((item) => item.bookId === book.bookId);
        if (existing) {
          this.actionBusy.set(false);
          this.actionMessage.set(`${book.title} is already in your cart.`);
          return;
        }

        this.shopService.addToCart(userId, {
          bookId: book.bookId,
          bookTitle: book.title,
          price: book.price,
          quantity: 1
        }).subscribe({
          next: () => {
            this.actionBusy.set(false);
            this.actionMessage.set(`${book.title} was added to your cart.`);
          },
          error: (err) => {
            this.actionBusy.set(false);
            console.error('Add to cart failed', err);
            this.actionMessage.set(err?.error?.message || 'Could not add this book to your cart.');
          }
        });
      },
      error: () => {
        this.shopService.addToCart(userId, {
          bookId: book.bookId,
          bookTitle: book.title,
          price: book.price,
          quantity: 1
        }).subscribe({
          next: () => {
            this.actionBusy.set(false);
            this.actionMessage.set(`${book.title} was added to your cart.`);
          },
          error: (err) => {
            this.actionBusy.set(false);
            console.error('Add to cart failed', err);
            this.actionMessage.set(err?.error?.message || 'Could not add this book to your cart.');
          }
        });
      }
    });
  }

  protected addToWishlist(): void {
    const book = this.book();
    const userId = this.authService.getCurrentUserId();
    if (!book) return;
    if (!userId) {
      this.actionMessage.set('Please login first to save books to your wishlist.');
      this.router.navigate(['/login']);
      return;
    }
    if (this.actionBusy()) {
      return;
    }

    this.actionBusy.set(true);

    this.shopService.addToWishlist(userId, {
      bookId: book.bookId,
      bookTitle: book.title,
      bookPrice: book.price
    }).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.actionMessage.set(`${book.title} was added to your wishlist.`);
      },
      error: (err) => {
        this.actionBusy.set(false);
        console.error('Add to wishlist failed', err);
        this.actionMessage.set(err?.error?.message || 'Could not add this book to your wishlist.');
      }
    });
  }

  protected submitReview(): void {
    const book = this.book();
    const userId = this.authService.getCurrentUserId();
    if (!book) return;
    if (!userId) {
      this.actionMessage.set('Please login first to write a review.');
      this.router.navigate(['/login']);
      return;
    }
    if (!this.reviewComment().trim()) {
      this.actionMessage.set('Please write a short review before submitting.');
      return;
    }
    if (this.reviewBusy()) {
      return;
    }

    this.reviewBusy.set(true);
    this.shopService.addReview({
      bookId: book.bookId,
      userId,
      rating: this.reviewRating(),
      comment: this.reviewComment().trim(),
      verified: true
    }).subscribe({
      next: () => {
        this.reviewBusy.set(false);
        this.reviewComment.set('');
        this.reviewRating.set(5);
        this.reviewMode.set(false);
        this.actionMessage.set('Your review was submitted successfully.');
        this.loadReviews(book.bookId);
      },
      error: (err) => {
        this.reviewBusy.set(false);
        this.actionMessage.set(err?.error?.message || 'Your review could not be submitted.');
      }
    });
  }

  protected openReviewForm(): void {
    if (!this.canWriteReview()) {
      this.actionMessage.set('You can write a review only after this order is delivered.');
      return;
    }

    this.reviewMode.set(true);
  }

  private loadReviews(bookId: number): void {
    this.shopService.getBookReviews(bookId).subscribe({
      next: (reviews) => this.reviews.set(reviews),
      error: () => this.reviews.set([])
    });
  }

  private checkReviewEligibility(bookId: number): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      this.canWriteReview.set(false);
      this.reviewMode.set(false);
      return;
    }

    this.shopService.getOrders(userId).subscribe({
      next: (orders) => {
        const eligible = orders.some(
          (order) => order.productId === bookId && order.orderStatus === 'DELIVERED'
        );
        this.canWriteReview.set(eligible);
        if (eligible && this.route.snapshot.queryParamMap.get('review') === 'true') {
          this.reviewMode.set(true);
        } else if (!eligible) {
          this.reviewMode.set(false);
        }
      },
      error: () => {
        this.canWriteReview.set(false);
        this.reviewMode.set(false);
      }
    });
  }
}
