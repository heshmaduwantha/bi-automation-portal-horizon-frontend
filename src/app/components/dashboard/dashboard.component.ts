import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AutomationApiService, AutomationTask } from '../../services/automation-api.service';
import { CronHumanizePipe } from '../../pipes/cron-humanize.pipe';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    CronHumanizePipe, 
    TagModule, 
    ButtonModule, 
    InputTextModule, 
    IconFieldModule, 
    InputIconModule,
    FormsModule,
    SelectModule,
    ConfirmDialogModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  tasks: AutomationTask[] = [];
  filteredTasks: AutomationTask[] = [];
  pagedTasks: AutomationTask[] = [];
  
  loading = true;
  refreshInterval: any;
  
  // UI State
  searchTerm = '';
  viewMode: 'grid' | 'list' = 'grid';
  pageSize = 8;
  currentPage = 1;
  pageSizeOptions = [8, 16, 32, 64];

  constructor(
    private automationApi: AutomationApiService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
    this.refreshInterval = setInterval(() => this.loadTasks(false), 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  loadTasks(showLoading = true): void {
    if (showLoading) this.loading = true;
    this.automationApi.getTasks().subscribe({
      next: (data) => {
        // Real data from API
        this.tasks = [...data];
        this.applyFiltersAndPagination();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Sync Failed', detail: 'Could not fetch automation tasks.' });
      }
    });
  }

  applyFiltersAndPagination(): void {
    // 1. Search Filtering
    let result = [...this.tasks];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t => 
        t.reportName.toLowerCase().includes(term) || 
        t.status?.toLowerCase().includes(term)
      );
    }
    this.filteredTasks = result;

    // 2. Pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.pagedTasks = this.filteredTasks.slice(startIndex, startIndex + this.pageSize);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFiltersAndPagination();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTasks.length / this.pageSize) || 1;
  }

  get paginationText(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredTasks.length);
    
    if (this.filteredTasks.length <= this.pageSize) {
      return `Showing all <strong>${this.filteredTasks.length}</strong> automations`;
    }
    return `Showing <strong>${start}</strong> to <strong>${end}</strong> of <strong>${this.filteredTasks.length}</strong> automations`;
  }

  onManualRun(id: number | undefined): void {
    if (id === undefined) return;
    
    // Safety limit for manual runs
    const manualRunLimit = 1000;

    this.automationApi.runTaskManually(id, manualRunLimit).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Run Triggered', detail: `The manual data sync has started (Limited to ${manualRunLimit} rows).` });
        this.loadTasks(false);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Execution Failed', detail: 'Failed to trigger manual run. Check backend logs.' })
    });
  }

  onDelete(id: number | undefined): void {
    if (id === undefined) return;
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this automation schedule? This action cannot be undone.',
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        // 1. Instant Optimistic UI Update
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.applyFiltersAndPagination();
        this.messageService.add({ severity: 'error', summary: 'Deleted', detail: 'Automation schedule removed.' });

        // 2. Background Sync (Mock or Real)
        if (id < 100) {
          this.automationApi.deleteTask(id).subscribe({
            error: () => {
              // Only reload if it actually failed on server, but usually we just stay optimistic
              console.error('Backend deletion failed for ID:', id);
            }
          });
        }
      }
    });
  }

  getSeverity(status: string | undefined): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
    switch (status?.toLowerCase()) {
      case 'running': return 'info';
      case 'success': return 'success';
      case 'failed': return 'danger';
      case 'idle': return 'secondary';
      default: return 'info';
    }
  }

  isActiveDay(cron: string, dayIndex: number): boolean {
    const parts = cron.split(' ');
    if (parts.length < 5) return false;
    const dow = parts[4];
    if (dow === '*') return true;
    
    // Handle ranges like 1-5 or lists like 1,3,5
    const segments = dow.split(',');
    for (const segment of segments) {
      if (segment.includes('-')) {
        const [start, end] = segment.split('-').map(Number);
        if (dayIndex >= start && dayIndex <= end) return true;
      } else {
        if (parseInt(segment) === dayIndex) return true;
      }
    }
    return false;
  }
}
