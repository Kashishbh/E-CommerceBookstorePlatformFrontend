import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Register } from './register';
import { AuthService } from '../../core/services/auth';

describe('Register Component', () => {
  let authServiceSpy: Pick<AuthService, 'register' | 'startGoogleLogin'>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      register: vi.fn(),
      startGoogleLogin: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should create the register component', () => {
    const fixture = TestBed.createComponent(Register);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should keep form invalid when empty', () => {
    const fixture = TestBed.createComponent(Register);
    const component = fixture.componentInstance;

    expect(component['form'].valid).toBe(false);
  });

  it('should keep form invalid for weak password', () => {
    const fixture = TestBed.createComponent(Register);
    const component = fixture.componentInstance;

    component['form'].setValue({
      fullName: 'Kashish',
      email: 'kash@example.com',
      mobile: '9876543210',
      password: 'weak123'
    });

    expect(component['form'].valid).toBe(false);
  });

  it('should make form valid for strong password', () => {
    const fixture = TestBed.createComponent(Register);
    const component = fixture.componentInstance;

    component['form'].setValue({
      fullName: 'Kashish',
      email: 'kash@example.com',
      mobile: '9876543210',
      password: 'Password@123'
    });

    expect(component['form'].valid).toBe(true);
  });

  it('should call register service on valid submit', () => {
    (authServiceSpy.register as ReturnType<typeof vi.fn>).mockReturnValue(of({
      token: 'abc123',
      user: {
        userId: 1,
        fullName: 'Kashish',
        email: 'kash@example.com',
        role: 'ROLE_CUSTOMER',
        active: true
      },
      message: 'Registration successful'
    }));

    const fixture = TestBed.createComponent(Register);
    const component = fixture.componentInstance;

    component['form'].setValue({
      fullName: 'Kashish',
      email: 'kash@example.com',
      mobile: '9876543210',
      password: 'Password@123'
    });

    component['submit']();

    expect(authServiceSpy.register).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should call google login when triggered', () => {
    const fixture = TestBed.createComponent(Register);
    const component = fixture.componentInstance;

    component['googleLogin']();

    expect(authServiceSpy.startGoogleLogin).toHaveBeenCalled();
  });
});
