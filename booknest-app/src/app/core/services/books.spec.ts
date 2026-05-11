import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BooksService } from './books';

describe('BooksService', () => {
  let service: BooksService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BooksService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(BooksService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch all books from API', () => {
    const mockBooks = [
      {
        bookId: 1,
        title: 'Atomic Habits',
        author: 'James Clear',
        isbn: '123',
        price: 499,
        stock: 20
      }
    ];

    service.getBooks().subscribe((books) => {
      expect(books.length).toBe(1);
      expect(books[0].title).toBe('Atomic Habits');
    });

    const req = httpMock.expectOne('http://localhost:8080/books');
    expect(req.request.method).toBe('GET');
    req.flush(mockBooks);
  });

  it('should fetch a single book by id', () => {
    const mockBook = {
      bookId: 1,
      title: 'Atomic Habits',
      author: 'James Clear',
      isbn: '123',
      price: 499,
      stock: 20
    };

    service.getBookById(1).subscribe((book) => {
      expect(book.bookId).toBe(1);
      expect(book.title).toBe('Atomic Habits');
    });

    const req = httpMock.expectOne('http://localhost:8080/books/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockBook);
  });

  it('should send POST request when adding a book', () => {
    const payload = {
      title: 'Deep Work',
      author: 'Cal Newport',
      isbn: '456',
      price: 399,
      stock: 10
    };

    service.addBook(payload).subscribe((book) => {
      expect(book.title).toBe('Deep Work');
    });

    const req = httpMock.expectOne('http://localhost:8080/books');
    expect(req.request.method).toBe('POST');
    req.flush({ bookId: 2, ...payload });
  });
});
