import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User } from '../models';

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  mobile: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authBaseUrl = 'http://localhost:8081';
  private readonly userSignal = signal<User | null>(this.readUser());
  private readonly tokenSignal = signal<string | null>(localStorage.getItem('booknest_token'));

  readonly user = computed(() => this.userSignal());
  readonly token = computed(() => this.tokenSignal());

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authBaseUrl}/api/v1/auth/login`, payload).pipe(
      tap((response) => this.storeSession(response))
    );
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authBaseUrl}/api/v1/auth/register`, payload).pipe(
      tap((response) => this.storeSession(response))
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.authBaseUrl}/api/v1/auth/profile`, { headers: this.getAuthHeaders() });
  }

  completeGoogleLogin(token: string): Observable<User> {
    localStorage.setItem('booknest_token', token);
    this.tokenSignal.set(token);

    return this.getProfile().pipe(
      tap((user) => {
        localStorage.setItem('booknest_user', JSON.stringify(user));
        this.userSignal.set(user);
      })
    );
  }

  startGoogleLogin(): void {
    window.location.href = `${this.authBaseUrl}/oauth2/authorization/google`;
  }

  logout(): void {
    localStorage.removeItem('booknest_token');
    localStorage.removeItem('booknest_user');
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.tokenSignal() && !!this.userSignal();
  }

  isAdmin(): boolean {
    return this.userSignal()?.role === 'ROLE_ADMIN';
  }

  getCurrentUserId(): number | null {
    return this.userSignal()?.userId ?? null;
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.authBaseUrl}/api/v1/auth/admin/users`, { headers: this.getAuthHeaders() });
  }

  suspendUser(userId: number): Observable<User> {
    return this.http.put<User>(`${this.authBaseUrl}/api/v1/auth/admin/users/${userId}/suspend`, {}, { headers: this.getAuthHeaders() });
  }

  activateUser(userId: number): Observable<User> {
    return this.http.put<User>(`${this.authBaseUrl}/api/v1/auth/admin/users/${userId}/activate`, {}, { headers: this.getAuthHeaders() });
  }

  deleteUser(userId: number): Observable<string> {
    return this.http.delete(`${this.authBaseUrl}/api/v1/auth/admin/users/${userId}`, { headers: this.getAuthHeaders(), responseType: 'text' });
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.tokenSignal();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private storeSession(response: AuthResponse): void {
    localStorage.setItem('booknest_token', response.token);
    localStorage.setItem('booknest_user', JSON.stringify(response.user));
    this.tokenSignal.set(response.token);
    this.userSignal.set(response.user);
  }

  private readUser(): User | null {
    const raw = localStorage.getItem('booknest_user');
    return raw ? JSON.parse(raw) as User : null;
  }
}
