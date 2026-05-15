import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth';

describe('adminGuard', () => {
  let router: Router;
  let authServiceSpy: Pick<AuthService, 'isAuthenticated' | 'isAdmin'>;

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: jest.fn(),
      isAdmin: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    router = TestBed.inject(Router);
  });

  it('should allow access for authenticated admin user', () => {
    (authServiceSpy.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authServiceSpy.isAdmin as jest.Mock).mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('should redirect unauthenticated user to login', () => {
    (authServiceSpy.isAuthenticated as jest.Mock).mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/login');
  });

  it('should redirect authenticated non-admin user to home', () => {
    (authServiceSpy.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authServiceSpy.isAdmin as jest.Mock).mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/');
  });
});
