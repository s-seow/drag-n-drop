import { Injectable } from '@angular/core';
import { WebRequestService } from './web-request.service';
import { Router } from '@angular/router';
import { shareReplay, tap, throwError } from 'rxjs';
import { HttpClient, HttpResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
/**
 * Provides methods for authentication and CRUD operations related to authentication.
 */
export class AuthService {

  constructor(
    private webService: WebRequestService,
    private router: Router,
    private http: HttpClient
  ) {}

  /**
   * Login
   * @param username username
   * @param password password
   * @returns response
   */
  login(username: string, password: string) {
    return this.webService.login(username, password).pipe(
      shareReplay(),
      tap((res: HttpResponse<any>) => {

        const userId = res.body?._id as string;
        const access = res.headers.get('x-access-token') as string;
        const refresh = res.headers.get('x-refresh-token') as string;

        this.setSession(userId, access, refresh);
        console.log('LOGGED IN');
      })
    );
  }

  /**
   * signup a new user
   * @param username
   * @param email
   * @param password
   * @returns response
   */
  signup(username: string, email: string, password: string) {
    return this.webService.signup(username, email, password).pipe(
      shareReplay(),
      tap((res: HttpResponse<any>) => {
        const userId = res.body?._id as string;
        const access = res.headers.get('x-access-token') as string;
        const refresh = res.headers.get('x-refresh-token') as string;

        this.setSession(userId, access, refresh);
        console.log('Successfully signed up and logged in');
      })
    );
  }

  /**
   * send a reset password email
   * @param email target email address
   * @returns response
   */
  forgetPassword(email: string) {
    return this.http.post(`${this.webService.ROOT_URL}/send-email`, { email });
  }

  /**
   * Change password
   * @param token reset token
   * @param password new password
   * @returns response
   */
  resetPassword(token: string, password: string) {
    return this.http.post(`${this.webService.ROOT_URL}/reset-password`, {
      token,
      password
    });
  }

  /**
   * logs a user out and redirect to login page
   */
  logout() {
    this.removeSession();
    this.router.navigateByUrl('/login');
  }

  /**
   * get access token from browser local storage
   * @returns access token
   */
  getAccessToken(): string {
    return localStorage.getItem('x-access-token') || '';
  }

  /**
   * get refresh token from browser local storage
   * @returns refresh token
   */
  getRefreshToken(): string {
    return localStorage.getItem('x-refresh-token') || '';
  }

  /**
   * get userid from browser local storage
   * @returns userid
   */
  getUserId(): string {
    return localStorage.getItem('user-id') || '';
  }

  /**
   * save access token to browser local storage
   * @param accessToken
   */
  setAccessToken(accessToken: string) {
    if (!accessToken) return; // prevent poisoning storage with empty token
    localStorage.setItem('x-access-token', accessToken);
  }

  /**
   * set login session to browser local storage
   * @param userId
   * @param accessToken
   * @param refreshToken
   */
  private setSession(userId: string, accessToken: string, refreshToken: string) {
    if (userId) localStorage.setItem('user-id', userId);
    if (accessToken) localStorage.setItem('x-access-token', accessToken);
    if (refreshToken) localStorage.setItem('x-refresh-token', refreshToken);
  }

  /**
   * remove login session from browser local storage
   */
  private removeSession() {
    localStorage.removeItem('user-id');
    localStorage.removeItem('x-access-token');
    localStorage.removeItem('x-refresh-token');
  }

  /**
   * refresh access token
   * @returns new access token response
   */
  getNewAccessToken() {
    const refreshToken = this.getRefreshToken();
    const userId = this.getUserId();

    // If either is missing, refresh cannot succeed; force caller to handle.
    if (!refreshToken || !userId) {
      return throwError(() => new Error('Missing refresh token or user id'));
    }

    return this.http.get(`${this.webService.ROOT_URL}/users/me/access-token`, {
      headers: {
        'x-refresh-token': refreshToken,
        '_id': userId
      },
      observe: 'response'
    }).pipe(
      tap((res: HttpResponse<any>) => {
        const newAccess = res.headers.get('x-access-token') || '';
        if (newAccess) this.setAccessToken(newAccess);
      })
    );
  }

  /**
   * check if username exists
   * @param username
   * @returns boolean
   */
  checkUser(username: string) {
    return this.webService.checkUser(username);
  }

  /**
   * check if email exists
   * @param email
   * @returns boolean
   */
  checkEmail(email: string) {
    return this.webService.checkEmail(email);
  }

  /**
   * get username from local user id
   * @returns username
   */
  getUsername() {
    return this.webService.getUsername(this.getUserId());
  }

  /**
   * get username specified by userid
   * @param id
   * @returns username
   */
  getUsernameWithId(id: string) {
    return this.webService.getUsername(id);
  }
}
