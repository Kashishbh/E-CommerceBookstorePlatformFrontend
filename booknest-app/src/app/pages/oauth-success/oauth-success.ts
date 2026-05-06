import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-oauth-success',
  imports: [CommonModule],
  templateUrl: './oauth-success.html',
  styleUrl: './oauth-success.scss'
})
export class OauthSuccess {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly error = signal('Completing Google sign-in...');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.error.set('Google sign-in could not be completed. Missing token.');
      return;
    }

    this.authService.completeGoogleLogin(token).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        console.error('Google login completion failed', err);
        this.error.set('Google sign-in failed. Please try again.');
      }
    });
  }
}
