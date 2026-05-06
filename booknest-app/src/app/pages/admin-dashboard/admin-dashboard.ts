import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Book, Order, User } from '../../core/models';
import { AuthService } from '../../core/services/auth';
import { BooksService } from '../../core/services/books';
import { ShopService } from '../../core/services/shop';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly booksService = inject(BooksService);
  private readonly shopService = inject(ShopService);
  private readonly router = inject(Router);

  protected readonly users = signal<User[]>([]);
  protected readonly books = signal<Book[]>([]);
  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly info = signal('');
  protected readonly stockDrafts = signal<Record<number, number>>({});
  protected readonly orderStatusDrafts = signal<Record<number, string>>({});
  protected readonly bookForm = signal({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    publisher: '',
    price: 0,
    stock: 0,
    rating: 0,
    description: '',
    coverImageUrl: '',
    publishedDate: '',
    featured: true
  });

  protected readonly totalUsers = computed(() => this.users().length);
  protected readonly totalBooks = computed(() => this.books().length);
  protected readonly totalOrders = computed(() => this.orders().length);
  protected readonly deliveredOrders = computed(() => this.orders().filter((order) => order.orderStatus === 'DELIVERED').length);

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return;
    }

    this.loadAll();
  }

  protected updateBookForm<K extends keyof ReturnType<AdminDashboard['bookForm']>>(key: K, value: ReturnType<AdminDashboard['bookForm']>[K]): void {
    this.bookForm.update((current) => ({ ...current, [key]: value }));
  }

  protected submitBook(): void {
    const payload = this.bookForm();
    this.booksService.addBook({
      ...payload,
      price: Number(payload.price),
      stock: Number(payload.stock),
      rating: payload.rating ? Number(payload.rating) : undefined
    }).subscribe({
      next: () => {
        this.info.set('Book added successfully.');
        this.error.set('');
        this.bookForm.set({
          title: '',
          author: '',
          isbn: '',
          genre: '',
          publisher: '',
          price: 0,
          stock: 0,
          rating: 0,
          description: '',
          coverImageUrl: '',
          publishedDate: '',
          featured: true
        });
        this.loadBooks();
      },
      error: (err) => this.error.set(err?.error?.message || 'Book could not be added.')
    });
  }

  protected suspendUser(userId: number): void {
    this.authService.suspendUser(userId).subscribe({
      next: () => {
        this.info.set(`User ${userId} suspended.`);
        this.error.set('');
        this.loadUsers();
      },
      error: (err) => this.error.set(err?.error?.message || 'User could not be suspended.')
    });
  }

  protected activateUser(userId: number): void {
    this.authService.activateUser(userId).subscribe({
      next: () => {
        this.info.set(`User ${userId} activated.`);
        this.error.set('');
        this.loadUsers();
      },
      error: (err) => this.error.set(err?.error?.message || 'User could not be activated.')
    });
  }

  protected deleteUser(userId: number): void {
    this.authService.deleteUser(userId).subscribe({
      next: () => {
        this.info.set(`User ${userId} deleted.`);
        this.error.set('');
        this.loadUsers();
      },
      error: (err) => this.error.set(err?.error?.message || 'User could not be deleted.')
    });
  }

  protected setStockDraft(bookId: number, value: string): void {
    this.stockDrafts.update((drafts) => ({ ...drafts, [bookId]: Number(value) }));
  }

  protected saveStock(bookId: number): void {
    const stock = this.stockDrafts()[bookId];
    this.booksService.updateBookStock(bookId, Number(stock ?? 0)).subscribe({
      next: () => {
        this.info.set(`Stock updated for book ${bookId}.`);
        this.error.set('');
        this.loadBooks();
      },
      error: (err) => this.error.set(err?.error?.message || 'Stock could not be updated.')
    });
  }

  protected deleteBook(bookId: number): void {
    this.booksService.deleteBook(bookId).subscribe({
      next: () => {
        this.info.set(`Book ${bookId} deleted.`);
        this.error.set('');
        this.loadBooks();
      },
      error: (err) => this.error.set(err?.error?.message || 'Book could not be deleted.')
    });
  }

  protected setOrderStatusDraft(orderId: number, value: string): void {
    this.orderStatusDrafts.update((drafts) => ({ ...drafts, [orderId]: value }));
  }

  protected saveOrderStatus(orderId: number): void {
    const orderStatus = this.orderStatusDrafts()[orderId];
    if (!orderStatus) {
      return;
    }

    this.shopService.updateOrderStatus(orderId, orderStatus).subscribe({
      next: () => {
        this.info.set(`Order ${orderId} updated to ${orderStatus}.`);
        this.error.set('');
        this.loadOrders();
      },
      error: (err) => this.error.set(err?.error?.message || 'Order status could not be updated.')
    });
  }

  private loadAll(): void {
    this.loading.set(true);
    this.loadUsers();
    this.loadBooks();
    this.loadOrders(() => this.loading.set(false));
  }

  private loadUsers(): void {
    this.authService.getAllUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (err) => this.error.set(err?.error?.message || 'Users could not be loaded.')
    });
  }

  private loadBooks(): void {
    this.booksService.getBooks().subscribe({
      next: (books) => {
        this.books.set(books);
        this.stockDrafts.set(
          books.reduce<Record<number, number>>((acc, book) => {
            acc[book.bookId] = book.stock;
            return acc;
          }, {})
        );
      },
      error: (err) => this.error.set(err?.error?.message || 'Books could not be loaded.')
    });
  }

  private loadOrders(onDone?: () => void): void {
    this.shopService.getAllOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.orderStatusDrafts.set(
          orders.reduce<Record<number, string>>((acc, order) => {
            acc[order.orderId] = order.orderStatus;
            return acc;
          }, {})
        );
        onDone?.();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Orders could not be loaded.');
        onDone?.();
      }
    });
  }
}
