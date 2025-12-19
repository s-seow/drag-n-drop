import { Component, HostListener, OnInit } from '@angular/core';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Board } from '../../models/board.model';
import { TaskService } from '../../task.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Column } from '../../models/column.model';
import { TaskCard } from '../../models/taskcard.model';
import { AuthService } from '../../auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-kanban-view',
  templateUrl: './kanban-view.component.html',
  styleUrl: './kanban-view.component.scss'
})
export class KanbanViewComponent implements OnInit {

  board!: Board;
  username!: string;
  isActive: Boolean = false;

  // ✅ Title edit state (prevents textbox showing unless editing)
  isEditingTitle: boolean = false;
  titleDraft: string = '';

  constructor(
    private taskService: TaskService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params: Params) => {
      if (params['boardId'] != undefined) {
        this.taskService.getBoard(params['boardId']).subscribe(next => {
          this.board = next as Board;
          this.columnInit(params['boardId']);
          this.titleDraft = this.board.title;
        });
      }
    });

    this.authService.getUsername().subscribe(next => {
      this.username = (next as User).username;
    });
  }

  columnInit(boardId: string) {
    this.taskService.getColumns(boardId).subscribe(next => {
      this.board.columns = (next as Column[]).sort((a, b) => a.position.valueOf() - b.position.valueOf());
      for (var column of this.board.columns) {
        this.taskInit(column);
      }
    });
  }

  taskInit(column: Column) {
    this.taskService.getTaskCards(column._id).subscribe(next => {
      column.taskcards = (next as TaskCard[]).sort((a, b) => a.position.valueOf() - b.position.valueOf());
    });
  }

  addTaskClick(column: Column) {
    this.route.params.subscribe((params: Params) => {
      this.router.navigate(['/new-task', params['boardId'], column._id]);
    });
  }

  editTaskClick(taskcard: TaskCard) {
    this.route.params.subscribe((params: Params) => {
      this.router.navigate(['/edit-task', params['boardId'], taskcard._columnId, taskcard._id]);
    });
  }

  commentTaskClick(taskcard: TaskCard) {
    this.route.params.subscribe((params: Params) => {
      this.router.navigate(['/comments', params['boardId'], taskcard._columnId, taskcard._id]);
    });
  }

  // ✅ Start editing: textbox appears only now
  editTitleClick() {
    this.isEditingTitle = true;
    this.titleDraft = this.board?.title ?? '';
  }

  // ✅ Save: updates backend + hides textbox
  saveTitleClick() {
    const next = (this.titleDraft || '').trim();
    if (!next) {
      this.cancelTitleEdit();
      return;
    }
    this.isEditingTitle = false;
    this.updateBoardTitle(next);
  }

  // ✅ Cancel: hide textbox, revert draft
  cancelTitleEdit() {
    this.isEditingTitle = false;
    this.titleDraft = this.board?.title ?? '';
  }

  // ✅ Keyboard: Enter save, Esc cancel
  onTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveTitleClick();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelTitleEdit();
    }
  }

  drop(event: CdkDragDrop<Column>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data.taskcards, event.previousIndex, event.currentIndex);
      let index = 0;
      for (var task of event.container.data.taskcards) {
        task.position = index;
        this.taskService.updateTaskCardPosition(task._columnId, task._id, task._columnId, index).subscribe(() => {});
        index++;
      }
    } else {
      transferArrayItem(
        event.previousContainer.data.taskcards,
        event.container.data.taskcards,
        event.previousIndex,
        event.currentIndex,
      );
      let index = 0;
      for (var task of event.container.data.taskcards) {
        task.position = index;
        this.taskService.updateTaskCardPosition(task._columnId, task._id, event.container.data._id, index).subscribe(() => {});
        task._columnId = event.container.data._id;
        index++;
      }
      index = 0;
      for (var task of event.previousContainer.data.taskcards) {
        task.position = index;
        this.taskService.updateTaskCardPosition(task._columnId, task._id, task._columnId, index).subscribe(() => {});
        index++;
      }
    }
  }

  updateBoardTitle(title: string) {
    if (this.inputLengthCheck(title, 50)) {
      const inputLengthDialog: HTMLDialogElement = document.getElementById('inputLengthError') as HTMLDialogElement;
      inputLengthDialog.show();
    } else {
      this.board.title = title;
      this.taskService.updateBoardTitle(this.board._id, title).subscribe(() => {});
    }
  }

  updateAllTaskCards() {
    for (var column of this.board.columns) {
      let index = 0;
      for (var task of column.taskcards) {
        this.taskService.updateTaskCardPosition(task._columnId, task._id, column._id, index).subscribe(() => {});
        index++;
      }
    }
  }

  togglePriority(taskcard: TaskCard) {
    taskcard.priority = !taskcard.priority;
    this.taskService.updateTaskCardPriority(taskcard._columnId, taskcard._id, taskcard.priority).subscribe(() => {});
  }

  deleteTaskcardConfirm(taskcard: TaskCard) {
    this.route.params.subscribe((params: Params) => {
      this.router.navigate(['/delete-task', params['boardId'], taskcard._columnId, taskcard._id]);
    });
  }

  assignTask(taskcard: TaskCard) {
    this.route.params.subscribe((params: Params) => {
      this.router.navigate(['/assign', params['boardId'], taskcard._columnId, taskcard._id]);
    });
  }

  deleteBoardConfirm() {
    this.route.params.subscribe((params: Params) => {
      this.router.navigate(['/delete-board', params['boardId']]);
    });
  }

  addUser() {
    this.route.params.subscribe((params: Params) => {
      this.router.navigate(['/add-user', params['boardId']]);
    });
  }

  viewUsers() {
    this.route.params.subscribe((params: Params) => {
      this.router.navigate(['view-users', params['boardId']]);
    });
  }

  inputLengthCheck(input: string, length: number) {
    return input.length > length;
  }

  close() {
    const inputLengthDialog: HTMLDialogElement = document.getElementById('inputLengthError') as HTMLDialogElement;
    inputLengthDialog.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const dropdown: HTMLDivElement = document.getElementById("dropdown") as HTMLDivElement;
    const navDropdown: HTMLDivElement = document.getElementById("navbarDropdown") as HTMLDivElement;

    if (dropdown && navDropdown) {
      if ((event.target == document.getElementById("board-options") || event.target == document.getElementById("board-options-icon"))) {
        dropdown.classList.toggle('is-active');
      } else if (event.target == document.getElementById("navbarButton")) {
        navDropdown.classList.toggle('is-active');
      } else {
        dropdown.classList.remove('is-active');
        navDropdown.classList.remove('is-active');
      }
    }
  }

  logout() {
    this.authService.logout();
  }
}
