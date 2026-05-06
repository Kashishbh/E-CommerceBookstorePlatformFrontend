import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Book } from '../models';

@Injectable({
  providedIn: 'root'
})
export class BooksService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly catalogFallbackBaseUrl = 'http://localhost:8082';

  addBook(payload: {
    title: string;
    author: string;
    isbn: string;
    genre?: string;
    publisher?: string;
    price: number;
    stock: number;
    rating?: number;
    description?: string;
    coverImageUrl?: string;
    publishedDate?: string;
    featured?: boolean;
  }): Observable<Book> {
    return this.http.post<Book>(`${this.apiBaseUrl}/books`, payload).pipe(
      catchError(() => this.http.post<Book>(`${this.catalogFallbackBaseUrl}/books`, payload))
    );
  }

  getBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.apiBaseUrl}/books`).pipe(
      catchError(() => this.http.get<Book[]>(`${this.catalogFallbackBaseUrl}/books`))
    );
  }

  getBookById(bookId: number): Observable<Book> {
    return this.http.get<Book>(`${this.apiBaseUrl}/books/${bookId}`).pipe(
      catchError(() => this.http.get<Book>(`${this.catalogFallbackBaseUrl}/books/${bookId}`))
    );
  }

  updateBook(bookId: number, payload: {
    title: string;
    author: string;
    isbn: string;
    genre?: string;
    publisher?: string;
    price: number;
    stock: number;
    rating?: number;
    description?: string;
    coverImageUrl?: string;
    publishedDate?: string;
    featured?: boolean;
  }): Observable<Book> {
    return this.http.put<Book>(`${this.apiBaseUrl}/books/${bookId}`, payload).pipe(
      catchError(() => this.http.put<Book>(`${this.catalogFallbackBaseUrl}/books/${bookId}`, payload))
    );
  }

  updateBookStock(bookId: number, stock: number): Observable<Book> {
    return this.http.put<Book>(`${this.apiBaseUrl}/books/${bookId}/stock`, { stock }).pipe(
      catchError(() => this.http.put<Book>(`${this.catalogFallbackBaseUrl}/books/${bookId}/stock`, { stock }))
    );
  }

  deleteBook(bookId: number): Observable<string> {
    return this.http.delete(`${this.apiBaseUrl}/books/${bookId}`, { responseType: 'text' }).pipe(
      catchError(() => this.http.delete(`${this.catalogFallbackBaseUrl}/books/${bookId}`, { responseType: 'text' }))
    );
  }
}
