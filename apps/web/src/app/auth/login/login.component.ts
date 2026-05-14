import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline, cubeSharp } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonSpinner],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);
  readonly submitted = signal(false);

  readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  constructor() {
    addIcons({ mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline, cubeSharp });
  }

  get email() { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.form.invalid) return;

    this.isLoading.set(true);
    const { email, password } = this.form.getRawValue();

    this.authService.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/app/dashboard']),
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Credenciales incorrectas. Inténtalo de nuevo.'
        );
      },
    });
  }
}
