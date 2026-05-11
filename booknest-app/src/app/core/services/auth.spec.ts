import { TestBed } from '@angular/core/testing';
import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should login and store session data', () => {
    const response = {
      token: 'token-123',
      user: {
        userId: 1,
        fullName: 'Kashish',
        email: 'kash@example.com',
        role: 'ROLE_CUSTOMER',
        active: true
      },
      message: 'Login successful'
    };

    service.login({ email: 'kash@example.com', password: 'Password@123' }).subscribe((result) => {
      expect(result.token).toBe('token-123');
    });

    const req = httpMock.expectOne('http://localhost:8081/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(response);

    expect(localStorage.getItem('booknest_token')).toBe('token-123');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getCurrentUserId()).toBe(1);
  });

  it('should register and store session data', () => {
    const response = {
      token: 'token-456',
      user: {
        userId: 2,
        fullName: 'New User',
        email: 'new@example.com',
        role: 'ROLE_CUSTOMER',
        active: true
      },
      message: 'Registration successful'
    };

    service.register({
      fullName: 'New User',
      email: 'new@example.com',
      password: 'Password@123',
      mobile: '9876543210'
    }).subscribe((result) => {
      expect(result.user.fullName).toBe('New User');
    });

    const req = httpMock.expectOne('http://localhost:8081/api/v1/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush(response);

    expect(localStorage.getItem('booknest_token')).toBe('token-456');
    expect(service.user()?.email).toBe('new@example.com');
  });

  it('should return auth headers when token exists', () => {
    localStorage.setItem('booknest_token', 'saved-token');
    localStorage.setItem('booknest_user', JSON.stringify({
      userId: 9,
      fullName: 'Admin',
      email: 'admin@example.com',
      role: 'ROLE_ADMIN',
      active: true
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    const reloadedService = TestBed.inject(AuthService);
    const headers = reloadedService.getAuthHeaders();

    expect(headers instanceof HttpHeaders).toBe(true);
    expect(headers.get('Authorization')).toBe('Bearer saved-token');
    expect(reloadedService.isAdmin()).toBe(true);
  });

  it('should complete google login and load profile', () => {
    const mockUser = {
      userId: 3,
      fullName: 'Google User',
      email: 'google@example.com',
      role: 'ROLE_CUSTOMER',
      active: true
    };

    service.completeGoogleLogin('google-token').subscribe((user) => {
      expect(user.email).toBe('google@example.com');
    });

    const req = httpMock.expectOne('http://localhost:8081/api/v1/auth/profile');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer google-token');
    req.flush(mockUser);

    expect(localStorage.getItem('booknest_token')).toBe('google-token');
    expect(service.user()?.fullName).toBe('Google User');
  });

  it('should clear session and navigate to login on logout', () => {
    localStorage.setItem('booknest_token', 'token-123');
    localStorage.setItem('booknest_user', JSON.stringify({
      userId: 1,
      fullName: 'Kashish',
      email: 'kash@example.com',
      role: 'ROLE_CUSTOMER',
      active: true
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    const reloadedService = TestBed.inject(AuthService);
    const reloadedRouter = TestBed.inject(Router);
    vi.spyOn(reloadedRouter, 'navigate').mockResolvedValue(true);

    reloadedService.logout();

    expect(localStorage.getItem('booknest_token')).toBeNull();
    expect(localStorage.getItem('booknest_user')).toBeNull();
    expect(reloadedService.isAuthenticated()).toBe(false);
    expect(reloadedRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
