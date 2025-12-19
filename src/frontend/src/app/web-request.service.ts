import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

/**
 * Contains all the RESTful API methods to backend server.
 */
export class WebRequestService {

  readonly ROOT_URL;

  constructor(private http: HttpClient) {
    // this.ROOT_URL= 'http://localhost:8080';
    this.ROOT_URL = '/api';
  }

  /**
   * GET
   * @param uri API route
   * @returns API response
   */
  get(uri: string) {
    return this.http.get(`${this.ROOT_URL}/${uri}`);
  }

  /**
   * POST
   * @param uri API route
   * @returns API response
   */
  post(uri: string, payload: Object) {
    return this.http.post(`${this.ROOT_URL}/${uri}`, payload);
  }

  /**
   * PATCH
   * @param uri API route
   * @returns API response
   */
  patch(uri: string, payload: Object) {
    return this.http.patch(`${this.ROOT_URL}/${uri}`, payload);
  }

  /**
   * DELETE
   * @param uri API route
   * @returns API response
   */
  delete(uri: string) {
    return this.http.delete(`${this.ROOT_URL}/${uri}`);
  }

  /**
   * Login
   * @param username username
   * @param password password
   * @returns API response
   */
  login(username: string, password: string) {
    return this.http.post(`${this.ROOT_URL}/users/login`, {
      username,
      password
    }, { 
      observe: 'response'
    });
  }

  /**
   * Signup
   * @param username username
   * @param email email
   * @param password password
   * @returns API response
   */
  signup(username: string, email: string, password: string) {
    return this.http.post(`${this.ROOT_URL}/users`, {
      username,
      email,
      password
    }, { 
      observe: 'response'
    });
  }

  

  checkUser(username: string) {
    return this.http.post(`${this.ROOT_URL}/users/username`, {
      username
    })
  }

  checkEmail(email: string) {
    return this.http.post(`${this.ROOT_URL}/users/email`, {
      email
    })
  }

  getUsername(userId: string) {
    return this.http.post(`${this.ROOT_URL}/users/getuser`, {
      userId
    })
  }
}
