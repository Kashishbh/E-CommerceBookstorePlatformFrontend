import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationItem } from '../../core/models';
import { AuthService } from '../../core/services/auth';
import { ShopService } from '../../core/services/shop';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class Notifications implements OnInit {
  private readonly shopService = inject(ShopService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly userId = computed(() => this.authService.getCurrentUserId());
  protected readonly error = signal('');

  ngOnInit(): void {
    const userId = this.userId();
    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.shopService.getNotifications(userId).subscribe({
      next: (notifications) => {
        this.notifications.set(
          [...notifications].sort((a, b) => {
            const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            return timeDiff || b.notificationId - a.notificationId;
          })
        );
        this.error.set('');
      },
      error: (error) => this.error.set(error?.error?.message || 'Your notifications could not be loaded.')
    });
  }
}
