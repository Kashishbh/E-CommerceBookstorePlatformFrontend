import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Book } from '../../core/models';
import { AuthService } from '../../core/services/auth';
import { BooksService } from '../../core/services/books';
import { ShopService } from '../../core/services/shop';

@Component({
  selector: 'app-books',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './books.html',
  styleUrl: './books.scss'
})
export class Books implements OnInit {
  private readonly booksService = inject(BooksService);
  private readonly shopService = inject(ShopService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly books = signal<Book[]>([]);
  protected readonly loading = signal(true);
  protected readonly searchTerm = signal('');
  protected readonly selectedGenre = signal('All');
  protected readonly actionMessage = signal('');
  protected readonly actionBusyBookId = signal<number | null>(null);

  protected readonly genres = computed(() => ['All', ...new Set(this.books().map((book) => book.genre).filter(Boolean) as string[])]);
  protected readonly filteredBooks = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const genre = this.selectedGenre();

    return this.books().filter((book) => {
      const matchesGenre = genre === 'All' || book.genre === genre;
      const matchesQuery = !query || [book.title, book.author, book.genre, book.publisher, book.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
      return matchesGenre && matchesQuery;
    });
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.searchTerm.set(params.get('q') ?? '');
      this.selectedGenre.set(params.get('genre') ?? 'All');
    });

    this.booksService.getBooks().subscribe((books) => {
      this.books.set(books);
      this.loading.set(false);
    });
  }

  protected onGenreChange(genre: string): void {
    this.selectedGenre.set(genre);
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
}
