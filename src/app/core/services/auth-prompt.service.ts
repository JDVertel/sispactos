import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/** Solicita al shell del dashboard que abra el modal de inicio de sesion. */
@Injectable({
  providedIn: 'root'
})
export class AuthPromptService {
  private readonly loginRequested = new Subject<void>();

  readonly loginRequested$ = this.loginRequested.asObservable();

  requestLogin(): void {
    this.loginRequested.next();
  }
}
