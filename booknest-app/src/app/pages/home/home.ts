import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Book } from '../../core/models';
import { AuthService } from '../../core/services/auth';
import { BooksService } from '../../core/services/books';
import { ShopService } from '../../core/services/shop';

interface HeroSlide {
  image: string;
  alt: string;
  badge: string;
  title: string;
  caption: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit, OnDestroy {
  private readonly booksService = inject(BooksService);
  private readonly shopService = inject(ShopService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private slideTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly books = signal<Book[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly actionMessage = signal('');
  protected readonly actionBusyBookId = signal<number | null>(null);
  protected readonly activeSlide = signal(0);
  protected readonly heroSlides: HeroSlide[] = [
    {
      image: '/assets/slider-books-1.jpeg',
      alt: 'Colorful books arranged across a shelf',
      badge: 'Fresh Shelf',
      title: 'Build a brighter reading corner',
      caption: 'A color-forward showcase for new arrivals, study essentials, and desk-side favorites.'
    },
    {
      image: '/assets/slider-books-2.jpeg',
      alt: 'Books lined up against a yellow background',
      badge: 'Editor Pick',
      title: 'Bold stacks for serious readers',
      caption: 'Bring home vibrant covers, sharp ideas, and books worth leaving on display.'
    },
    {
      image: '/assets/slider-books-3.jpeg',
      alt: 'Books arranged in a tabletop domino composition',
      badge: 'Reading Mood',
      title: 'Stories that keep the chain going',
      caption: 'Fiction, self-help, design, and technology titles ready to move from wishlist to cart.'
    },
    {
      image: '/assets/slider-books-4.jpeg',
      alt: 'Piggy bank placed on top of stacked books',
      badge: 'Smart Buy',
      title: 'Value picks for every budget',
      caption: 'Browse affordable finds, featured books, and gift-worthy selections in one place.'
    }
  ];

  protected readonly featuredBooks = computed(() => this.books().filter((book) => book.featured).slice(0, 8));
  protected readonly sellingBooks = computed(() => this.featuredBooks().length ? this.featuredBooks() : this.books().slice(0, 8));

  ngOnInit(): void {
    this.startSlider();
    this.booksService.getBooks().subscribe({
      next: (books) => {
        this.books.set(books);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Books loading failed', err);
        this.error.set('Books could not be loaded from the gateway or catalog service.');
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
    }
  }

  protected goToSlide(index: number): void {
    this.activeSlide.set(index);
  }

  protected orderNow(book: Book): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      this.actionMessage.set('Please login first to continue.');
      this.router.navigate(['/login']);
      return;
    }
    if (this.actionBusyBookId() === book.bookId) {
      return;
    }

    this.actionBusyBookId.set(book.bookId);
    this.shopService.getCart(userId).subscribe({
      next: (cart) => {
        const existing = cart.items.find((item) => item.bookId === book.bookId);
        if (existing) {
          this.actionBusyBookId.set(null);
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
            this.actionBusyBookId.set(null);
            this.router.navigate(['/cart']);
          },
          error: (err) => {
            this.actionBusyBookId.set(null);
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
            this.actionBusyBookId.set(null);
            this.router.navigate(['/cart']);
          },
          error: (err) => {
            this.actionBusyBookId.set(null);
            console.error('Order now failed', err);
            this.actionMessage.set(err?.error?.message || 'Could not continue to order right now.');
          }
        });
      }
    });
  }

  protected addToCart(book: Book): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      this.actionMessage.set('Please login first to add books to your cart.');
      this.router.navigate(['/login']);
      return;
    }
    if (this.actionBusyBookId() === book.bookId) {
      return;
    }

    this.actionBusyBookId.set(book.bookId);
    this.shopService.getCart(userId).subscribe({
      next: (cart) => {
        const existing = cart.items.find((item) => item.bookId === book.bookId);
        if (existing) {
          this.actionBusyBookId.set(null);
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
            this.actionBusyBookId.set(null);
            this.actionMessage.set(`${book.title} was added to your cart.`);
          },
          error: (err) => {
            this.actionBusyBookId.set(null);
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
            this.actionBusyBookId.set(null);
            this.actionMessage.set(`${book.title} was added to your cart.`);
          },
          error: (err) => {
            this.actionBusyBookId.set(null);
            console.error('Add to cart failed', err);
            this.actionMessage.set(err?.error?.message || 'Could not add this book to your cart.');
          }
        });
      }
    });
  }

  protected addToWishlist(book: Book): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      this.actionMessage.set('Please login first to save books to your wishlist.');
      this.router.navigate(['/login']);
      return;
    }
    if (this.actionBusyBookId() === book.bookId) {
      return;
    }

    this.actionBusyBookId.set(book.bookId);

    this.shopService.addToWishlist(userId, {
      bookId: book.bookId,
      bookTitle: book.title,
      bookPrice: book.price
    }).subscribe({
      next: () => {
        this.actionBusyBookId.set(null);
        this.actionMessage.set(`${book.title} was added to your wishlist.`);
      },
      error: (err) => {
        this.actionBusyBookId.set(null);
        console.error('Add to wishlist failed', err);
        this.actionMessage.set(err?.error?.message || 'Could not add this book to your wishlist.');
      }
    });
  }

  private nextSlide(): void {
    this.activeSlide.set((this.activeSlide() + 1) % this.heroSlides.length);
  }

  private startSlider(): void {
    this.slideTimer = setInterval(() => this.nextSlide(), 3200);
  }
}
