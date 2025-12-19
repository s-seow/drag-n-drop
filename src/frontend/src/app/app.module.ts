import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { WebReqInterceptor } from './web-req.interceptor';

import { KanbanViewComponent } from './pages/kanban-view/kanban-view.component';
import { LoginComponent } from './pages/login/login.component';
import { NewTaskComponent } from './pages/new-task/new-task.component';
import { ProjectListComponent } from './pages/project-list/project-list.component';
import { NewProjectComponent } from './pages/new-project/new-project.component';
import { EditTaskComponent } from './pages/edit-task/edit-task.component';
import { DeleteTaskComponent } from './pages/delete-task/delete-task.component';
import { DeleteBoardComponent } from './pages/delete-board/delete-board.component';
import { ForgetPasswordComponent } from './pages/forget-password/forget-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { AddUserComponent } from './pages/add-user/add-user.component';
import { ViewUsersComponent } from './pages/view-users/view-users.component';
import { CommentsComponent } from './pages/comments/comments.component';
import { AssignComponent } from './pages/assign/assign.component';

@NgModule({
  declarations: [
    AppComponent,
    KanbanViewComponent,
    NewTaskComponent,
    ProjectListComponent,
    NewProjectComponent,
    EditTaskComponent,
    DeleteTaskComponent,
    DeleteBoardComponent,
    LoginComponent,
    ForgetPasswordComponent,
    ResetPasswordComponent,
    AddUserComponent,
    ViewUsersComponent,
    CommentsComponent,
    AssignComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    DragDropModule,
    HttpClientModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: WebReqInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
