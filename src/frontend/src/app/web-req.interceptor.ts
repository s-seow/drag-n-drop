import {
  HttpErrorResponse,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  finalize,
  switchMap,
  take,
  tap,
  throwError
} from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebReqInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  private refreshingAccessToken: boolean = false;

  private accessTokenRefreshed: Subject<void> = new Subject<void>();

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
    const isRefreshCall = this.isRefreshEndpoint(request.url);

    // Add auth header to normal requests only
    const authedRequest = isRefreshCall ? request : this.addAuthHeader(request);

    return next.handle(authedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && isRefreshCall) {
          this.authService.logout();
          return throwError(() => error);
        }

        if (error.status === 401) {
          return this.refreshAccessToken().pipe(
            switchMap(() => {
              const retried = this.addAuthHeader(request);
              return next.handle(retried);
            }),
            catchError((err: any) => {
              this.authService.logout();
              return throwError(() => err);
            })
          );
        }

        return throwError(() => error);
      })
    );
  }

  private refreshAccessToken(): Observable<void> {
    if (this.refreshingAccessToken) {
      return this.accessTokenRefreshed.pipe(take(1));
    }

    this.refreshingAccessToken = true;

    return this.authService.getNewAccessToken().pipe(
      tap(() => {
        this.accessTokenRefreshed.next();
      }),
      switchMap(() => {
        // Convert to Observable<void>
        return new Observable<void>((observer) => {
          observer.next();
          observer.complete();
        });
      }),
      finalize(() => {
        this.refreshingAccessToken = false;
      })
    );
  }

  private addAuthHeader(request: HttpRequest<any>) {
    const token = this.authService.getAccessToken();

    if (token) {
      return request.clone({
        setHeaders: {
          'x-access-token': token
        }
      });
    }
    return request;
  }

  private isRefreshEndpoint(url: string): boolean {
    return url.includes('/users/me/access-token');
  }
}
