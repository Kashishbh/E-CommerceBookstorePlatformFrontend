import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-header',
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  protected searchTerm = '';

  protected submitSearch(): void {
    const query = this.searchTerm.trim();
    this.router.navigate(['/books'], { queryParams: query ? { q: query } : {} });
  }

  protected logout(): void {
    this.authService.logout();
  }
}
